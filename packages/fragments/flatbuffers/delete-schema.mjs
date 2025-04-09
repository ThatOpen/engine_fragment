import * as fs from "fs";

const path = "./src/Schema";

if(fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true, force: true });
    console.log("Schema cleaned up!");
} else {
    console.log("Schema not found!");
}
