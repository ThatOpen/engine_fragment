import { FragmentsGroup } from "./fragments-group";
import { FragmentParser, ParserV1, ParserV2 } from "./parsers";

/**
 * Serializer class for handling the serialization and deserialization of 3D model data. It uses the [flatbuffers library](https://flatbuffers.dev/) for efficient data serialization and deserialization.
 */
export class Serializer implements FragmentParser {
  // prettier-ignore
  parsers: FragmentParser[] = [
    new ParserV2(),
    new ParserV1()
  ];

  /** {@link FragmentParser.version} */
  version = "auto" as number | "auto";

  /** {@link FragmentParser.import} */
  import(bytes: Uint8Array): FragmentsGroup {
    const latestVersion = this.parsers.length - 1;

    if (this.version === "auto") {
      for (let i = 0; i < this.parsers.length; i++) {
        const parser = this.parsers[i];
        const result = parser.import(bytes);
        if (Object.keys(result).length === 0) {
          continue;
        }
        if (i !== 0) {
          const version = this.parsers.length - i;
          this.warnVersion(version, latestVersion);
        }
        return result;
      }
      throw new Error("No valid parser found for this file");
    }

    this.checkCurrentVersionValid(latestVersion);

    const index = this.parsers.length - this.version;
    const parser = this.parsers[index];

    const result = parser.import(bytes);
    if (Object.keys(result).length === 0) {
      throw new Error(
        `The given version ${this.version} doesn't match to the given file. Try using "auto" in the version property to handle versions automatically.`,
      );
    }

    return result;
  }

  /** {@link FragmentParser.export} */
  export(group: FragmentsGroup) {
    const latestVersion = this.parsers.length - 1;

    if (this.version === "auto") {
      const latestParser = this.parsers[this.parsers.length - 1];
      return latestParser.export(group);
    }

    this.checkCurrentVersionValid(latestVersion);

    const index = this.parsers.length - this.version;
    const parser = this.parsers[index];
    return parser.export(group);
  }

  private checkCurrentVersionValid(latestVersion: number) {
    if (this.version === "auto") return;

    if (this.version !== latestVersion) {
      this.warnVersion(this.version, latestVersion);
    }

    if (Number.isInteger(this.version)) {
      throw new Error(
        `Invalid version. Non-automatic versions must an integer.`,
      );
    }

    if (this.version < 1 || this.version > latestVersion) {
      throw new Error(
        `Invalid version. Versions range from 1 to ${latestVersion}.`,
      );
    }
  }

  private warnVersion(version: number, latestVersion: number) {
    console.warn(
      `This fragment file version is ${version}. The latest version is ${latestVersion}. To avoid issues, please consider updating your fragments. You can do so by regenerating your fragments from the original IFC file.`,
    );
  }
}
