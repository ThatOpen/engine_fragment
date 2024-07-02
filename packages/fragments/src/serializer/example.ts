import * as FRAGS from "..";

const serializer = new FRAGS.Serializer();

const group = new FRAGS.FragmentsGroup();
group.globalToExpressIDs.set("a", 11);
group.globalToExpressIDs.set("b", 12);
group.globalToExpressIDs.set("c", 13);
group.data.set(11, [[], []]);
group.data.set(12, [[], []]);
group.data.set(13, [[], []]);

// const exported = serializer.export(group);

const result = serializer.import("../../../../resources/small_v2.frag");
console.log(result);
