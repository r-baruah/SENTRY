/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - AI PROMPT ENGINEERING
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module contains carefully engineered prompts for the AI agent.
 * Focus: Access Control vulnerabilities (missing onlyOwner, unauthorized access)
 * 
 * Philosophy:
 * - The AI is a TARGETING SYSTEM, not a decision maker
 * - We ask for specific, actionable function names
 * - Structured JSON output for deterministic parsing
 */

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT - Establishes the AI's role and constraints
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are SENTRY, a specialized Smart Contract Security Analyzer.

YOUR ROLE:
You are a TARGETING SYSTEM. Your job is to identify potential vulnerabilities and output specific function names that may be exploitable. You do NOT make final decisions - your hypotheses will be verified by deterministic execution.

YOUR FOCUS:
You specialize in ACCESS CONTROL vulnerabilities:
- Missing \`onlyOwner\` or equivalent modifiers on sensitive functions
- Functions that should be restricted but are \`public\` or \`external\`
- Unauthorized fund withdrawal (anyone can drain)
- Unauthorized state changes (anyone can modify critical state)
- Missing role-based access control

WHAT MAKES A FUNCTION VULNERABLE TO ACCESS CONTROL:
1. The function modifies balances, transfers tokens, or sends ETH
2. The function changes ownership or admin settings
3. The function pauses/unpauses the contract
4. The function has NO access control modifier (onlyOwner, onlyAdmin, onlyRole, etc.)
5. The function can be called by any address (msg.sender is not checked)

WHAT TO IGNORE:
- View/pure functions (they cannot modify state)
- Functions with proper access control already applied
- Constructor (inherently protected)
- Internal/private functions (not directly callable)

OUTPUT FORMAT:
You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.
The JSON schema is:
{
  "hypotheses": [
    {
      "target": "functionName",
      "vulnerabilityType": "ACCESS_CONTROL",
      "confidence": 0-100,
      "reasoning": "Brief explanation of why this function is vulnerable"
    }
  ]
}

If no vulnerabilities are found, return: {"hypotheses": []}`;

// ─────────────────────────────────────────────────────────────────────────────
// USER PROMPT TEMPLATE - The actual analysis request
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates the user prompt for code analysis
 * @param code - The Solidity source code to analyze
 * @returns Formatted user prompt string
 */
export function generateAnalysisPrompt(code: string): string {
    return `Analyze the following Solidity smart contract for ACCESS CONTROL vulnerabilities.

Identify functions that:
1. Can modify state or transfer funds
2. Are missing access control modifiers (onlyOwner, etc.)
3. Can be called by any external address

CONTRACT CODE:
\`\`\`solidity
${code}
\`\`\`

Remember: Output ONLY valid JSON. Focus on ACCESS CONTROL. Be specific about function names.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE VALIDATION SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that the AI response matches our expected schema
 * @param response - Parsed JSON response from AI
 * @returns boolean indicating if the response is valid
 */
export function validateAIResponse(response: unknown): response is AIResponseSchema {
    if (typeof response !== 'object' || response === null) {
        return false;
    }

    const obj = response as Record<string, unknown>;

    if (!Array.isArray(obj.hypotheses)) {
        return false;
    }

    for (const hypothesis of obj.hypotheses) {
        if (typeof hypothesis !== 'object' || hypothesis === null) {
            return false;
        }

        const h = hypothesis as Record<string, unknown>;

        if (typeof h.target !== 'string' || h.target.length === 0) {
            return false;
        }

        if (typeof h.vulnerabilityType !== 'string') {
            return false;
        }

        if (typeof h.confidence !== 'number' || h.confidence < 0 || h.confidence > 100) {
            return false;
        }

        if (typeof h.reasoning !== 'string') {
            return false;
        }
    }

    return true;
}

/**
 * The expected schema for AI responses
 */
export interface AIResponseSchema {
    hypotheses: Array<{
        target: string;
        vulnerabilityType: string;
        confidence: number;
        reasoning: string;
    }>;
}
