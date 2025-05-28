// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title IFreezable
/// @notice Interface for token freezing functionality
/// @dev Defines the standard interface for freezing and unfreezing token balances
interface IFreezable {
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

    /// @notice Freezes part of user's balance
    /// @param user_ The user whose balance to freeze
    /// @param amount_ The amount to freeze
    function freezeUserBalance(address user_, uint256 amount_) external;

    /// @notice Unfreezes part of user's balance
    /// @param user_ The user whose balance to unfreeze
    /// @param amount_ The amount to unfreeze
    function unfreezeUserBalance(address user_, uint256 amount_) external;

    /// @notice Withdraws frozen balance from user to specified address
    /// @param from_ The user to withdraw frozen balance from
    /// @param to_ The address to transfer the frozen balance to
    /// @param amount_ The amount to withdraw
    function withdrawFrozenBalance(address from_, address to_, uint256 amount_) external;

    /// @notice Returns the frozen balance of a user
    /// @param user_ The user to check
    /// @return The frozen balance amount
    function frozenBalanceOf(address user_) external view returns (uint256);

    /// @notice Returns the unfrozen balance of a user
    /// @param user_ The user to check
    /// @return The unfrozen balance amount
    function unfrozenBalanceOf(address user_) external view returns (uint256);
}
