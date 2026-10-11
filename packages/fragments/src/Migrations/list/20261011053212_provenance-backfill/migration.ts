import { defineMigration } from "../../src/define";

const PROVENANCE = ["generator", "version"] as const;

/** What a file that predates the provenance stamp gets: nobody knows any more. */
const UNKNOWN = "unknown";

export default defineMigration({
  title: "Every file says what generated it",

  context: () => ({ backfilled: [] as string[] }),

  // The metadata is one field, so this is a handler and not an edit step: it
  // rides on a copy of the file, where an edit step is a full rewrite through
  // the editor, about 7 times the work on a 190 MB model.
  layout: {
    "Model.metadata": (model, ctx) => {
      const metadata = JSON.parse(model.metadata ?? "{}");
      for (const key of PROVENANCE) {
        if (typeof metadata[key] !== "string") {
          metadata[key] = UNKNOWN;
          ctx.backfilled.push(key);
        }
      }
      return JSON.stringify(metadata);
    },
  },

  report: (ctx) => ({ backfilled: ctx.backfilled }),
});
