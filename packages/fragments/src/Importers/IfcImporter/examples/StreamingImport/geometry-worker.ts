// Runs IFC geometry batches for the import worker. The whole script is this
// one call: the protocol lives in the library.
import { serveIfcGeometryWorker } from "../../src/geometry/geometry-batch";

serveIfcGeometryWorker();
