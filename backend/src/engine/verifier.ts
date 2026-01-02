/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - EXPLOIT VERIFIER ENGINE (Sprint 3)
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module implements the "Harness Injection" pattern inspired by fuzz-utils.
 * It takes AI-generated hypotheses and injects exploit code into a test harness.
 * 
 * Flow:
 * 1. Read the AttackerHarness.sol template
 * 2. Validate the hypothesis target function
 * 3. Inject the exploit call into the harness
 * 4. Write the test file to workspace/test/Attacker.t.sol
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VulnerabilityHypothesis, VerificationResult, Verdict } from '../types';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Path to the harness template relative to backend directory */
const HARNESS_TEMPLATE_PATH = path.resolve(__dirname, '../../templates/AttackerHarness.sol');

/** Path to the workspace test directory */
const WORKSPACE_TEST_PATH = path.resolve(__dirname, '../../../workspace/test');

/** Path to the workspace root (for forge execution) */
const WORKSPACE_ROOT = path.resolve(__dirname, '../../../workspace');

/** Injection marker in the harness template */
const INJECTION_MARKER = '// {{INJECT_ATTACK_CODE}}';

/** Valid function name regex (Solidity identifier) */
const VALID_FUNCTION_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of the exploit injection operation
 */
export interface InjectionResult {
    /** Whether the injection was successful */
    success: boolean;
    /** Path to the generated test file (if successful) */
    testFilePath?: string;
    /** Error message (if failed) */
    error?: string;
    /** The injected exploit code */
    exploitCode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that the hypothesis target is a valid Solidity function name
 */
function isValidFunctionName(target: string): boolean {
    if (!target || typeof target !== 'string') {
        return false;
    }
    return VALID_FUNCTION_NAME.test(target.trim());
}

/**
 * Generates the exploit code string for a given hypothesis
 */
function generateExploitCode(hypothesis: VulnerabilityHypothesis): string {
    const target = hypothesis.target.trim();

    // Build the exploit based on vulnerability type
    let exploitCode = '';

    switch (hypothesis.vulnerabilityType) {
        case 'ACCESS_CONTROL':
            // For access control bugs, we just call the function directly
            // If it shouldn't be accessible, the call succeeding is the exploit
            exploitCode = `
        // SENTRY Generated Exploit: Testing Access Control
        // Target Function: ${target}
        // Vulnerability Type: ${hypothesis.vulnerabilityType}
        // Confidence: ${hypothesis.confidence}%
        // Reasoning: ${hypothesis.reasoning}
        
        // Attempt to call the target function as a non-privileged attacker
        // If this call does NOT revert, the access control is broken
        target.${target}();`;
            break;

        case 'REENTRANCY':
            // For reentrancy, we would need more complex attack setup
            // For now, just call the function
            exploitCode = `
        // SENTRY Generated Exploit: Testing Reentrancy
        // Target Function: ${target}
        // Vulnerability Type: ${hypothesis.vulnerabilityType}
        // Confidence: ${hypothesis.confidence}%
        
        target.${target}();`;
            break;

        default:
            // Generic exploit: just try to call the function
            exploitCode = `
        // SENTRY Generated Exploit: Generic Access Test
        // Target Function: ${target}
        // Vulnerability Type: ${hypothesis.vulnerabilityType}
        // Confidence: ${hypothesis.confidence}%
        
        target.${target}();`;
    }

    return exploitCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Injects an exploit into the harness template based on the AI hypothesis
 * 
 * @param userCodeFileName - Name of the user's contract file (e.g., "Vault.sol")
 * @param hypothesis - The vulnerability hypothesis from the AI
 * @returns InjectionResult with success status and file path
 */
export async function injectExploit(
    userCodeFileName: string,
    hypothesis: VulnerabilityHypothesis
): Promise<InjectionResult> {
    try {
        // ═══════════════════════════════════════════════════════════════════
        // Step 1: Validate the hypothesis target
        // ═══════════════════════════════════════════════════════════════════

        if (!isValidFunctionName(hypothesis.target)) {
            return {
                success: false,
                error: `Invalid target function name: "${hypothesis.target}". Must be a valid Solidity identifier.`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // Step 2: Read the harness template
        // ═══════════════════════════════════════════════════════════════════

        if (!fs.existsSync(HARNESS_TEMPLATE_PATH)) {
            return {
                success: false,
                error: `Harness template not found at: ${HARNESS_TEMPLATE_PATH}`
            };
        }

        let harnessContent = fs.readFileSync(HARNESS_TEMPLATE_PATH, 'utf-8');

        // ═══════════════════════════════════════════════════════════════════
        // Step 3: Verify the injection marker exists
        // ═══════════════════════════════════════════════════════════════════

        if (!harnessContent.includes(INJECTION_MARKER)) {
            return {
                success: false,
                error: `Injection marker "${INJECTION_MARKER}" not found in harness template.`
            };
        }

        // ═══════════════════════════════════════════════════════════════════
        // Step 4: Optionally update the import if contract name differs
        // ═══════════════════════════════════════════════════════════════════

        // Extract contract name from filename (e.g., "Vault.sol" -> "Vault")
        const contractName = userCodeFileName.replace(/\.sol$/i, '');

        // Update the import and contract reference if needed
        if (contractName !== 'Vault') {
            harnessContent = harnessContent.replace(
                'import "src/Vault.sol";',
                `import "src/${userCodeFileName}";`
            );
            harnessContent = harnessContent.replace(
                /Vault public target/g,
                `${contractName} public target`
            );
            harnessContent = harnessContent.replace(
                /target = new Vault\(\)/g,
                `target = new ${contractName}()`
            );
        }

        // ═══════════════════════════════════════════════════════════════════
        // Step 5: Generate and inject the exploit code
        // ═══════════════════════════════════════════════════════════════════

        const exploitCode = generateExploitCode(hypothesis);
        harnessContent = harnessContent.replace(INJECTION_MARKER, exploitCode);

        // ═══════════════════════════════════════════════════════════════════
        // Step 6: Ensure test directory exists
        // ═══════════════════════════════════════════════════════════════════

        if (!fs.existsSync(WORKSPACE_TEST_PATH)) {
            fs.mkdirSync(WORKSPACE_TEST_PATH, { recursive: true });
        }

        // ═══════════════════════════════════════════════════════════════════
        // Step 7: Write the test file
        // ═══════════════════════════════════════════════════════════════════

        const testFilePath = path.join(WORKSPACE_TEST_PATH, 'Attacker.t.sol');
        fs.writeFileSync(testFilePath, harnessContent, 'utf-8');

        return {
            success: true,
            testFilePath,
            exploitCode: exploitCode.trim()
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Runs the exploit test using Foundry's forge test command
 * 
 * @returns VerificationResult with the test outcome
 */
export async function runExploitTest(
    hypothesis: VulnerabilityHypothesis
): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
        // DETECT PLATFORM: Use WSL if on Windows and forge is not found?
        // Simpler approach: Check if we should use WSL.
        // Since we can't easily import from compiler.ts for now without potentially causing issues,
        // we'll just implement a quick check or default to trying 'forge' then 'wsl forge' if on Windows.
        // Actually, let's just use a hardcoded check for win32 to try wsl if forge fails?
        // No, let's just replicate the logic:

        let command = 'forge test --match-path test/Attacker.t.sol -vvv';

        if (process.platform === 'win32') {
            // Check if 'forge' works
            const forgeWorks = await new Promise<boolean>(res => {
                exec('forge --version', (err) => res(!err));
            });

            if (!forgeWorks) {
                // Try WSL
                const wslWorks = await new Promise<boolean>(res => {
                    exec('wsl forge --version', (err) => res(!err));
                });

                if (wslWorks) {
                    command = 'wsl forge test --match-path test/Attacker.t.sol -vvv';
                } else {
                    // Try ~/.foundry/bin/forge
                    const wslPathWorks = await new Promise<boolean>(res => {
                        exec('wsl ~/.foundry/bin/forge --version', (err) => res(!err));
                    });

                    if (wslPathWorks) {
                        command = 'wsl ~/.foundry/bin/forge test --match-path test/Attacker.t.sol -vvv';
                    }
                }
            }
        }

        const { stdout, stderr } = await execAsync(
            command,
            {
                cwd: WORKSPACE_ROOT,
                timeout: 60000 // 60 second timeout
            }
        );

        const output = stdout + '\n' + stderr;
        const durationMs = Date.now() - startTime;

        // Parse the test result
        // If the test FAILS (our assertTrue(false) is NOT reached due to revert), 
        // it means the exploit was BLOCKED → False positive
        // If the test PASSES, our assertTrue(false) was reached → This shouldn't happen normally
        // If the test FAILS with "EXPLOIT SUCCEEDED", the vulnerability is confirmed

        const exploitSucceeded = output.includes('EXPLOIT SUCCEEDED');
        const testPassed = output.includes('[PASS]');
        const testFailed = output.includes('[FAIL]');

        let verdict: Verdict;

        if (exploitSucceeded || (testFailed && output.includes('EXPLOIT SUCCEEDED'))) {
            // The test reached our assertTrue(false) which means the target function
            // was callable without reverting → VULNERABILITY CONFIRMED
            verdict = 'VULNERABILITY_CONFIRMED';
        } else if (testFailed && !output.includes('EXPLOIT SUCCEEDED')) {
            // The test failed before reaching our assertion
            // This means the target function reverted → access control is working
            verdict = 'FALSE_POSITIVE';
        } else if (testPassed) {
            // This shouldn't normally happen with our harness design
            verdict = 'INCONCLUSIVE';
        } else if (output.toLowerCase().includes('compil') && output.toLowerCase().includes('error')) {
            verdict = 'COMPILATION_FAILED';
        } else {
            verdict = 'INCONCLUSIVE';
        }

        return {
            verdict,
            targetFunction: hypothesis.target,
            exploitSucceeded,
            testOutput: output,
            durationMs
        };

    } catch (error: any) {
        const durationMs = Date.now() - startTime;
        
        // Capture detailed output from the error object if available
        // child_process.exec throws an error that contains stdout/stderr
        const detailedError = (error.stdout || '') + '\n' + (error.stderr || '');
        const errorMessage = detailedError.trim().length > 0 
            ? detailedError 
            : (error instanceof Error ? error.message : String(error));

        // Check if it's a compilation error or test failure
        let verdict: Verdict = 'INCONCLUSIVE';
        if (errorMessage.toLowerCase().includes('compil') || errorMessage.toLowerCase().includes('error')) {
            verdict = 'COMPILATION_FAILED';
        }

        return {
            verdict,
            targetFunction: hypothesis.target,
            exploitSucceeded: false,
            testOutput: errorMessage,
            durationMs
        };
    }
}

/**
 * Full verification pipeline: inject exploit, run test, return result
 */
export async function verifyHypothesis(
    userCodeFileName: string,
    hypothesis: VulnerabilityHypothesis
): Promise<VerificationResult> {
    // Step 1: Inject the exploit
    const injectionResult = await injectExploit(userCodeFileName, hypothesis);

    if (!injectionResult.success) {
        return {
            verdict: 'INCONCLUSIVE',
            targetFunction: hypothesis.target,
            exploitSucceeded: false,
            testOutput: `Injection failed: ${injectionResult.error}`,
            durationMs: 0
        };
    }

    // Step 2: Run the test
    return runExploitTest(hypothesis);
}

/**
 * Returns a formatted summary of the verification result
 */
export function getVerificationSummary(result: VerificationResult): string {
    const verdictEmoji = {
        'CRITICAL_VULNERABILITY_FOUND': '🚨',
        'VULNERABILITY_CONFIRMED': '⚠️',
        'FALSE_POSITIVE': '✓',
        'INCONCLUSIVE': '❓',
        'COMPILATION_FAILED': '✗'
    };

    const verdictDescription = {
        'CRITICAL_VULNERABILITY_FOUND': 'CRITICAL VULNERABILITY - Immediate action required',
        'VULNERABILITY_CONFIRMED': 'VULNERABILITY CONFIRMED - Exploit successful',
        'FALSE_POSITIVE': 'FALSE POSITIVE - Access control is working',
        'INCONCLUSIVE': 'INCONCLUSIVE - Manual review recommended',
        'COMPILATION_FAILED': 'COMPILATION FAILED - Test could not run'
    };

    return `
┌─────────────────────────────────────────────────────────────────────────────┐
│  SENTRY VERIFICATION RESULT                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Target: ${result.targetFunction.padEnd(64)}│
│  Verdict: ${verdictEmoji[result.verdict]} ${verdictDescription[result.verdict].padEnd(58)}│
│  Duration: ${String(result.durationMs).padEnd(5)} ms                                                      │
│  Exploit Succeeded: ${result.exploitSucceeded ? 'YES' : 'NO'}                                                   │
└─────────────────────────────────────────────────────────────────────────────┘`;
}
