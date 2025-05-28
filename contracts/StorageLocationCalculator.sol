// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract StorageLocationCalculator {
    function calculateStorageLocation(string memory namespace) public pure returns (bytes32) {
        return keccak256(abi.encode(uint256(keccak256(bytes(namespace))) - 1)) & ~bytes32(uint256(0xff));
    }

    function getFreezableStorageLocation() public pure returns (bytes32) {
        return calculateStorageLocation("freezable.storage.main");
    }
}
