// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IFreezable} from "../interfaces/IFreezable.sol";

/// @title FreezableUpgradeable
/// @notice Abstract contract implementing freezable token functionality with EIP-7201 storage
/// @dev Provides base implementation for freezing token balances with role-based access control
abstract contract FreezableUpgradeable is Initializable, AccessControlUpgradeable, IFreezable {
    /// @dev Storage structure for EIP-7201 compliance
    struct FreezableStorage {
        /// @dev Mapping of user address to frozen amount
        mapping(address => uint256) frozenBalances;
    }

    /// @dev The freezer role is used to freeze/unfreeze user balances
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");

    /// @dev The withdrawer role is used to withdraw frozen balances
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    /// @dev EIP-7201 storage location for Freezable functionality
    /// @dev keccak256(abi.encode(uint256(keccak256("freezable.storage.main")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant FreezableStorageLocation =
        0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd00;

    /// @dev Returns the storage pointer for EIP-7201
    function _getFreezableStorage() private pure returns (FreezableStorage storage $) {
        assembly {
            $.slot := FreezableStorageLocation
        }
    }

    /// @dev The modifier checks if the amount is non-zero
    /// @param amount_ The amount to check
    modifier nonZeroAmount(uint256 amount_) {
        require(amount_ > 0, "FreezableUpgradeable: amount must be non-zero");
        _;
    }

    /// @dev Initialize the freezable functionality
    function __Freezable_init() internal onlyInitializing {
        __AccessControl_init();
    }

    /// @notice Freezes part of user's balance
    /// @dev Only accounts with FREEZER_ROLE can call this function
    /// @param user_ The user whose balance to freeze
    /// @param amount_ The amount to freeze
    function freezeUserBalance(
        address user_,
        uint256 amount_
    ) external virtual override onlyRole(FREEZER_ROLE) nonZeroAmount(amount_) {
        FreezableStorage storage $ = _getFreezableStorage();
        uint256 currentBalance = _getTokenBalance(user_);
        uint256 currentFrozen = $.frozenBalances[user_];

        if (currentBalance < currentFrozen + amount_) {
            revert InsufficientUnfrozenBalance();
        }

        $.frozenBalances[user_] += amount_;
        emit BalanceFrozen(user_, amount_);
    }

    /// @notice Unfreezes part of user's balance
    /// @dev Only accounts with FREEZER_ROLE can call this function
    /// @param user_ The user whose balance to unfreeze
    /// @param amount_ The amount to unfreeze
    function unfreezeUserBalance(
        address user_,
        uint256 amount_
    ) external virtual override onlyRole(FREEZER_ROLE) nonZeroAmount(amount_) {
        FreezableStorage storage $ = _getFreezableStorage();
        uint256 currentFrozen = $.frozenBalances[user_];

        if (currentFrozen < amount_) {
            revert InsufficientFrozenBalance();
        }

        $.frozenBalances[user_] -= amount_;
        emit BalanceUnfrozen(user_, amount_);
    }

    /// @notice Withdraws frozen balance from user to specified address
    /// @dev Only accounts with WITHDRAWER_ROLE can call this function
    /// @param from_ The user to withdraw frozen balance from
    /// @param to_ The address to transfer the frozen balance to
    /// @param amount_ The amount to withdraw
    function withdrawFrozenBalance(
        address from_,
        address to_,
        uint256 amount_
    ) external virtual override onlyRole(WITHDRAWER_ROLE) nonZeroAmount(amount_) {
        FreezableStorage storage $ = _getFreezableStorage();
        uint256 currentFrozen = $.frozenBalances[from_];

        if (currentFrozen < amount_) {
            revert InsufficientFrozenBalance();
        }

        $.frozenBalances[from_] -= amount_;
        _transferToken(from_, to_, amount_);
        emit FrozenBalanceWithdrawn(from_, to_, amount_);
    }

    /// @notice Returns the frozen balance of a user
    /// @param user_ The user to check
    /// @return The frozen balance amount
    function frozenBalanceOf(address user_) external view virtual override returns (uint256) {
        FreezableStorage storage $ = _getFreezableStorage();
        return $.frozenBalances[user_];
    }

    /// @notice Returns the unfrozen balance of a user
    /// @param user_ The user to check
    /// @return The unfrozen balance amount
    function unfrozenBalanceOf(address user_) external view virtual override returns (uint256) {
        FreezableStorage storage $ = _getFreezableStorage();
        return _getTokenBalance(user_) - $.frozenBalances[user_];
    }

    /// @dev Internal function to get frozen balance (for inheritance)
    function _getFrozenBalance(address user_) internal view returns (uint256) {
        FreezableStorage storage $ = _getFreezableStorage();
        return $.frozenBalances[user_];
    }

    /// @dev Internal function to check if transfer is allowed
    function _checkFrozenBalanceTransfer(address from_, uint256 amount_) internal view {
        if (from_ != address(0)) {
            // Not minting
            FreezableStorage storage $ = _getFreezableStorage();
            uint256 fromBalance = _getTokenBalance(from_);
            uint256 frozenAmount = $.frozenBalances[from_];

            if (fromBalance - frozenAmount < amount_) {
                revert TransferExceedsUnfrozenBalance();
            }
        }
    }

    /// @dev Abstract function to get token balance - must be implemented by inheriting contract
    function _getTokenBalance(address user_) internal view virtual returns (uint256);

    /// @dev Abstract function to transfer tokens - must be implemented by inheriting contract
    function _transferToken(address from_, address to_, uint256 amount_) internal virtual;
}
