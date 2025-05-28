// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ICWToken} from "./interfaces/ICWToken.sol";

/// @title CWToken
/// @author shhmeks
/// @notice CWToken contract is an ERC20 token with minting, burning, and freezing capabilities
/// @dev This contract uses OpenZeppelin's ERC20 and AccessControl contracts with EIP-7201 storage
contract CWToken is Initializable, ERC20Upgradeable, AccessControlUpgradeable, ICWToken {
    /// @dev The minter role is used to mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev The burner role is used to burn tokens
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @dev The freezer role is used to freeze/unfreeze user balances
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");

    /// @dev The withdrawer role is used to withdraw frozen balances
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    /// @dev EIP-7201 storage location for CWToken
    /// @dev keccak256(abi.encode(uint256(keccak256("cwtoken.storage.main")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant CWTokenStorageLocation =
        0x8b2e2c9c5b7c5e5d5a5b9c5b7c5e5d5a5b9c5b7c5e5d5a5b9c5b7c5e5d5a5b00;

    /// @dev Storage structure for EIP-7201 compliance
    struct CWTokenStorage {
        /// @dev Mapping of user address to frozen amount
        mapping(address => uint256) frozenBalances;
    }

    /// @dev Returns the storage pointer for EIP-7201
    function _getCWTokenStorage() private pure returns (CWTokenStorage storage $) {
        assembly {
            $.slot := CWTokenStorageLocation
        }
    }

    /// @dev Emitted when user balance is frozen
    event BalanceFrozen(address indexed user, uint256 amount);

    /// @dev Emitted when user balance is unfrozen
    event BalanceUnfrozen(address indexed user, uint256 amount);

    /// @dev Emitted when frozen balance is withdrawn
    event FrozenBalanceWithdrawn(address indexed from, address indexed to, uint256 amount);

    /// @dev Error thrown when trying to freeze more than available balance
    error InsufficientUnfrozenBalance();

    /// @dev Error thrown when trying to unfreeze more than frozen balance
    error InsufficientFrozenBalance();

    /// @dev Error thrown when trying to transfer frozen balance
    error TransferExceedsUnfrozenBalance();

    /// @dev The modifier checks if the amount is non-zero
    /// @param amount_ The amount to check
    modifier nonZero(uint256 amount_) {
        if (amount_ == 0) revert ZeroValue();
        _;
    }

    /// @dev Initializes the contract with the given name and symbol
    /// @dev Grants the default admin role to the sender
    /// @param name_ The name of the token
    /// @param symbol_ The symbol of the token
    function initialize(string memory name_, string memory symbol_) external initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /// @notice Freezes part of user's balance
    /// @dev Only accounts with FREEZER_ROLE can call this function
    /// @param user_ The user whose balance to freeze
    /// @param amount_ The amount to freeze
    function freezeUserBalance(address user_, uint256 amount_) external onlyRole(FREEZER_ROLE) nonZero(amount_) {
        CWTokenStorage storage $ = _getCWTokenStorage();
        uint256 currentBalance = balanceOf(user_);
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
    function unfreezeUserBalance(address user_, uint256 amount_) external onlyRole(FREEZER_ROLE) nonZero(amount_) {
        CWTokenStorage storage $ = _getCWTokenStorage();
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
    ) external onlyRole(WITHDRAWER_ROLE) nonZero(amount_) {
        CWTokenStorage storage $ = _getCWTokenStorage();
        uint256 currentFrozen = $.frozenBalances[from_];

        if (currentFrozen < amount_) {
            revert InsufficientFrozenBalance();
        }

        $.frozenBalances[from_] -= amount_;
        _transfer(from_, to_, amount_);
        emit FrozenBalanceWithdrawn(from_, to_, amount_);
    }

    /// @notice Returns the frozen balance of a user
    /// @param user_ The user to check
    /// @return The frozen balance amount
    function frozenBalanceOf(address user_) external view returns (uint256) {
        CWTokenStorage storage $ = _getCWTokenStorage();
        return $.frozenBalances[user_];
    }

    /// @notice Returns the unfrozen balance of a user
    /// @param user_ The user to check
    /// @return The unfrozen balance amount
    function unfrozenBalanceOf(address user_) external view returns (uint256) {
        CWTokenStorage storage $ = _getCWTokenStorage();
        return balanceOf(user_) - $.frozenBalances[user_];
    }

    /// @notice Creates a `amount_` of tokens and assigns them to `to_`, by transferring it from address(0).
    /// @dev Only the minter role can call this function
    /// @dev Emits a {Transfer} event
    /// @param to_ The address to mint tokens to
    /// @param amount_ The amount of tokens to mint
    function mint(address to_, uint256 amount_) external override onlyRole(MINTER_ROLE) nonZero(amount_) {
        _mint(to_, amount_);
    }

    /// @notice Destroys a `amount_` of tokens from `from_`, lowering the total supply
    /// @dev Only the burner role can call this function
    /// @dev Emits a {Transfer} event
    /// @param from_ The address to burn tokens from
    /// @param amount_ The amount of tokens to burn
    function burn(address from_, uint256 amount_) external override onlyRole(BURNER_ROLE) nonZero(amount_) {
        _burn(from_, amount_);
    }

    /// @dev Override transfer to check frozen balance restrictions
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) {
            // Not minting
            CWTokenStorage storage $ = _getCWTokenStorage();
            uint256 fromBalance = balanceOf(from);
            uint256 frozenAmount = $.frozenBalances[from];

            if (fromBalance - frozenAmount < value) {
                revert TransferExceedsUnfrozenBalance();
            }
        }

        super._update(from, to, value);
    }
}
