import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { StorageLocationCalculator, StorageLocationCalculator__factory } from "../typechain-types";

describe("CWToken", () => {
  let calculator: StorageLocationCalculator;
  let StorageLocationCalculator: StorageLocationCalculator__factory;

  let owner: SignerWithAddress, user: SignerWithAddress;
  let snapshot: SnapshotRestorer;

  before(async () => {
    [owner, user] = await ethers.getSigners();

    StorageLocationCalculator = await ethers.getContractFactory("StorageLocationCalculator");

    calculator = await StorageLocationCalculator.deploy();

    snapshot = await takeSnapshot();
  });

  afterEach(() => {
    snapshot.restore();
  });

  describe("EIP-7201 Storage Location Calculation", () => {
    function calculateExpectedStorageLocation(namespace: string): string {
      const namespaceHash = ethers.keccak256(ethers.toUtf8Bytes(namespace));
      const hashBigInt = BigInt(namespaceHash) - 1n;

      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [hashBigInt]);
      const secondHash = ethers.keccak256(encoded);

      const mask = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00");
      const result = BigInt(secondHash) & mask;

      return "0x" + result.toString(16).padStart(64, "0");
    }

    it("Should calculate correct EIP-7201 storage location for any namespace", async () => {
      const namespace = "test.storage.main";
      const expectedLocation = calculateExpectedStorageLocation(namespace);

      const calculatedLocation = await calculator.calculateStorageLocation(namespace);

      expect(calculatedLocation).to.equal(expectedLocation);
    });

    it("Should return the correct storage location for FreezableUpgradeable", async () => {
      const namespace = "freezable.storage.main";
      const expectedLocation = calculateExpectedStorageLocation(namespace);

      const calculatedLocation = await calculator.getFreezableStorageLocation();

      expect(calculatedLocation).to.equal(expectedLocation);
    });

    it("Should ensure storage location ends with 0x00 (EIP-7201 requirement)", async () => {
      const namespace = "test.storage.example";
      const location = await calculator.calculateStorageLocation(namespace);

      expect(location.slice(-2)).to.equal("00");
    });

    it("Should produce different locations for different namespaces", async () => {
      const namespace1 = "namespace.one";
      const namespace2 = "namespace.two";

      const location1 = await calculator.calculateStorageLocation(namespace1);
      const location2 = await calculator.calculateStorageLocation(namespace2);

      expect(location1).to.not.equal(location2);
    });

    it("Should produce consistent results for same namespace", async () => {
      const namespace = "consistent.test";

      const location1 = await calculator.calculateStorageLocation(namespace);
      const location2 = await calculator.calculateStorageLocation(namespace);

      expect(location1).to.equal(location2);
    });

    it("Should match hardcoded FreezableUpgradeable storage location", async () => {
      const expectedHardcodedLocation = "0xfa9695980f15144951740d1e1ff56b4fa8e917742a11e7147872cbc903abce00";

      const calculatedLocation = await calculator.getFreezableStorageLocation();

      expect(calculatedLocation.toLowerCase()).to.equal(expectedHardcodedLocation.toLowerCase());
    });

    describe("Edge Cases", () => {
      it("Should handle empty string namespace", async () => {
        const emptyNamespace = "";
        const location = await calculator.calculateStorageLocation(emptyNamespace);

        expect(location).to.be.a("string");
        expect(location.length).to.equal(66);
        expect(location.slice(-2)).to.equal("00");
      });

      it("Should handle very long namespace", async () => {
        const longNamespace = "a".repeat(100) + ".storage.main";
        const location = await calculator.calculateStorageLocation(longNamespace);

        expect(location).to.be.a("string");
        expect(location.slice(-2)).to.equal("00");
      });

      it("Should handle special characters in namespace", async () => {
        const specialNamespace = "special-chars_123.storage.main";
        const location = await calculator.calculateStorageLocation(specialNamespace);

        expect(location).to.be.a("string");
        expect(location.slice(-2)).to.equal("00");
      });
    });

    describe("Gas Efficiency", () => {
      it("Should calculate storage location efficiently", async () => {
        const namespace = "gas.test.namespace";

        const tx = await calculator.calculateStorageLocation.staticCall(namespace);
        expect(tx).to.be.a("string");
      });
    });
  });

  describe("Integration with FreezableUpgradeable", () => {
    it("Should validate that calculator matches contract constant", async () => {
      const calculatedLocation = await calculator.getFreezableStorageLocation();

      const expectedLocation = "0xfa9695980f15144951740d1e1ff56b4fa8e917742a11e7147872cbc903abce00";

      expect(calculatedLocation).to.equal(expectedLocation);
    });
  });
});
