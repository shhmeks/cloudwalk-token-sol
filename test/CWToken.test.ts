import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { CWToken, CWTokenV2, CWToken__factory, CWTokenV2__factory } from "../typechain-types";

const errors = {
  InvalidInitialization: "InvalidInitialization",
  AccessControlUnauthorizedAccount: "AccessControlUnauthorizedAccount",
  ZeroValue: "ZeroValue",
};

describe("CWToken", () => {
  let token: CWToken;

  let CWToken: CWToken__factory;

  let owner: SignerWithAddress, user: SignerWithAddress, minter: SignerWithAddress, burner: SignerWithAddress;
  let snapshot: SnapshotRestorer;

  const MINTER_ROLE = ethers.id("MINTER_ROLE");
  const BURNER_ROLE = ethers.id("BURNER_ROLE");

  const name = "Test Token";
  const symbol = "TT";

  const amount = ethers.parseEther("1000");

  before(async () => {
    [owner, minter, burner, user] = await ethers.getSigners();

    CWToken = await ethers.getContractFactory("CWToken");
    token = await upgrades.deployProxy(CWToken, [name, symbol], { kind: "transparent" });

    await token.grantRole(MINTER_ROLE, minter.address);
    await token.grantRole(BURNER_ROLE, burner.address);

    snapshot = await takeSnapshot();
  });

  afterEach(() => {
    snapshot.restore();
  });

  describe("Deployment & Initialization", function () {
    it("Should set the token name", async () => {
      expect(await token.name()).to.equal(name);
    });

    it("Should set the token symbol", async () => {
      expect(await token.symbol()).to.equal(symbol);
    });

    it("Should revert if token was initialized before", async () => {
      await expect(token.initialize(name, symbol)).to.be.revertedWithCustomError(token, errors.InvalidInitialization);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to specified address", async () => {
      await expect(token.connect(minter).mint(user.address, amount)).to.changeTokenBalance(token, user, amount);
    });

    it("Should revert if non-minter tries to mint", async () => {
      await expect(token.connect(user).mint(user.address, amount))
        .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
        .withArgs(user.address, MINTER_ROLE);
    });

    it("Should revert if minting zero tokens", async () => {
      await expect(token.connect(minter).mint(user.address, 0)).to.be.revertedWithCustomError(token, errors.ZeroValue);
    });
  });

  describe("Burning", function () {
    before(async () => {
      await token.connect(minter).mint(user.address, amount);
      snapshot = await takeSnapshot();
    });

    it("Should burn tokens correctly", async () => {
      await expect(token.connect(burner).burn(user.address, amount)).to.changeTokenBalance(token, user, -amount);
    });

    it("Should revert if non-burner tries to burn", async () => {
      await expect(token.connect(user).burn(user.address, amount))
        .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
        .withArgs(user.address, BURNER_ROLE);
    });

    it("Should revert if burning zero tokens", async () => {
      await expect(token.connect(burner).burn(user.address, 0)).to.be.revertedWithCustomError(token, errors.ZeroValue);
    });

    it("Should revert if burning more than balance", async () => {
      const excessiveAmount = amount + ethers.parseEther("1");
      await expect(token.connect(burner).burn(user.address, excessiveAmount)).to.be.reverted;
    });

    it("Should not allow minter to burn if not granted burner role", async () => {
      await expect(token.connect(minter).burn(user.address, amount))
        .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
        .withArgs(minter.address, BURNER_ROLE);
    });

    it("Should allow burner to burn partial amount", async () => {
      const partialAmount = ethers.parseEther("100");
      await expect(token.connect(burner).burn(user.address, partialAmount)).to.changeTokenBalance(
        token,
        user,
        -partialAmount
      );
    });

    it("Should emit Transfer event on burn", async () => {
      const burnAmount = ethers.parseEther("10");
      await expect(token.connect(burner).burn(user.address, burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(user.address, ethers.ZeroAddress, burnAmount);
    });
  });

  describe("Roles", function () {
    it("Owner should have DEFAULT_ADMIN_ROLE", async () => {
      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should allow admin to grant and revoke MINTER_ROLE", async () => {
      await token.grantRole(MINTER_ROLE, user.address);
      expect(await token.hasRole(MINTER_ROLE, user.address)).to.be.true;
      await token.revokeRole(MINTER_ROLE, user.address);
      expect(await token.hasRole(MINTER_ROLE, user.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async () => {
      await expect(token.connect(user).grantRole(MINTER_ROLE, user.address))
        .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
        .withArgs(user.address, await token.DEFAULT_ADMIN_ROLE());
    });
  });

  describe("Upgrade", function () {
    let CWTokenV2: CWTokenV2__factory;
    let tokenV2: CWTokenV2;

    before(async () => {
      CWTokenV2 = await ethers.getContractFactory("CWTokenV2");
      tokenV2 = await upgrades.upgradeProxy(token.target, CWTokenV2, {
        call: "initializeV2",
      });

      snapshot = await takeSnapshot();
    });

    it("Should upgrade the implementation", async () => {
      expect(await tokenV2.version()).to.equal("v2");
    });

    it("Should preserve balances after upgrade", async () => {
      expect(await tokenV2.balanceOf(user.address)).to.equal(await token.balanceOf(user.address));
    });

    it("Should preserve roles after upgrade", async () => {
      expect(await tokenV2.hasRole(MINTER_ROLE, minter.address)).to.be.true;
      expect(await tokenV2.hasRole(BURNER_ROLE, burner.address)).to.be.true;
    });
  });
});
