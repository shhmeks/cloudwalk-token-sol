// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {FreezableUpgradeable} from "../abstracts/FreezableUpgradeable.sol";

/// @title TestFreezableUpgradeable
/// @notice Test contract to expose internal functions for testing
contract TestFreezableUpgradeable is FreezableUpgradeable {
    bool public initialized;

    /// @dev Initialize the test contract
    function initialize() external initializer {
        __Freezable_init();
        initialized = true;
    }

    /// @dev Expose the internal __Freezable_init function for testing
    function exposedFreezableInit() external {
        __Freezable_init();
    }

    /// @dev Required implementation of abstract function
    // solhint-disable-next-line no-empty-blocks
    function _transferToken(address, address, uint256) internal override {}

    /// @dev Required implementation of abstract function
    function _getTokenBalance(address) internal pure override returns (uint256) {
        return 0;
    }
}
