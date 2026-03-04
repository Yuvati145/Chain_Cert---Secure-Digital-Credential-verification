const { useEffect, useMemo, useState } = React;

function App() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const [chainId, setChainId] = useState("");
  const [owner, setOwner] = useState("");
  const [issueForm, setIssueForm] = useState({
    certId: "",
    student: "",
    course: "",
    hash: "",
  });
  const [verifyForm, setVerifyForm] = useState({
    certId: "",
    hash: "",
  });
  const [revokeForm, setRevokeForm] = useState({
    certId: "",
  });

  const web3 = useMemo(() => {
    if (window.ethereum) {
      return new Web3(window.ethereum);
    }
    return null;
  }, []);

  const contract = useMemo(() => {
    if (!web3 || !window.CERTIFICATE_ABI || !window.CERTIFICATE_ADDRESS) return null;
    return new web3.eth.Contract(window.CERTIFICATE_ABI, window.CERTIFICATE_ADDRESS);
  }, [web3]);

  const isGanache = chainId === "0x539" || chainId === "0x1337" || chainId === "0x1691";
  const chainName = useMemo(() => {
    if (!chainId) return "Unknown";
    if (isGanache) return "Ganache Local";
    return `Chain ${chainId}`;
  }, [chainId, isGanache]);

  useEffect(() => {
    if (!window.ethereum) {
      setStatus("MetaMask not detected. Install it to continue.");
      setStatusType("warn");
      return;
    }

    const handleAccounts = (accounts) => {
      setAccount(accounts[0] || "");
    };
    const handleChain = (id) => {
      setChainId(id);
      if (!isGanache) {
        setStatus("Switch MetaMask to Ganache Local network.");
        setStatusType("warn");
      } else {
        setStatus("Ganache network detected.");
        setStatusType("ok");
      }
    };

    window.ethereum.request({ method: "eth_accounts" }).then(handleAccounts).catch(() => {});
    window.ethereum.request({ method: "eth_chainId" }).then(handleChain).catch(() => {});
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
        window.ethereum.removeListener("chainChanged", handleChain);
      }
    };
  }, []);

  useEffect(() => {
    if (!contract) return;
    contract.methods
      .owner()
      .call()
      .then((addr) => setOwner(addr))
      .catch(() => {});
  }, [contract]);

  const connect = async () => {
    try {
      if (!window.ethereum) {
        setStatus("MetaMask not detected.");
        setStatusType("warn");
        return;
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const id = await window.ethereum.request({ method: "eth_chainId" });
      setAccount(accounts[0] || "");
      setChainId(id);
      setStatus("Wallet connected.");
      setStatusType("ok");
    } catch (err) {
      setStatus(err.message || "Failed to connect wallet.");
      setStatusType("warn");
    }
  };

  const issueCertificate = async () => {
    if (!contract) {
      setStatus("Contract not ready. Check ABI and address files.");
      setStatusType("warn");
      return;
    }
    if (!account) {
      setStatus("Connect your wallet first.");
      setStatusType("warn");
      return;
    }
    const { certId, student, course, hash } = issueForm;
    if (!certId || !student || !course || !hash) {
      setStatus("Please fill all issue fields.");
      setStatusType("warn");
      return;
    }
    if (!isGanache) {
      setStatus("Wrong network. Switch MetaMask to Ganache Local.");
      setStatusType("warn");
      return;
    }
    if (owner && account && owner.toLowerCase() !== account.toLowerCase()) {
      setStatus("Only the contract owner can issue certificates.");
      setStatusType("warn");
      return;
    }
    try {
      const code = await web3.eth.getCode(window.CERTIFICATE_ADDRESS);
      if (!code || code === "0x") {
        setStatus("No contract found at this address. Re-deploy and reload.");
        setStatusType("warn");
        return;
      }
      setStatus("Issuing certificate...");
      setStatusType("ok");
      const gas = await contract.methods
        .issueCertificate(certId, student, course, hash)
        .estimateGas({ from: account });
      const receipt = await contract.methods
        .issueCertificate(certId, student, course, hash)
        .send({ from: account, gas });
      setStatus(`Certificate issued. Tx: ${receipt.transactionHash}`);
      setStatusType("ok");
    } catch (err) {
      setStatus(err.message || "Failed to issue certificate.");
      setStatusType("warn");
    }
  };

  const verifyCertificate = async () => {
    if (!contract) {
      setStatus("Contract not ready. Check ABI and address files.");
      setStatusType("warn");
      return;
    }
    const { certId, hash } = verifyForm;
    if (!certId || !hash) {
      setStatus("Please fill all verify fields.");
      setStatusType("warn");
      return;
    }
    if (!isGanache) {
      setStatus("Wrong network. Switch MetaMask to Ganache Local.");
      setStatusType("warn");
      return;
    }
    try {
      const code = await web3.eth.getCode(window.CERTIFICATE_ADDRESS);
      if (!code || code === "0x") {
        setStatus("No contract found at this address. Re-deploy and reload.");
        setStatusType("warn");
        return;
      }
      setStatus("Verifying certificate...");
      setStatusType("ok");
      const exists = await contract.methods.exists(certId).call();
      if (!exists) {
        setStatus("Certificate not found.");
        setStatusType("warn");
        return;
      }
      const cert = await contract.methods.certificates(certId).call();
      if (cert.revoked) {
        setStatus("Certificate revoked.");
        setStatusType("warn");
        return;
      }
      const result = await contract.methods.verifyCertificate(certId, hash).call();
      if (result) {
        setStatus(`Genuine certificate for ${cert.studentName} (${cert.course}).`);
        setStatusType("ok");
      } else {
        setStatus("Fake or invalid certificate.");
        setStatusType("warn");
      }
    } catch (err) {
      setStatus(err.message || "Failed to verify certificate.");
      setStatusType("warn");
    }
  };

  const revokeCertificate = async () => {
    if (!contract) {
      setStatus("Contract not ready. Check ABI and address files.");
      setStatusType("warn");
      return;
    }
    if (!account) {
      setStatus("Connect your wallet first.");
      setStatusType("warn");
      return;
    }
    if (!isGanache) {
      setStatus("Wrong network. Switch MetaMask to Ganache Local.");
      setStatusType("warn");
      return;
    }
    if (owner && account && owner.toLowerCase() !== account.toLowerCase()) {
      setStatus("Only the contract owner can revoke certificates.");
      setStatusType("warn");
      return;
    }
    const { certId } = revokeForm;
    if (!certId) {
      setStatus("Please enter a certificate ID.");
      setStatusType("warn");
      return;
    }
    try {
      const code = await web3.eth.getCode(window.CERTIFICATE_ADDRESS);
      if (!code || code === "0x") {
        setStatus("No contract found at this address. Re-deploy and reload.");
        setStatusType("warn");
        return;
      }
      setStatus("Revoking certificate...");
      setStatusType("ok");
      const gas = await contract.methods.revokeCertificate(certId).estimateGas({ from: account });
      const receipt = await contract.methods.revokeCertificate(certId).send({ from: account, gas });
      setStatus(`Certificate revoked. Tx: ${receipt.transactionHash}`);
      setStatusType("ok");
    } catch (err) {
      setStatus(err.message || "Failed to revoke certificate.");
      setStatusType("warn");
    }
  };

  return (
    <div className="wrap">
      <section className="hero card">
        <div>
          <span className="pill">Ganache Ready</span>
          <h1>ChainCert</h1>
          <p>
            Issue and verify certificates on a local blockchain. Every issued
            certificate is stored on-chain to prevent forgery.
          </p>
        </div>
        <div className="card">
          <h3>Wallet</h3>
          <div className="row">
            <button className="btn" onClick={connect}>
              Connect MetaMask
            </button>
          </div>
          <p className="muted">Account: {account || "Not connected"}</p>
          <p className="muted">Network: {chainName}</p>
          <p className="muted">Owner: {owner || "Unknown"}</p>
          <p className="muted">Contract: {window.CERTIFICATE_ADDRESS || "Missing address.js"}</p>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h3>Issue Certificate</h3>
          <label>Certificate ID</label>
          <input
            value={issueForm.certId}
            onChange={(e) => setIssueForm({ ...issueForm, certId: e.target.value })}
            placeholder="CERT-001"
          />
          <label>Student Name</label>
          <input
            value={issueForm.student}
            onChange={(e) => setIssueForm({ ...issueForm, student: e.target.value })}
            placeholder="Student Name"
          />
          <label>Course</label>
          <input
            value={issueForm.course}
            onChange={(e) => setIssueForm({ ...issueForm, course: e.target.value })}
            placeholder="Course Title"
          />
          <label>Certificate Hash</label>
          <input
            value={issueForm.hash}
            onChange={(e) => setIssueForm({ ...issueForm, hash: e.target.value })}
            placeholder="SHA256 hash"
          />
          <div className="row" style={{ marginTop: "12px" }}>
            <button
              className="btn"
              onClick={issueCertificate}
              disabled={!account || !contract}
            >
              Issue
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Verify Certificate</h3>
          <label>Certificate ID</label>
          <input
            value={verifyForm.certId}
            onChange={(e) => setVerifyForm({ ...verifyForm, certId: e.target.value })}
            placeholder="CERT-001"
          />
          <label>Certificate Hash</label>
          <input
            value={verifyForm.hash}
            onChange={(e) => setVerifyForm({ ...verifyForm, hash: e.target.value })}
            placeholder="SHA256 hash"
          />
          <div className="row" style={{ marginTop: "12px" }}>
            <button
              className="btn"
              onClick={verifyCertificate}
              disabled={!contract}
            >
              Verify
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Revoke Certificate</h3>
          <label>Certificate ID</label>
          <input
            value={revokeForm.certId}
            onChange={(e) => setRevokeForm({ ...revokeForm, certId: e.target.value })}
            placeholder="CERT-001"
          />
          <div className="row" style={{ marginTop: "12px" }}>
            <button
              className="btn"
              onClick={revokeCertificate}
              disabled={!account || !contract}
            >
              Revoke
            </button>
          </div>
        </div>
      </section>

      {status ? <div className={`status ${statusType}`}>{status}</div> : null}

      <div className="footer">Local blockchain demo for certificate verification.</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
