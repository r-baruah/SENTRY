/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - PRE-FLIGHT COMPILER (FOUNDRY WRAPPER)
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module wraps the Foundry `forge build` command to provide a controlled
 * compilation environment. It acts as a safety gate before AI analysis.
 * 
 * Philosophy:
 * - Fail fast on bad syntax
 * - Capture all output for debugging
 * - Graceful error handling (no crashes)
 * - Proper timeout management
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CompilerResult, CompilerOptions } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/** Default timeout for forge build (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

/** Path to the workspace directory (Foundry project root) */
const WORKSPACE_DIR = path.resolve(__dirname, '../../../..', 'workspace');

// Contract files are written dynamically by writeContractToWorkspace()

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures the workspace directory structure exists
 * Creates src/ and test/ directories if missing
 */
async function ensureWorkspaceExists(): Promise<void> {
    const srcDir = path.join(WORKSPACE_DIR, 'src');
    const testDir = path.join(WORKSPACE_DIR, 'test');
    const libDir = path.join(WORKSPACE_DIR, 'lib');

    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.mkdir(libDir, { recursive: true });
}

/**
 * Writes the sanitized code to the workspace
 * 
 * @param code - Sanitized Solidity code
 * @param filename - Optional custom filename (defaults to Vault.sol)
 */
async function writeContractToWorkspace(
    code: string,
    filename: string = 'Vault.sol'
): Promise<string> {
    const contractPath = path.join(WORKSPACE_DIR, 'src', filename);
    await fs.promises.writeFile(contractPath, code, 'utf-8');
    return contractPath;
}

/**
 * Copies mock contracts (like Ownable) to the workspace
 * This enables the sanitizer's remapped imports to work
 */
async function copyMocksToWorkspace(): Promise<void> {
    // SENTRY/contracts/mocks -> workspace/src/mocks
    const mocksSourceDir = path.resolve(WORKSPACE_DIR, '../contracts/mocks');
    const mocksDestDir = path.join(WORKSPACE_DIR, 'src/mocks');

    try {
        await fs.promises.mkdir(mocksDestDir, { recursive: true });

        // Check if source exists
        try {
            await fs.promises.access(mocksSourceDir);
        } catch {
            console.warn(`[COMPILER] Mocks directory not found at ${mocksSourceDir}. Skipping mock copy.`);
            return;
        }

        const files = await fs.promises.readdir(mocksSourceDir);
        for (const file of files) {
            if (file.endsWith('.sol')) {
                await fs.promises.copyFile(
                    path.join(mocksSourceDir, file),
                    path.join(mocksDestDir, file)
                );
            }
        }
    } catch (error) {
        console.warn('[COMPILER] Failed to copy mocks:', error);
    }
}

/**
 * Cleans the workspace by removing compiled artifacts
 * Preserves the directory structure and foundry.toml
 */
async function cleanWorkspace(): Promise<void> {
    const outDir = path.join(WORKSPACE_DIR, 'out');
    const cacheDir = path.join(WORKSPACE_DIR, 'cache');

    try {
        await fs.promises.rm(outDir, { recursive: true, force: true });
        await fs.promises.rm(cacheDir, { recursive: true, force: true });
    } catch (error) {
        // Directories may not exist, which is fine
        console.warn('[COMPILER] Cache clean warning:', error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPILER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compiles sanitized Solidity code using Foundry's forge build
 * 
 * @param sanitizedCode - Code that has been processed by the sanitizer
 * @param options - Optional compiler configuration
 * @returns CompilerResult with success status and logs
 */
export async function compileCode(
    sanitizedCode: string,
    options: CompilerOptions = {}
): Promise<CompilerResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;

    try {
        // Step 1: Ensure workspace exists
        await ensureWorkspaceExists();

        // Step 2: Optionally clean workspace
        if (options.clean) {
            await cleanWorkspace();
        }

        // Step 3: Copy mock contracts
        await copyMocksToWorkspace();

        // Step 4: Write code to workspace
        const contractPath = await writeContractToWorkspace(sanitizedCode);
        console.log(`[COMPILER] Contract written to: ${contractPath}`);

        // Step 4: Execute forge build
        const result = await executeForge(timeout);

        return {
            ...result,
            timestamp: new Date(),
            durationMs: Date.now() - startTime
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
            success: false,
            logs: `[SENTRY COMPILER ERROR] ${errorMessage}`,
            timestamp: new Date(),
            durationMs: Date.now() - startTime
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM DETECTION
// ─────────────────────────────────────────────────────────────────────────────

let cachedForgeCommand: string | null = null;

async function getForgeCommand(): Promise<string> {
    if (cachedForgeCommand) return cachedForgeCommand;

    // Check if authentic 'forge' exists
    const forgeExists = await new Promise<boolean>(resolve => {
        const p = spawn('forge', ['--version'], { shell: true });
        p.on('close', code => resolve(code === 0));
        p.on('error', () => resolve(false));
    });

    if (forgeExists) {
        cachedForgeCommand = 'forge';
        return 'forge';
    }

    // If on Windows, try WSL
    if (process.platform === 'win32') {
        const wslForgeExists = await new Promise<boolean>(resolve => {
            const p = spawn('wsl', ['forge', '--version'], { shell: true });
            p.on('close', code => resolve(code === 0));
            p.on('error', () => resolve(false));
        });

        if (wslForgeExists) {
            cachedForgeCommand = 'wsl forge'; // Value to use in exec/command strings
            return 'wsl forge';
        }

        // Try ~/.foundry/bin/forge in WSL
        const wslPathExists = await new Promise<boolean>(resolve => {
            const p = spawn('wsl', ['~/.foundry/bin/forge', '--version'], { shell: true });
            p.on('close', code => resolve(code === 0));
            p.on('error', () => resolve(false));
        });

        if (wslPathExists) {
            cachedForgeCommand = 'wsl ~/.foundry/bin/forge';
            return 'wsl ~/.foundry/bin/forge';
        }
    }

    // Default to forge (will fail later but that's expected if missing)
    return 'forge';
}

/**
 * Executes the forge build command and captures output
 */
async function executeForge(timeout: number): Promise<CompilerResult> {
    const forgeCmdString = await getForgeCommand();
    const isWsl = forgeCmdString.startsWith('wsl');

    let command = 'forge';
    let args = ['build'];

    if (isWsl) {
        command = 'wsl';
        // Extract the forge command part (remove 'wsl ')
        const wslCmd = forgeCmdString.substring(4);
        args = [wslCmd, 'build'];
    } else {
        command = 'forge';
        args = ['build'];
    }

    return new Promise((resolve) => {
        const logs: string[] = [];
        let timedOut = false;

        const process: ChildProcess = spawn(command, args, {
            cwd: WORKSPACE_DIR,
            shell: true,
            env: {
                ...global.process.env,
                NO_COLOR: '1',
                FORCE_COLOR: '0'
            }
        });

        // Add header to logs
        logs.push('═══════════════════════════════════════════════════════════════════════════');
        logs.push('  SENTRY PRE-FLIGHT COMPILER');
        logs.push('═══════════════════════════════════════════════════════════════════════════');
        logs.push('');
        logs.push(`  Workspace: ${WORKSPACE_DIR}`);
        logs.push(`  Command: ${forgeCmdString} build`);
        logs.push('');
        logs.push('─────────────────────────────────────────────────────────────────────────────');
        logs.push('  FORGE OUTPUT:');
        logs.push('─────────────────────────────────────────────────────────────────────────────');
        logs.push('');

        // Setup timeout
        const timeoutHandle = setTimeout(() => {
            timedOut = true;
            process.kill('SIGKILL');
        }, timeout);

        // Capture stdout
        process.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            logs.push(output);
        });

        // Capture stderr
        process.stderr?.on('data', (data: Buffer) => {
            const output = data.toString();
            logs.push(`[STDERR] ${output}`);
        });

        // Handle process exit
        process.on('close', (code: number | null) => {
            clearTimeout(timeoutHandle);
            logs.push('');
            logs.push('─────────────────────────────────────────────────────────────────────────────');

            if (timedOut) {
                logs.push('  Status: TIMEOUT');
                resolve({
                    success: false,
                    logs: logs.join('\n'),
                    timestamp: new Date()
                });
                return;
            }

            const success = code === 0;
            logs.push(`  Status: ${success ? '✓ SUCCESS' : '✗ FAILED'}`);
            resolve({
                success,
                logs: logs.join('\n'),
                timestamp: new Date()
            });
        });

        process.on('error', (error: Error) => {
            clearTimeout(timeoutHandle);
            logs.push(`  Status: ✗ SPAWN ERROR: ${error.message}`);
            resolve({
                success: false,
                logs: logs.join('\n'),
                timestamp: new Date()
            });
        });
    });
}

/**
 * Quick check to verify if Foundry is available
 */
export async function isFoundryAvailable(): Promise<boolean> {
    const cmd = await getForgeCommand();
    const isWsl = cmd.startsWith('wsl');

    let command = 'forge';
    let args = ['--version'];

    if (isWsl) {
        command = 'wsl';
        const wslCmd = cmd.substring(4);
        args = [wslCmd, '--version'];
    }

    return new Promise((resolve) => {
        const process = spawn(command, args, { shell: true });
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
    });
}

/**
 * Gets the current Foundry version
 */
export async function getFoundryVersion(): Promise<string | null> {
    const cmd = await getForgeCommand();
    const isWsl = cmd.startsWith('wsl');

    let command = 'forge';
    let args = ['--version'];

    if (isWsl) {
        command = 'wsl';
        const wslCmd = cmd.substring(4);
        args = [wslCmd, '--version'];
    }

    return new Promise((resolve) => {
        let version = '';

        const process = spawn(command, args, { shell: true });

        process.stdout?.on('data', (data: Buffer) => {
            version += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0 && version) {
                resolve(version.trim());
            } else {
                resolve(null);
            }
        });

        process.on('error', () => {
            resolve(null);
        });
    });
}

/**
 * Cleans the src/ directory in workspace (removes all .sol files)
 */
export async function cleanSourceDirectory(): Promise<void> {
    const srcDir = path.join(WORKSPACE_DIR, 'src');

    try {
        const files = await fs.promises.readdir(srcDir);

        for (const file of files) {
            if (file.endsWith('.sol')) {
                await fs.promises.unlink(path.join(srcDir, file));
            }
        }

        console.log('[COMPILER] Source directory cleaned');
    } catch (error) {
        console.warn('[COMPILER] Clean warning:', error);
    }
}
