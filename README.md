# Blockchain Certificate Verification (Beginner Project)

## Description
This project demonstrates a beginner-level blockchain application to detect fake certificates.

## Tools Required
- Ganache
- MetaMask
- Remix IDE
- VS Code

## Steps
1. Start Ganache (RPC at http://127.0.0.1:8545).
2. Compile the contract: `npm run compile`
3. Deploy the contract: `npm run deploy`
4. Open `frontend/index.html` in a browser
5. Choose Issue or Verify page
6. Connect MetaMask to Ganache
7. Issue and verify certificates

## Notes
- `npm run compile` generates `build/Certificate.json` and `frontend/abi.js`.
- `npm run deploy` generates `frontend/address.js`.
- Only the deployer (owner) can issue or revoke certificates.

## Output
- Genuine Certificate
- Fake Certificate

## Author
Beginner Blockchain Project
