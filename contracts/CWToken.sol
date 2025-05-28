// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ICWToken} from "./interfaces/ICWToken.sol";
import {FreezableUpgradeable} from "./abstracts/FreezableUpgradeable.sol";

/// @title CWToken
/// @author shhmeks
/// @notice CWToken contract is an ERC20 token with minting, burning, and freezing capabilities
/// @dev This contract uses OpenZeppelin's ERC20 and AccessControl contracts with EIP-7201 storage
contract CWToken is Initializable, ERC20Upgradeable, FreezableUpgradeable, ICWToken {
    /// @dev The minter role is used to mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev The burner role is used to burn tokens
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

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
        __Freezable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
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

    /// @dev Implementation of abstract function from FreezableUpgradeable
    function _transferToken(address from_, address to_, uint256 amount_) internal override {
        _transfer(from_, to_, amount_);
    }

    /// @dev Override transfer to check frozen balance restrictions
    function _update(address from, address to, uint256 value) internal override {
        _checkFrozenBalanceTransfer(from, value);
        super._update(from, to, value);
    }

    /// @dev Implementation of abstract function from FreezableUpgradeable
    function _getTokenBalance(address user_) internal view override returns (uint256) {
        return balanceOf(user_);
    }
}
