/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - FULL PIPELINE EXECUTION (API SERVER MODE)
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import cors from 'cors';

import {
    sanitizeImports,
    compileCode,
    isFoundryAvailable,
    verifyHypothesis,
} from './engine';

import {
    analyzeContract,
    isAPIKeyConfigured
} from './agent';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const WORKSPACE_ROOT = path.resolve(__dirname, '..', 'workspace');
const WORKSPACE_SRC = path.join(WORKSPACE_ROOT, 'src');
const PORT = 3005;

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

interface AuditResult {
    logs: string;
    verdict: 'SECURE' | 'CRITICAL' | 'UNKNOWN' | 'ERROR';
}

/**
 * Runs the complete SENTRY pipeline on raw Solidity code
 */
async function runFullPipeline(code: string): Promise<AuditResult> {
    let outputLogs = "";
    let verdict: AuditResult['verdict'] = 'UNKNOWN';

    // Helper to capture logs
    const log = (msg: string = "") => {
        console.log(msg);
        outputLogs += msg + "\n";
    };

    const logError = (msg: string = "") => {
        console.error(msg);
        outputLogs += "[ERROR] " + msg + "\n";
    };

    log('');
    log('════════════════════════════════════════════════════════════════');
    log('                     SENTRY PIPELINE STARTED                      ');
    log('════════════════════════════════════════════════════════════════');
    log('');

    try {
        // ═══════════════════════════════════════════════════════════════════════
        // STEP A: SANITIZE
        // ═══════════════════════════════════════════════════════════════════════

        log('┌────────────────────────────────────────────────────────────────┐');
        log('│  STEP A: SANITIZATION                                         │');
        log('└────────────────────────────────────────────────────────────────┘');

        const sanitizerResult = sanitizeImports(code);

        // Ensure workspace/src exists
        if (!fs.existsSync(WORKSPACE_SRC)) {
            fs.mkdirSync(WORKSPACE_SRC, { recursive: true });
        }

        // Write sanitized code to workspace/src/Vault.sol
        const vaultPath = path.join(WORKSPACE_SRC, 'Vault.sol');
        fs.writeFileSync(vaultPath, sanitizerResult.code, 'utf-8');

        log(`✅ Sanitized (Imports remapped)`);
        log(`   → ${sanitizerResult.remappedImports.length} import(s) remapped`);
        log(`   → Saved to: workspace/src/Vault.sol`);
        log('');

        // ═══════════════════════════════════════════════════════════════════════
        // STEP B: COMPILE
        // ═══════════════════════════════════════════════════════════════════════

        log('┌────────────────────────────────────────────────────────────────┐');
        log('│  STEP B: COMPILATION                                          │');
        log('└────────────────────────────────────────────────────────────────┘');

        // Check if Foundry is available
        const foundryAvailable = await isFoundryAvailable();
        if (!foundryAvailable) {
            logError('❌ Error: Foundry not installed');
            logError('   Install: curl -L https://foundry.paradigm.xyz | bash && foundryup');
            return { logs: outputLogs, verdict: 'ERROR' };
        }

        const compilerResult = await compileCode(sanitizerResult.code, { clean: true });

        if (!compilerResult.success) {
            logError('❌ Error compiling');
            logError(compilerResult.logs);
            return { logs: outputLogs, verdict: 'ERROR' };
        }

        log('✅ Compiled (Foundry build success)');
        log('');

        // ═══════════════════════════════════════════════════════════════════════
        // STEP C: ANALYZE
        // ═══════════════════════════════════════════════════════════════════════

        log('┌────────────────────────────────────────────────────────────────┐');
        log('│  STEP C: AI ANALYSIS                                          │');
        log('└────────────────────────────────────────────────────────────────┘');

        // Check API key
        if (!isAPIKeyConfigured()) {
            logError('❌ Error: AI Provider API key not configured');
            logError('   Check .env file for AI_PROVIDER and corresponding API key');
            return { logs: outputLogs, verdict: 'ERROR' };
        }

        log('🧠 Analyzing (AI hypothesis...)');

        const analysisResult = await analyzeContract({
            sourceCode: sanitizerResult.code,
            contractName: 'Vault'
        });

        if (!analysisResult.success) {
            logError('❌ Error: AI analysis failed');
            logError(`   ${analysisResult.error}`);
            return { logs: outputLogs, verdict: 'ERROR' };
        }

        if (analysisResult.hypotheses.length === 0) {
            log('✅ Analysis complete: No vulnerabilities detected');
            log('');
            log('════════════════════════════════════════════════════════════════');
            log('   FINAL VERDICT: CONTRACT SECURE                               ');
            log('════════════════════════════════════════════════════════════════');
            return { logs: outputLogs, verdict: 'SECURE' };
        }

        // Log AI's hypothesis
        const primaryHypothesis = analysisResult.hypotheses[0];
        log(`🧠 AI found: ${primaryHypothesis.target}`);
        log(`   → Vulnerability Type: ${primaryHypothesis.vulnerabilityType}`);
        log(`   → Confidence: ${primaryHypothesis.confidence}%`);
        log(`   → Reasoning: ${primaryHypothesis.reasoning.substring(0, 80)}...`);
        log('');

        // ═══════════════════════════════════════════════════════════════════════
        // STEP D: VERIFY
        // ═══════════════════════════════════════════════════════════════════════

        log('┌────────────────────────────────────────────────────────────────┐');
        log('│  STEP D: EXPLOIT VERIFICATION                                 │');
        log('└────────────────────────────────────────────────────────────────┘');

        log('💉 Injecting Exploit...');
        log(`   → Target function: ${primaryHypothesis.target}()`);
        log('');

        log('🔨 Running Foundry...');

        const verificationResult = await verifyHypothesis('Vault.sol', primaryHypothesis);

        // Log Foundry output
        log('');
        log('─────────────────────────────────────────────────────────────────');
        log('FOUNDRY OUTPUT:');
        log('─────────────────────────────────────────────────────────────────');
        log(verificationResult.testOutput || 'No output captured');
        log('─────────────────────────────────────────────────────────────────');
        log('');

        // ═══════════════════════════════════════════════════════════════════════
        // FINAL VERDICT
        // ═══════════════════════════════════════════════════════════════════════

        log('');
        log('════════════════════════════════════════════════════════════════');

        if (verificationResult.verdict === 'CRITICAL_VULNERABILITY_FOUND' ||
            verificationResult.verdict === 'VULNERABILITY_CONFIRMED') {
            log('🚨 FINAL VERDICT: CRITICAL VULNERABILITY CONFIRMED 🚨');
            log('');
            log(`   Vulnerability: ${primaryHypothesis.vulnerabilityType}`);
            log(`   Target: ${primaryHypothesis.target}()`);
            log(`   Confidence: ${primaryHypothesis.confidence}%`);
            log('');
            log('   ⚠️  EXPLOIT TEST PASSED - The vulnerability is REAL!');
            verdict = 'CRITICAL';
        } else if (verificationResult.verdict === 'FALSE_POSITIVE') {
            log('✅ FINAL VERDICT: VULNERABILITY NOT EXPLOITABLE');
            log('');
            log('   The AI hypothesis could not be verified.');
            log('   The contract may have additional protections.');
            verdict = 'SECURE';
        } else {
            log('⚠️  FINAL VERDICT: VERIFICATION INCONCLUSIVE');
            log('');
            log(`   Verdict: ${verificationResult.verdict}`);
            log('   Manual review recommended.');
            verdict = 'UNKNOWN';
        }

        log('════════════════════════════════════════════════════════════════');
        log('');

        return { logs: outputLogs, verdict };

    } catch (e: any) {
        logError(`FATAL EXCEPTION: ${e.message}`);
        return { logs: outputLogs, verdict: 'ERROR' };
    }
    return { logs: outputLogs, verdict: 'ERROR' };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.post('/audit', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        res.status(400).json({ error: 'No code provided' });
        return;
    }

    try {
        const result = await runFullPipeline(code);
        res.json(result);
    } catch (error) {
        console.error('Pipeline failed:', error);
        res.status(500).json({ error: 'Pipeline execution failed' });
    }
});

app.listen(PORT, () => {
    console.log(`SENTRY Server running on http://localhost:${PORT}`);
});
