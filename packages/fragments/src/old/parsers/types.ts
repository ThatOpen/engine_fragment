import { FragmentsGroup } from "../fragments-group";

/**
 * An interface that defines a fragment binary importer/exporter that uses flatbuffers. A parser of a specific version can only open files that were generated with that version. When opening a file, the library automatically traverses all available versions to find the right one. You can update your fragments to the latest version by generating them again from the original IFC file.
 */
export interface FragmentParser {
  /**
   * The version of the parser. If set to "auto", it will automatically use the latest version, and, if it doesn't work, traverse the other versions from newer to older.
   */
  version: number | "auto";

  /**
   * Constructs a FragmentsGroup object from the given flatbuffers data.
   *
   * @param bytes - The flatbuffers data as Uint8Array.
   * @returns A FragmentsGroup object constructed from the flatbuffers data.
   */
  import(bytes: Uint8Array): FragmentsGroup;

  /**
   * Exports the FragmentsGroup to a flatbuffer binary file.
   *
   * @param group - The FragmentsGroup to be exported.
   * @returns The flatbuffer binary file as a Uint8Array.
   */
  export(group: FragmentsGroup): Uint8Array;
}
