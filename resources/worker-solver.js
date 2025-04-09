
const fs = require('fs');
const path = require('path');

// Copy the worker from dist to examples/assets


// Source and destination paths
const sourcePath = path.join(__dirname, '../packages/fragments/dist/Worker/worker.mjs');
const destPath = path.join(__dirname, 'worker.mjs');

// Create destination directory if it doesn't exist
const destDir = path.dirname(destPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy the worker file
fs.copyFileSync(sourcePath, destPath);

console.log('Worker file copied successfully!');
