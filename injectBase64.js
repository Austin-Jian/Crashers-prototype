const fs = require('fs');
const path = require('path');

// Define the base64 files and corresponding variables
const base64Files = {
  customTextureBase64: 'customTexture.txt',
  carTextureBase64: 'carTexture.txt',
  truckTextureBase64: 'truckTexture.txt',
  reverseCarTextureBase64: 'reverseCarTexture.txt',
  reverseTruckTextureBase64: 'reverseTruckTexture.txt',
};

// Function to read base64 data from files
function readBase64Data(filePath) {
  return fs.readFileSync(path.join(__dirname, filePath), 'utf8').trim();
}

// Read the content of script.js
const scriptPath = path.join(__dirname, 'script.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Inject base64 data into script.js
for (const [variableName, filePath] of Object.entries(base64Files)) {
  const base64Data = readBase64Data(filePath);
  const regex = new RegExp(`const ${variableName} = "";`, 'g');
  scriptContent = scriptContent.replace(regex, `const ${variableName} = "${base64Data}";`);
}

// Write the updated content back to script.js
fs.writeFileSync(scriptPath, scriptContent, 'utf8');

console.log('Base64 data injected successfully into script.js');
