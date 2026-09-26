import { afterEach, expect, test } from "vitest";
import { Connection } from "./connection";

// Contract of the message layer shared by the main thread and the workers:
// every request settles, and every answer goes back to whoever asked.

// Like the main thread: listens to every worker, but routes each outgoing
// request to a single port (the main thread picks it by model ID).
class RoutingConnection extends Connection {
  route?: MessagePort;

  listen(port: MessagePort) {
    this.initConnection(port);
  }

  protected override async fetchConnection() {
    if (!this.route) {
      throw new Error("Fragments: no route");
    }
    return this.route;
  }
}

let ports: MessagePort[] = [];

const channel = () => {
  const { port1, port2 } = new MessageChannel();
  ports.push(port1, port2);
  return { port1, port2 };
};

const nextMessage = (port: MessagePort) =>
  new Promise<any>((resolve) => {
    port.onmessage = ({ data }) => resolve(data);
  });

// Settles after every pending microtask has run.
const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

afterEach(() => {
  for (const port of ports) port.close();
  ports = [];
});

test("a request that can't be routed rejects instead of staying pending", async () => {
  const connection = new RoutingConnection(() => {});

  const outcome = await Promise.race([
    connection.fetch({}).then(
      () => "resolved",
      (error) => error,
    ),
    tick().then(() => "pending"),
  ]);

  expect(outcome).toMatchObject({ message: "Fragments: no route" });
});

test("an answer goes back through the port the request came in on, not the routed one", async () => {
  const asking = channel();
  const routed = channel();
  const connection = new RoutingConnection(() => {});
  connection.listen(asking.port1);
  connection.route = routed.port1;

  const answer = Promise.race([
    nextMessage(asking.port2).then((data) => ({ port: "asking", data })),
    nextMessage(routed.port2).then((data) => ({ port: "routed", data })),
  ]);
  asking.port2.postMessage({ requestId: 7 });

  expect(await answer).toEqual({
    port: "asking",
    data: { requestId: 7, toMainThread: true },
  });
});
