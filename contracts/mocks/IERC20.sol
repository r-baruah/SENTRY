// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AXIOM MOCK LIBRARY - IERC20
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A simplified ERC20 interface for sandboxed verification.
 * Matches the OpenZeppelin IERC20 interface signature.
 * 
 * @notice This is a MOCK interface for AXIOM's verification sandbox.
 */
interface IERC20 {
    /// @notice Emitted when tokens are transferred
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    /// @notice Emitted when allowance is set
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Returns the total token supply
     * @return The total supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the token balance of an account
     * @param account The address to query
     * @return The balance
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Transfers tokens to a recipient
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success Whether the transfer succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Returns the remaining allowance for a spender
     * @param owner The token owner
     * @param spender The spender address
     * @return The remaining allowance
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @notice Sets the allowance for a spender
     * @param spender The spender address
     * @param amount The allowance amount
     * @return success Whether the approval succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Transfers tokens from one address to another
     * @param from The source address
     * @param to The destination address
     * @param amount The amount to transfer
     * @return success Whether the transfer succeeded
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
