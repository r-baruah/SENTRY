/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - ENGINE MODULE EXPORTS
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Sanitizer exports
export {
    sanitizeImports,
    validateSanitizedCode,
    extractPragmaVersion,
    getSanitizationSummary
} from './sanitizer';

// Compiler exports
export {
    compileCode,
    isFoundryAvailable,
    getFoundryVersion,
    cleanSourceDirectory
} from './compiler';

// Verifier exports (Sprint 3)
export {
    injectExploit,
    runExploitTest,
    verifyHypothesis,
    getVerificationSummary
} from './verifier';

export type { InjectionResult } from './verifier';
