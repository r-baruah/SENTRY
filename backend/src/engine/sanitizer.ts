/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - DEPENDENCY VIRTUALIZATION LAYER (SANITIZER)
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module handles the critical task of sanitizing user-submitted Solidity
 * code by remapping external dependencies to our controlled Mock Library.
 * 
 * Philosophy:
 * - We do NOT trust external code
 * - All OpenZeppelin imports are remapped to simplified mocks
 * - Unknown imports are stripped with clear documentation
 */

import { SanitizerResult, ImportMapping } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT MAPPING CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whitelist of OpenZeppelin imports and their mock replacements
 * Only these imports will be remapped; all others will be removed
 */
const IMPORT_WHITELIST: ReadonlyMap<RegExp, string> = new Map([
    // Access Control
    [
        /@openzeppelin\/contracts\/access\/Ownable\.sol/,
        'mocks/Ownable.sol'
    ],
    [
        /@openzeppelin\/contracts-upgradeable\/access\/OwnableUpgradeable\.sol/,
        'mocks/Ownable.sol'
    ],

    // ERC20 Token Standard
    [
        /@openzeppelin\/contracts\/token\/ERC20\/IERC20\.sol/,
        'mocks/IERC20.sol'
    ],
    [
        /@openzeppelin\/contracts\/token\/ERC20\/ERC20\.sol/,
        'mocks/ERC20.sol'
    ],
    [
        /@openzeppelin\/contracts\/token\/ERC20\/extensions\/IERC20Metadata\.sol/,
        'mocks/IERC20.sol'
    ],
    [
        /@openzeppelin\/contracts-upgradeable\/token\/ERC20\/IERC20Upgradeable\.sol/,
        'mocks/IERC20.sol'
    ],

    // SafeERC20 (commonly used)
    [
        /@openzeppelin\/contracts\/token\/ERC20\/utils\/SafeERC20\.sol/,
        'mocks/IERC20.sol'  // We simplify SafeERC20 to just IERC20
    ],
]);

/**
 * Regex pattern to match any import statement
 * Captures: import path in group 1 or 2 (for named imports)
 */
const IMPORT_PATTERN = /^(\s*)import\s+(?:(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']|["']([^"']+)["'])\s*;?\s*$/gm;

/**
 * Alternative pattern for aliased imports
 */
const ALIASED_IMPORT_PATTERN = /^(\s*)import\s+["']([^"']+)["']\s+as\s+\w+\s*;?\s*$/gm;

// ─────────────────────────────────────────────────────────────────────────────
// SANITIZER IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes Solidity source code by remapping imports to mock library
 * 
 * @param code - Raw Solidity source code from user
 * @returns SanitizerResult with sanitized code and import tracking
 * 
 * @example
 * ```typescript
 * const result = sanitizeImports(`
 *   import "@openzeppelin/contracts/access/Ownable.sol";
 *   contract MyContract is Ownable {}
 * `);
 * // result.code contains: import "mocks/Ownable.sol";
 * ```
 */
export function sanitizeImports(code: string): SanitizerResult {
    const remappedImports: ImportMapping[] = [];
    const removedImports: string[] = [];

    let sanitizedCode = code;

    // Process all import statements
    sanitizedCode = sanitizedCode.replace(
        IMPORT_PATTERN,
        (match: string, leadingWhitespace: string, namedImportPath: string | undefined, directImportPath: string | undefined): string => {
            const importPath = namedImportPath || directImportPath;

            if (!importPath) {
                // Malformed import - remove it
                removedImports.push(match.trim());
                return `${leadingWhitespace}// IMPORT REMOVED BY SENTRY SANITIZER: ${match.trim()}`;
            }

            // Check if this import matches our whitelist
            for (const [pattern, mockPath] of IMPORT_WHITELIST) {
                if (pattern.test(importPath)) {
                    remappedImports.push({
                        original: importPath,
                        mocked: mockPath
                    });

                    // Preserve the import structure but replace the path
                    return `${leadingWhitespace}import "${mockPath}";`;
                }
            }

            // Import not in whitelist - remove it with documentation
            removedImports.push(importPath);
            return `${leadingWhitespace}// IMPORT REMOVED BY SENTRY SANITIZER: ${importPath}`;
        }
    );

    // Handle aliased imports separately
    sanitizedCode = sanitizedCode.replace(
        ALIASED_IMPORT_PATTERN,
        (_match: string, leadingWhitespace: string, importPath: string): string => {
            // Check whitelist
            for (const [pattern, mockPath] of IMPORT_WHITELIST) {
                if (pattern.test(importPath)) {
                    remappedImports.push({
                        original: importPath,
                        mocked: mockPath
                    });
                    return `${leadingWhitespace}import "${mockPath}";`;
                }
            }

            // Remove non-whitelisted aliased imports
            removedImports.push(importPath);
            return `${leadingWhitespace}// IMPORT REMOVED BY SENTRY SANITIZER: ${importPath}`;
        }
    );

    return {
        code: sanitizedCode,
        remappedImports,
        removedImports,
        success: true
    };
}

/**
 * Validates that sanitized code doesn't contain dangerous patterns
 * This is a secondary safety check
 * 
 * @param code - Sanitized Solidity code
 * @returns boolean indicating if code is safe to compile
 */
export function validateSanitizedCode(code: string): boolean {
    // Check for any remaining external imports (should not exist after sanitization)
    const externalImportPattern = /@openzeppelin|@chainlink|@uniswap|hardhat/i;

    if (externalImportPattern.test(code)) {
        console.error('[SANITIZER] Warning: External import pattern detected in sanitized code');
        return false;
    }

    // Check for inline assembly (potential bypass vector)
    // Note: We allow assembly but log it for awareness
    const assemblyPattern = /assembly\s*\{/;
    if (assemblyPattern.test(code)) {
        console.warn('[SANITIZER] Note: Inline assembly detected in code');
    }

    return true;
}

/**
 * Extracts the pragma version from Solidity code
 * 
 * @param code - Solidity source code
 * @returns The pragma version string or null if not found
 */
export function extractPragmaVersion(code: string): string | null {
    const pragmaPattern = /pragma\s+solidity\s+([^;]+);/;
    const match = code.match(pragmaPattern);
    return match ? match[1].trim() : null;
}

/**
 * Gets a summary of the sanitization for logging purposes
 * 
 * @param result - SanitizerResult from sanitizeImports
 * @returns Human-readable summary string
 */
export function getSanitizationSummary(result: SanitizerResult): string {
    const lines: string[] = [
        '═══════════════════════════════════════════════════════════════════════════',
        '  SENTRY SANITIZER REPORT',
        '═══════════════════════════════════════════════════════════════════════════',
        '',
        `  Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`,
        `  Remapped Imports: ${result.remappedImports.length}`,
        `  Removed Imports: ${result.removedImports.length}`,
        ''
    ];

    if (result.remappedImports.length > 0) {
        lines.push('  REMAPPED:');
        result.remappedImports.forEach(mapping => {
            lines.push(`    ${mapping.original}`);
            lines.push(`    └─> ${mapping.mocked}`);
        });
        lines.push('');
    }

    if (result.removedImports.length > 0) {
        lines.push('  REMOVED (Non-Whitelisted):');
        result.removedImports.forEach(imp => {
            lines.push(`    ✗ ${imp}`);
        });
        lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════════════════');

    return lines.join('\n');
}
