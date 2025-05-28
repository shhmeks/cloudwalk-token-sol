// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IFreezable} from "./IFreezable.sol";

/// @title ICWToken
/// @notice Interface for the CWToken contract
/// @dev Extends IFreezable for freezing functionality
interface ICWToken is IFreezable {
    /// @notice Mints tokens to the specified address
    /// @param to_ The address to mint tokens to
    /// @param amount_ The amount of tokens to mint
    function mint(address to_, uint256 amount_) external;

    /// @notice Burns tokens from the specified address
    /// @param from_ The address to burn tokens from
    /// @param amount_ The amount of tokens to burn
    function burn(address from_, uint256 amount_) external;
}
