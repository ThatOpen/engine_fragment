import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

// The compiler has to match the `flatbuffers` runtime the package depends on,
// so the version is pinned here and every download is checked against a hash.
export const FLATC_VERSION = "25.2.10";

const RELEASE = `https://github.com/google/flatbuffers/releases/download/v${FLATC_VERSION}`;
const SOURCE = `https://raw.githubusercontent.com/google/flatbuffers/v${FLATC_VERSION}`;

const BINARIES = {
  "darwin-arm64": {
    asset: "Mac.flatc.binary.zip",
    sha256: "eabd8e8c4d8b9381b7ea4c6324c629f9200d8bb73f94b6b28ef406efc8c06c62",
  },
  "darwin-x64": {
    asset: "MacIntel.flatc.binary.zip",
    sha256: "c0d5142c465809b92fbe1eb1fd528e418de53da9de69bbb078df3fcf7443fee0",
  },
  "linux-x64": {
    asset: "Linux.flatc.binary.g++-13.zip",
    sha256: "6f01258d7475806f375d6da66a61df47add8016edd73f1774673f37b80b9a711",
  },
  "win32-x64": {
    asset: "Windows.flatc.binary.zip",
    sha256: "bd9b3cb6bf5ab8009f1927b6e00207db968c3d5c93e3bc215dae084cc681249a",
  },
};

// The schema of a compiled schema (.bfbs). flatc needs it to print one as JSON.
const REFLECTION = {
  file: "reflection.fbs",
  url: `${SOURCE}/reflection/reflection.fbs`,
  sha256: "3b9319066a4a8e1839fe159a7f321099fff2a602bf8599705708d5f49ac66c04",
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const cacheDir = path.join(repoRoot, ".tmp", "flatc", FLATC_VERSION);

async function download(url, sha256) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`flatc: ${url} answered ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== sha256) {
    throw new Error(
      `flatc: ${url} has sha256 ${actual}, expected ${sha256}. Not using it.`,
    );
  }
  return bytes;
}

/** Reads the single file of a release zip, which is all those archives hold. */
function unzipSingleFile(zip) {
  const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) {
    end--;
  }
  if (end < 0) {
    throw new Error("flatc: the downloaded archive is not a zip");
  }
  const entry = zip.readUInt32LE(end + 16);
  const method = zip.readUInt16LE(entry + 10);
  const compressedSize = zip.readUInt32LE(entry + 20);
  const nameLength = zip.readUInt16LE(entry + 28);
  const name = zip.toString("utf8", entry + 46, entry + 46 + nameLength);
  const local = zip.readUInt32LE(entry + 42);
  const start =
    local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  const data = zip.subarray(start, start + compressedSize);
  return { name, bytes: method === 0 ? data : inflateRawSync(data) };
}

/**
 * Path of a flatc binary of the pinned version. `FLATC` in the environment
 * wins, then the binary committed for Windows, then a copy cached under
 * `.tmp/` at the repo root, which is downloaded from the flatbuffers release
 * on first use.
 */
export async function resolveFlatc() {
  if (process.env.FLATC) {
    return process.env.FLATC;
  }
  const committed = path.join(here, "flatc.exe");
  if (process.platform === "win32" && fs.existsSync(committed)) {
    return committed;
  }
  const key = `${process.platform}-${process.arch}`;
  const binary = BINARIES[key];
  if (!binary) {
    throw new Error(
      `flatc: no pinned binary for ${key}. Point FLATC at a flatc ${FLATC_VERSION} binary.`,
    );
  }
  const name = process.platform === "win32" ? "flatc.exe" : "flatc";
  const target = path.join(cacheDir, name);
  if (!fs.existsSync(target)) {
    const zip = await download(`${RELEASE}/${binary.asset}`, binary.sha256);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(target, unzipSingleFile(zip).bytes, { mode: 0o755 });
  }
  return target;
}

/** Path of `reflection.fbs` of the pinned version, downloaded on first use. */
export async function resolveReflectionSchema() {
  const target = path.join(cacheDir, REFLECTION.file);
  if (!fs.existsSync(target)) {
    const bytes = await download(REFLECTION.url, REFLECTION.sha256);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  return target;
}

/** Runs flatc and returns what it printed. Throws with its output on failure. */
export async function flatc(args, options = {}) {
  const binary = await resolveFlatc();
  return execFileSync(binary, args, {
    cwd: options.cwd ?? here,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// `node flatc.mjs <args>` runs flatc from this directory.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.stdout.write(await flatc(process.argv.slice(2)));
  } catch (error) {
    process.stderr.write(`${error.stderr ?? error.message}\n`);
    process.exit(1);
  }
}
