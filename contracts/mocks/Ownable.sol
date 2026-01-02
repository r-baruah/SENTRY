// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AXIOM MOCK LIBRARY - Ownable
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A simplified, dependency-free implementation of OpenZeppelin's Ownable.
 * Used for sandboxed verification without external dependencies.
 * 
 * @notice This is a MOCK contract for AXIOM's verification sandbox.
 * @dev Intentionally simplified - lacks some OZ features like renounceOwnership.
 */
contract Ownable {
    /// @notice The owner of the contract
    address public owner;
    
    /// @notice Emitted when ownership is transferred
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /// @notice Thrown when caller is not the owner
    error OwnableUnauthorizedAccount(address account);
    
    /// @notice Thrown when new owner is the zero address
    error OwnableInvalidOwner(address owner);
    
    /**
     * @notice Sets the deployer as the initial owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @notice Restricts function access to the owner only
     */
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }
    
    /**
     * @notice Transfers ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
