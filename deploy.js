const { Web3 } = require("web3");
const { abi, bytecode } = require("./compile");
const fs = require("fs");
const path = require("path");

const web3 = new Web3("http://127.0.0.1:8545"); // Ganache RPC

async function deploy() {
  const accounts = await web3.eth.getAccounts();
  console.log("Deploying from:", accounts[0]);

  if (!bytecode) {
    throw new Error("Bytecode missing. Run `node compile.js` first.");
  }

  const result = await new web3.eth.Contract(abi)
    .deploy({ data: `0x${bytecode}` })
    .send({
      from: accounts[0],
      gas: "3000000",
    });

  console.log("Contract deployed at:", result.options.address);

  const frontendDir = path.resolve(__dirname, "frontend");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  const addressPath = path.join(frontendDir, "address.js");
  const addressJs = `window.CERTIFICATE_ADDRESS = "${result.options.address}";\n`;
  fs.writeFileSync(addressPath, addressJs);
  console.log("Frontend address written to:", addressPath);
}

deploy();
