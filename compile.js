const path = require("path");
const fs = require("fs");
const solc = require("solc");

// read contract
const contractPath = path.resolve(__dirname, "contracts", "Certificate.sol");
const source = fs.readFileSync(contractPath, "utf8");

// solc input
const input = {
  language: "Solidity",
  sources: {
    "Certificate.sol": { content: source },
  },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
};

// compile
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// show errors
if (output.errors) {
  output.errors.forEach(err => console.error(err.formattedMessage));
}

const contract = output.contracts["Certificate.sol"]["Certificate"];
if (!contract) {
  throw new Error("Contract 'Certificate' not found in compilation output.");
}

// write JSON artifact
const buildDir = path.resolve(__dirname, "build");
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}
const artifactPath = path.join(buildDir, "Certificate.json");
fs.writeFileSync(artifactPath, JSON.stringify(contract, null, 2));

// write ABI for frontend usage
const frontendDir = path.resolve(__dirname, "frontend");
if (!fs.existsSync(frontendDir)) {
  fs.mkdirSync(frontendDir, { recursive: true });
}
const abiPath = path.join(frontendDir, "abi.js");
const abiJs = `window.CERTIFICATE_ABI = ${JSON.stringify(contract.abi, null, 2)};\n`;
fs.writeFileSync(abiPath, abiJs);

// export for scripts
module.exports = {
  abi: contract.abi,
  bytecode: contract.evm && contract.evm.bytecode && contract.evm.bytecode.object,
};

console.log("Contract compiled successfully");
