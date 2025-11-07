const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

const versionInfo = {
  version: packageJson.version,
  buildDate: new Date().toISOString(),
  name: packageJson.name,
  homepage: packageJson.homepage
};

const versionFilePath = path.join(__dirname, '../src/app/version.ts');
const fileContent = `// Auto-generated file
export const VERSION = ${JSON.stringify(versionInfo, null, 2)};
`;

fs.writeFileSync(versionFilePath, fileContent);
console.log('Version file generated successfully!');