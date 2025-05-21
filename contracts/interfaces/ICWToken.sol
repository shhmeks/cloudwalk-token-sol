// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ICWToken
/// @author shhmeks
/// @notice Interface for CWToken contract
/// @dev This contract is an ERC20 token with minting and burning capabilities
interface ICWToken is IERC20 {
    /// @dev Throws if the passed value is zero
    error ZeroValue();

    /// @dev Mints `amount_` tokens to `to_` address
    /// @param to_ The address to mint tokens to
    /// @param amount_ The amount of tokens to mint
    function mint(address to_, uint256 amount_) external;

    /// @dev Burns `amount_` tokens from `from_` address
    /// @param from_ The address to burn tokens from
    /// @param amount_ The amount of tokens to burn
    function burn(address from_, uint256 amount_) external;
}
