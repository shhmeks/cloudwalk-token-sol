// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ICWToken} from "../interfaces/ICWToken.sol";

/// @title CWToken
/// @author shhmeks
/// @notice CWToken contract is an ERC20 token with minting and burning capabilities
/// @dev This contract uses OpenZeppelin's ERC20 and AccessControl contracts
contract CWTokenV2 is ERC20Upgradeable, AccessControlUpgradeable, ICWToken {
    /// @dev The minter role is used to mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev The burner role is used to burn tokens
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @dev The version of the contract
    /// @dev This is used to check if the contract is upgraded
    string public version;

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

    /// @notice Initializes the contract with the given version
    /// @dev This function is used to initialize the contract after it has been upgraded
    function initializeV2() external reinitializer(2) {
        version = "v2";
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
}
