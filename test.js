const { Web3 } = require("web3");
const web3 = new Web3("http://127.0.0.1:8545");

const { abi } = require("./build/Certificate.json");
const address = "0x32e22B3Bb518f371dF842945C93F9fa6481dFEe4";

const contract = new web3.eth.Contract(abi, address);

async function test() {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  await contract.methods.issueCertificate("CERT001","Yuvati","Blockchain","HASH123").send({ from, gas: 3000000 });
  const result = await contract.methods.verifyCertificate("CERT001","HASH123").call();
  console.log("Verification result:", result);
}

test().catch(console.error);
