// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Certificate {
    address public owner;

    struct Cert {
        string studentName;
        string course;
        string certHash;
        uint256 issuedAt;
        bool revoked;
    }

    mapping(string => Cert) public certificates;
    mapping(string => bool) public exists;

    event CertificateIssued(string indexed certId, string studentName, string course, string certHash, uint256 issuedAt);
    event CertificateRevoked(string indexed certId, uint256 revokedAt);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function issueCertificate(
        string memory _certId,
        string memory _studentName,
        string memory _course,
        string memory _certHash
    ) public onlyOwner {
        require(!exists[_certId], "Certificate already exists");
        certificates[_certId] = Cert(
            _studentName,
            _course,
            _certHash,
            block.timestamp,
            false
        );
        exists[_certId] = true;
        emit CertificateIssued(_certId, _studentName, _course, _certHash, block.timestamp);
    }

    function verifyCertificate(
        string memory _certId,
        string memory _hash
    ) public view returns (bool) {
        if (!exists[_certId]) {
            return false;
        }
        if (certificates[_certId].revoked) {
            return false;
        }
        return keccak256(abi.encodePacked(certificates[_certId].certHash))
            == keccak256(abi.encodePacked(_hash));
    }

    function revokeCertificate(string memory _certId) public onlyOwner {
        require(exists[_certId], "Certificate not found");
        require(!certificates[_certId].revoked, "Already revoked");
        certificates[_certId].revoked = true;
        emit CertificateRevoked(_certId, block.timestamp);
    }
}
