const fs = require('fs');
const path = require('path');

// Define the base64 files and corresponding variables
const base64Files = {
  customTextureBase64: 'characters/chique64.txt',
  carTextureBase64: 'characters/elephant64.txt',
  truckTextureBase64: 'characters/cow64.txt',
  reverseCarTextureBase64: 'characters/reverseElephant64.txt',
  reverseTruckTextureBase64: 'characters/reverseCow64.txt',
  treeTexture1Base64: 'miscImages/tree1.txt'
};

// Function to read base64 data from files
function readBase64Data(filePath) {
  console.log(`Reading base64 data from: ${filePath}`);
  return fs.readFileSync(path.join(__dirname, filePath), 'utf8').trim();
}

// Read the content of script.js
const scriptPath = path.join(__dirname, 'script.js');
console.log(`Reading script content from: ${scriptPath}`);
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Inject base64 data into script.js
for (const [variableName, filePath] of Object.entries(base64Files)) {
  console.log(`Injecting base64 data for: ${variableName} from file: ${filePath}`);
  const base64Data = readBase64Data(filePath);
  const regex = new RegExp(`const ${variableName} = "";`, 'g');
  scriptContent = scriptContent.replace(regex, `const ${variableName} = "${base64Data}";`);
}

// Write the updated content back to script.js
console.log(`Writing updated script content to: ${scriptPath}`);
fs.writeFileSync(scriptPath, scriptContent, 'utf8');

console.log('Base64 data injected successfully into script.js');
