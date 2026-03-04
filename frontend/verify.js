const { useEffect, useMemo, useState } = React;

function VerifyApp() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("ok");
  const [chainId, setChainId] = useState("");
  const [verifyForm, setVerifyForm] = useState({
    certId: "",
    hash: "",
  });
  const [verifyFileName, setVerifyFileName] = useState("");

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
  }, [isGanache]);


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

  const hashFile = async (file, onHash) => {
    try {
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      onHash(hashHex);
    } catch (err) {
      setStatus("Failed to hash file.");
      setStatusType("warn");
    }
  };

  return (
    <div className="wrap">
      <section className="hero card">
        <div>
          <span className="pill">Public Verify</span>
          <h1>Verify Certificates</h1>
          <p>
            Anyone can verify certificates. Use the same ID and hash that were used
            during issuance.
          </p>
          <div className="row" style={{ marginTop: "12px" }}>
            <a className="btn" href="./index.html">
              Back to Home
            </a>
            <a className="btn" href="./issue.html">
              Go to Issue
            </a>
          </div>
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
          <p className="muted">Contract: {window.CERTIFICATE_ADDRESS || "Missing address.js"}</p>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h3>Verify Certificate</h3>
          <label>Certificate ID</label>
          <input
            value={verifyForm.certId}
            onChange={(e) => setVerifyForm({ ...verifyForm, certId: e.target.value })}
            placeholder="CERT-001"
          />
          <label>Certificate Hash</label>
          <div className="input-row">
            <input
              value={verifyForm.hash}
              onChange={(e) => setVerifyForm({ ...verifyForm, hash: e.target.value })}
              placeholder="SHA256 hash"
            />
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                if (!verifyForm.hash) return;
                navigator.clipboard.writeText(verifyForm.hash);
                setStatus("Hash copied.");
                setStatusType("ok");
              }}
            >
              Copy
            </button>
          </div>
          <label>Upload Certificate (optional)</label>
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              setVerifyFileName(file.name);
              hashFile(file, (hashHex) => setVerifyForm({ ...verifyForm, hash: hashHex }));
            }}
          />
          {verifyFileName ? <p className="muted">File: {verifyFileName}</p> : null}
          <div className="row" style={{ marginTop: "12px" }}>
            <button className="btn" onClick={verifyCertificate} disabled={!contract}>
              Verify
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
root.render(<VerifyApp />);
