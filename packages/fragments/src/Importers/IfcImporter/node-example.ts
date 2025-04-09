import * as fs from "fs";

import { IfcImporter } from "./index";

async function createFragsModelFromIfc(url: string) {
  const serializer = new IfcImporter();

  serializer.wasm.path = "../../node_modules/web-ifc/";

  let fileFinishedReading = false;
  let previousOffset = -1;

  const input = fs.openSync(url, "r");

  const readCallback = (offset: number, size: number) => {
    if (!fileFinishedReading) {
      console.log(`Reading IFC file: Offset ${offset} Size ${size}`);
      if (offset < previousOffset) {
        fileFinishedReading = true;
        console.log(
          `File reading finished! Starting conversion to fragments...`,
        );
      }
      previousOffset = offset;
    }

    const data = new Uint8Array(size);
    const bytesRead = fs.readSync(input, data, 0, size, offset);
    if (bytesRead <= 0) return new Uint8Array(0);
    return data;
  };

  const exported = await serializer.process({
    readFromCallback: true,
    readCallback,
    raw: false,
  });

  const splitPathToken = url.includes("/") ? "/" : "\\";
  const fileName = url.split(splitPathToken).pop()?.split(".")[0];
  const baseDir = "../../resources/frags";
  fs.writeFileSync(`${baseDir}/${fileName}.frag`, exported);
}

createFragsModelFromIfc("../../resources/ifc/medium_test.ifc");

// async function processIfcFolder(folderPath: string) {
//   try {
//     // Get all files in the directory
//     const files = fs.readdirSync(folderPath);

//     // Filter for .ifc files
//     const ifcFiles = files.filter((file) =>
//       file.toLowerCase().endsWith(".ifc"),
//     );

//     const count = ifcFiles.length;
//     let counter = 0;

//     // Process each IFC file
//     for (const file of ifcFiles) {
//       const filePath = path.join(folderPath, file);
//       console.log(`Processing ${file}...`);
//       await createFragsModelFromIfc(filePath);
//       counter++;
//       console.log(`Process: ${counter}/${count}`);
//     }

//     console.log("Finished processing all IFC files");
//   } catch (error) {
//     console.error("Error processing IFC folder:", error);
//   }
// }

// processIfcFolder("../../resources/ifc/civil");
