import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import {
  CWToken,
  CWTokenV2,
  TestFreezableUpgradeable,
  CWToken__factory,
  CWTokenV2__factory,
  TestFreezableUpgradeable__factory,
} from "../typechain-types";

const errors = {
  InvalidInitialization: "InvalidInitialization",
  AccessControlUnauthorizedAccount: "AccessControlUnauthorizedAccount",
  ZeroValue: "ZeroValue",
  InsufficientUnfrozenBalance: "InsufficientUnfrozenBalance",
  InsufficientFrozenBalance: "InsufficientFrozenBalance",
  TransferExceedsUnfrozenBalance: "TransferExceedsUnfrozenBalance",
  NotInitializing: "NotInitializing",
};

describe("CWToken", () => {
  let token: CWToken;
  let CWToken: CWToken__factory;

  let owner: SignerWithAddress,
    user: SignerWithAddress,
    minter: SignerWithAddress,
    burner: SignerWithAddress,
    freezer: SignerWithAddress,
    withdrawer: SignerWithAddress,
    recipient: SignerWithAddress;
  let snapshot: SnapshotRestorer;

  const MINTER_ROLE = ethers.id("MINTER_ROLE");
  const BURNER_ROLE = ethers.id("BURNER_ROLE");
  const FREEZER_ROLE = ethers.id("FREEZER_ROLE");
  const WITHDRAWER_ROLE = ethers.id("WITHDRAWER_ROLE");

  const name = "Test Token";
  const symbol = "TT";
  const amount = ethers.parseEther("1000");

  before(async () => {
    [owner, minter, burner, user, freezer, withdrawer, recipient] = await ethers.getSigners();

    CWToken = await ethers.getContractFactory("CWToken");
    token = await upgrades.deployProxy(CWToken, [name, symbol], { kind: "transparent" });

    await token.grantRole(MINTER_ROLE, minter.address);
    await token.grantRole(BURNER_ROLE, burner.address);
    await token.grantRole(FREEZER_ROLE, freezer.address);
    await token.grantRole(WITHDRAWER_ROLE, withdrawer.address);

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
      const excessiveAmount = amount + ethers.parseEther("10");
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

  describe("Freezing Functionality", function () {
    describe("Freeze User Balance", function () {
      it("Should freeze user balance correctly", async () => {
        const freezeAmount = ethers.parseEther("100");

        await expect(token.connect(freezer).freezeUserBalance(user.address, freezeAmount))
          .to.emit(token, "BalanceFrozen")
          .withArgs(user.address, freezeAmount);

        expect(await token.frozenBalanceOf(user.address)).to.equal(freezeAmount);
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(amount - freezeAmount);
      });

      it("Should allow freezing multiple times", async () => {
        const firstFreeze = ethers.parseEther("100");
        const secondFreeze = ethers.parseEther("50");

        await token.connect(freezer).freezeUserBalance(user.address, firstFreeze);
        await token.connect(freezer).freezeUserBalance(user.address, secondFreeze);

        expect(await token.frozenBalanceOf(user.address)).to.equal(firstFreeze + secondFreeze);
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(amount - firstFreeze - secondFreeze);
      });

      it("Should freeze entire balance", async () => {
        await token.connect(freezer).freezeUserBalance(user.address, amount);

        expect(await token.frozenBalanceOf(user.address)).to.equal(amount);
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(0);
      });

      it("Should revert if trying to freeze more than available balance", async () => {
        const excessiveAmount = amount + ethers.parseEther("1");

        await expect(
          token.connect(freezer).freezeUserBalance(user.address, excessiveAmount)
        ).to.be.revertedWithCustomError(token, errors.InsufficientUnfrozenBalance);
      });

      it("Should revert if trying to freeze more than unfrozen balance", async () => {
        const firstFreeze = ethers.parseEther("800");
        const secondFreeze = ethers.parseEther("300"); // Total would exceed balance

        await token.connect(freezer).freezeUserBalance(user.address, firstFreeze);

        await expect(
          token.connect(freezer).freezeUserBalance(user.address, secondFreeze)
        ).to.be.revertedWithCustomError(token, errors.InsufficientUnfrozenBalance);
      });

      it("Should revert if non-freezer tries to freeze", async () => {
        const freezeAmount = ethers.parseEther("100");

        await expect(token.connect(user).freezeUserBalance(user.address, freezeAmount))
          .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
          .withArgs(user.address, FREEZER_ROLE);
      });

      it("Should revert if freezing zero amount", async () => {
        await expect(token.connect(freezer).freezeUserBalance(user.address, 0)).to.be.revertedWithCustomError(
          token,
          errors.ZeroValue
        );
      });
    });

    describe("Withdraw Frozen Balance", function () {
      before(async () => {
        await token.connect(freezer).freezeUserBalance(user.address, ethers.parseEther("500"));
        snapshot = await takeSnapshot();
      });

      it("Should withdraw frozen balance correctly", async () => {
        const withdrawAmount = ethers.parseEther("100");
        const initialRecipientBalance = await token.balanceOf(recipient.address);

        await expect(token.connect(withdrawer).withdrawFrozenBalance(user.address, recipient.address, withdrawAmount))
          .to.emit(token, "FrozenBalanceWithdrawn")
          .withArgs(user.address, recipient.address, withdrawAmount)
          .and.to.emit(token, "Transfer")
          .withArgs(user.address, recipient.address, withdrawAmount);

        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("400"));
        expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("900"));
        expect(await token.balanceOf(recipient.address)).to.equal(initialRecipientBalance + withdrawAmount);
      });

      it("Should withdraw entire frozen balance", async () => {
        const frozenAmount = ethers.parseEther("500");

        await token.connect(withdrawer).withdrawFrozenBalance(user.address, recipient.address, frozenAmount);

        expect(await token.frozenBalanceOf(user.address)).to.equal(0);
        expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("500"));
        expect(await token.balanceOf(recipient.address)).to.equal(frozenAmount);
      });

      it("Should revert if trying to withdraw more than frozen balance", async () => {
        const excessiveAmount = ethers.parseEther("600");

        await expect(
          token.connect(withdrawer).withdrawFrozenBalance(user.address, recipient.address, excessiveAmount)
        ).to.be.revertedWithCustomError(token, errors.InsufficientFrozenBalance);
      });

      it("Should revert if non-withdrawer tries to withdraw", async () => {
        const withdrawAmount = ethers.parseEther("100");

        await expect(token.connect(user).withdrawFrozenBalance(user.address, recipient.address, withdrawAmount))
          .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
          .withArgs(user.address, WITHDRAWER_ROLE);
      });

      it("Should revert if withdrawing zero amount", async () => {
        await expect(
          token.connect(withdrawer).withdrawFrozenBalance(user.address, recipient.address, 0)
        ).to.be.revertedWithCustomError(token, errors.ZeroValue);
      });
    });

    describe("Unfreeze User Balance", function () {
      it("Should unfreeze user balance correctly", async () => {
        const unfreezeAmount = ethers.parseEther("100");

        await expect(token.connect(freezer).unfreezeUserBalance(user.address, unfreezeAmount))
          .to.emit(token, "BalanceUnfrozen")
          .withArgs(user.address, unfreezeAmount);

        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("400"));
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(ethers.parseEther("600"));
      });

      it("Should unfreeze entire frozen balance", async () => {
        const frozenAmount = ethers.parseEther("500");

        await token.connect(freezer).unfreezeUserBalance(user.address, frozenAmount);

        expect(await token.frozenBalanceOf(user.address)).to.equal(0);
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(amount);
      });

      it("Should revert if trying to unfreeze more than frozen balance", async () => {
        const excessiveAmount = ethers.parseEther("600");

        await expect(
          token.connect(freezer).unfreezeUserBalance(user.address, excessiveAmount)
        ).to.be.revertedWithCustomError(token, errors.InsufficientFrozenBalance);
      });

      it("Should revert if non-freezer tries to unfreeze", async () => {
        const unfreezeAmount = ethers.parseEther("100");

        await expect(token.connect(user).unfreezeUserBalance(user.address, unfreezeAmount))
          .to.be.revertedWithCustomError(token, errors.AccessControlUnauthorizedAccount)
          .withArgs(user.address, FREEZER_ROLE);
      });

      it("Should revert if unfreezing zero amount", async () => {
        await expect(token.connect(freezer).unfreezeUserBalance(user.address, 0)).to.be.revertedWithCustomError(
          token,
          errors.ZeroValue
        );
      });
    });

    describe("Transfer Restrictions", function () {
      before(async () => {
        await token.connect(freezer).freezeUserBalance(user.address, ethers.parseEther("200"));
        snapshot = await takeSnapshot();
      });

      it("Should allow transfer of unfrozen balance", async () => {
        const transferAmount = ethers.parseEther("200");

        await expect(token.connect(user).transfer(recipient.address, transferAmount)).to.changeTokenBalances(
          token,
          [user, recipient],
          [-transferAmount, transferAmount]
        );

        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("700"));
      });

      it("Should allow transfer of exactly unfrozen balance", async () => {
        const transferAmount = ethers.parseEther("300"); // Exactly unfrozen amount

        await expect(token.connect(user).transfer(recipient.address, transferAmount)).to.changeTokenBalances(
          token,
          [user, recipient],
          [-transferAmount, transferAmount]
        );
      });

      it("Should revert if trying to transfer more than unfrozen balance", async () => {
        const transferAmount = ethers.parseEther("400"); // More than unfrozen (300)

        await expect(token.connect(user).transfer(recipient.address, transferAmount)).to.be.revertedWithCustomError(
          token,
          errors.TransferExceedsUnfrozenBalance
        );
      });

      it("Should revert if trying to transfer frozen balance", async () => {
        const transferAmount = ethers.parseEther("800"); // More than total unfrozen

        await expect(token.connect(user).transfer(recipient.address, transferAmount)).to.be.revertedWithCustomError(
          token,
          errors.TransferExceedsUnfrozenBalance
        );
      });

      it("Should allow normal transfers after unfreezing", async () => {
        // Unfreeze some balance
        await token.connect(freezer).unfreezeUserBalance(user.address, ethers.parseEther("400"));

        const transferAmount = ethers.parseEther("600"); // Now possible
        await expect(token.connect(user).transfer(recipient.address, transferAmount)).to.changeTokenBalances(
          token,
          [user, recipient],
          [-transferAmount, transferAmount]
        );
      });
    });

    describe("View Functions", function () {
      it("Should return correct frozen balance", async () => {
        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("700"));
        expect(await token.frozenBalanceOf(recipient.address)).to.equal(0);
      });

      it("Should return correct unfrozen balance", async () => {
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(ethers.parseEther("300"));
        expect(await token.unfrozenBalanceOf(recipient.address)).to.equal(0);
      });

      it("Should update view functions after balance changes", async () => {
        // Mint more tokens
        await token.connect(minter).mint(user.address, ethers.parseEther("500"));

        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("700"));
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(ethers.parseEther("800"));
      });
    });

    describe("Role Management", function () {
      it("Should allow admin to grant and revoke FREEZER_ROLE", async () => {
        await token.grantRole(FREEZER_ROLE, user.address);
        expect(await token.hasRole(FREEZER_ROLE, user.address)).to.be.true;

        await token.revokeRole(FREEZER_ROLE, user.address);
        expect(await token.hasRole(FREEZER_ROLE, user.address)).to.be.false;
      });

      it("Should allow admin to grant and revoke WITHDRAWER_ROLE", async () => {
        await token.grantRole(WITHDRAWER_ROLE, user.address);
        expect(await token.hasRole(WITHDRAWER_ROLE, user.address)).to.be.true;

        await token.revokeRole(WITHDRAWER_ROLE, user.address);
        expect(await token.hasRole(WITHDRAWER_ROLE, user.address)).to.be.false;
      });
    });

    describe("Edge Cases", function () {
      it("Should handle zero balance user correctly", async () => {
        expect(await token.frozenBalanceOf(recipient.address)).to.equal(0);
        expect(await token.unfrozenBalanceOf(recipient.address)).to.equal(0);

        await expect(
          token.connect(freezer).freezeUserBalance(recipient.address, ethers.parseEther("1"))
        ).to.be.revertedWithCustomError(token, errors.InsufficientUnfrozenBalance);
      });

      it("Should handle multiple users independently", async () => {
        // Mint tokens to recipient
        await token.connect(minter).mint(recipient.address, ethers.parseEther("1000"));

        // Freeze different amounts for different users
        await token.connect(freezer).freezeUserBalance(user.address, ethers.parseEther("200"));
        await token.connect(freezer).freezeUserBalance(recipient.address, ethers.parseEther("100"));

        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("900"));
        expect(await token.frozenBalanceOf(recipient.address)).to.equal(ethers.parseEther("100"));
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(ethers.parseEther("100"));
        expect(await token.unfrozenBalanceOf(recipient.address)).to.equal(ethers.parseEther("900"));
      });

      it("Should maintain frozen balance through burns (if unfrozen balance is sufficient)", async () => {
        await token.connect(burner).burn(user.address, ethers.parseEther("200"));

        expect(await token.frozenBalanceOf(user.address)).to.equal(ethers.parseEther("700"));
        expect(await token.unfrozenBalanceOf(user.address)).to.equal(ethers.parseEther("100"));
      });
    });
  });
  describe("Upgradability", function () {
    let CWTokenV2: CWTokenV2__factory;
    let tokenV2: CWTokenV2;

    before(async () => {
      CWTokenV2 = await ethers.getContractFactory("CWTokenV2");
      tokenV2 = await upgrades.upgradeProxy(token.target, CWTokenV2);
    });

    it("Should upgrade to CWTokenV2", async () => {
      expect(await tokenV2.name()).to.equal(name);
      expect(await tokenV2.symbol()).to.equal(symbol);
    });

    it("Should retain frozen and unfrozen balances after upgrade", async () => {
      expect(await tokenV2.frozenBalanceOf(user.address)).to.equal(await token.frozenBalanceOf(user.address));
      expect(await tokenV2.unfrozenBalanceOf(user.address)).to.equal(await token.unfrozenBalanceOf(user.address));
    });
  });

  describe("FreezableUpgradeable Security Tests", function () {
    let testFreezable: TestFreezableUpgradeable;
    let TestFreezableUpgradeable: TestFreezableUpgradeable__factory;

    beforeEach(async () => {
      TestFreezableUpgradeable = await ethers.getContractFactory("TestFreezableUpgradeable");
      testFreezable = await upgrades.deployProxy(TestFreezableUpgradeable, [], { kind: "transparent" });
    });

    it("Should revert when calling __Freezable_init() after initialization", async () => {
      await expect(testFreezable.exposedFreezableInit()).to.be.revertedWithCustomError(
        testFreezable,
        errors.NotInitializing
      );
    });

    it("Should revert when calling exposed init on uninitialized contract outside initializer", async () => {
      const uninitializedContract = await TestFreezableUpgradeable.deploy();

      await expect(uninitializedContract.exposedFreezableInit()).to.be.revertedWithCustomError(
        uninitializedContract,
        errors.NotInitializing
      );
    });
  });
});
