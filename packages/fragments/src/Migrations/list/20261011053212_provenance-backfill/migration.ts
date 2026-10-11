import { EditRequestType } from "../../../Utils/edit/edit-types";
import { defineMigration } from "../../src/define";

const PROVENANCE = ["generator", "version"] as const;

/** What a file that predates the provenance stamp gets: nobody knows any more. */
const UNKNOWN = "unknown";

export default defineMigration({
  title: "Every file says what generated it",

  context: () => ({ backfilled: [] as string[] }),

  // The revision came after the generator and the version (#273), and every
  // writer stamps the three together. So a file with no revision that does
  // name its generator was written in between, and has nothing to catch up
  // on: only the ones that name none are behind.
  matchesUnstamped: ({ metadata }) =>
    PROVENANCE.some((key) => typeof metadata?.[key] !== "string"),

  edit: (model, ctx) => {
    const metadata = { ...model.getMetadata() };
    for (const key of PROVENANCE) {
      if (typeof metadata[key] !== "string") {
        metadata[key] = UNKNOWN;
        ctx.backfilled.push(key);
      }
    }
    if (ctx.backfilled.length === 0) {
      return [];
    }
    return [
      { type: EditRequestType.UPDATE_METADATA, localId: 0, data: metadata },
    ];
  },

  report: (ctx) => ({ backfilled: ctx.backfilled }),
});
