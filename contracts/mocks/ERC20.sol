// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AXIOM MOCK LIBRARY - ERC20
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A simplified, dependency-free ERC20 implementation.
 * Used for sandboxed verification without external dependencies.
 * 
 * @notice This is a MOCK contract for AXIOM's verification sandbox.
 * @dev Intentionally simplified - lacks some OZ features like hooks.
 */
contract ERC20 is IERC20 {
    /// @notice Token balances
    mapping(address => uint256) private _balances;
    
    /// @notice Token allowances
    mapping(address => mapping(address => uint256)) private _allowances;
    
    /// @notice Total token supply
    uint256 private _totalSupply;
    
    /// @notice Token name
    string private _name;
    
    /// @notice Token symbol
    string private _symbol;
    
    /// @notice Thrown when transfer exceeds balance
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    
    /// @notice Thrown when allowance is insufficient
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    
    /// @notice Thrown when address is invalid
    error ERC20InvalidReceiver(address receiver);
    
    /**
     * @notice Initializes the token with name and symbol
     * @param name_ The token name
     * @param symbol_ The token symbol
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }
    
    /**
     * @notice Returns the token name
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }
    
    /**
     * @notice Returns the token symbol
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }
    
    /**
     * @notice Returns the number of decimals (18 for standard ERC20)
     */
    function decimals() public view virtual returns (uint8) {
        return 18;
    }
    
    /**
     * @notice Returns the total token supply
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }
    
    /**
     * @notice Returns the token balance of an account
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }
    
    /**
     * @notice Transfers tokens to a recipient
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Returns the allowance for a spender
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    /**
     * @notice Sets the allowance for a spender
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @notice Transfers tokens from one address to another
     */
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @notice Internal transfer logic
     */
    function _transfer(address from, address to, uint256 amount) internal virtual {
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        
        uint256 fromBalance = _balances[from];
        if (fromBalance < amount) {
            revert ERC20InsufficientBalance(from, fromBalance, amount);
        }
        
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }
        
        emit Transfer(from, to, amount);
    }
    
    /**
     * @notice Internal mint logic (for testing)
     */
    function _mint(address account, uint256 amount) internal virtual {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        
        _totalSupply += amount;
        unchecked {
            _balances[account] += amount;
        }
        
        emit Transfer(address(0), account, amount);
    }
    
    /**
     * @notice Internal approve logic
     */
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    /**
     * @notice Internal spend allowance logic
     */
    function _spendAllowance(address owner, address spender, uint256 amount) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, amount);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
}
