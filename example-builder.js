const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");

const getDirectories = (srcPath) => fs.readdirSync(srcPath)
  .filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());

const getFiles = (srcPath) => fs.readdirSync(srcPath)
  .filter(file => fs.statSync(path.join(srcPath, file)).isFile());

const getPackageVersion = () => {
  let rawData = fs.readFileSync('package.json');
  let packageData = JSON.parse(rawData);
  return packageData.version;
}

function updateAllExamples() {
  const baseDir = './examples';
  const rollupConfigFile = 'rollup.config.js';
  const version = getPackageVersion();

  const folders = getDirectories(baseDir);

  for(const folder of folders) {
    const path = `${baseDir}/${folder}`;
    const files = getFiles(path);

    const isExampleFolder = files.includes(rollupConfigFile);
    if(isExampleFolder) {
      execute(`yarn workspace ${folder} add bim-fragment@${version}`);
      execute(`yarn workspace ${folder} build`);
    }
  }

  exec(`yarn install`);
}

function execute(command) {
  exec(command, (error) => {
    if(error) {
      console.log(error.message);
    }
  });
}

updateAllExamples();