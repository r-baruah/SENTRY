/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SENTRY - AI VULNERABILITY ANALYZER (Multi-Provider)
 * The Deterministic Verification Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This module handles multi-provider AI integration for vulnerability analysis.
 * Supports: OpenRouter (default/free), OpenAI, Google Gemini, and any OpenAI-compatible API
 * 
 * Philosophy:
 * - AI provides HYPOTHESES, not verdicts
 * - All responses are strictly typed
 * - Graceful error handling for API failures
 * - Provider-agnostic interface
 */

import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import {
    AnalysisRequest,
    AnalysisResponse,
    VulnerabilityHypothesis
} from '../types';
import {
    SYSTEM_PROMPT,
    generateAnalysisPrompt,
    validateAIResponse
} from './prompts';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/** Supported AI providers */
export type AIProvider = 'openrouter' | 'openai' | 'gemini';

/** Maximum tokens for response */
const MAX_TOKENS = 1024;

/** Temperature for response (lower = more deterministic) */
const TEMPERATURE = 0.1;

/** Timeout for API calls in milliseconds */
const API_TIMEOUT_MS = parseInt(process.env.ANALYSIS_TIMEOUT_MS || '30000', 10);

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface ProviderConfig {
    provider: AIProvider;
    apiKey?: string;
    model: string;
    fallbackModels?: string[];
    baseURL?: string;
}

/**
 * Gets the provider configuration from environment variables
 */
function getProviderConfig(): ProviderConfig {
    const rawProvider = process.env.AI_PROVIDER;
    console.log(`[SENTRY CONFIG] AI_PROVIDER env var is: '${rawProvider}'`);

    // Default to openrouter if not explicitly set to something else valid
    const provider = (rawProvider && ['openai', 'gemini'].includes(rawProvider))
        ? (rawProvider as AIProvider)
        : 'openrouter';

    switch (provider) {
        case 'openrouter': {
            // Support for comma-separated fallback models
            const modelsEnv = process.env.OPENROUTER_MODEL || 'moonshotai/kimi-k2';
            const models = modelsEnv.split(',').map(m => m.trim());
            return {
                provider: 'openrouter',
                apiKey: process.env.OPENROUTER_API_KEY || '',
                model: models[0], // Primary model
                fallbackModels: models.slice(1), // Backup models
                baseURL: 'https://openrouter.ai/api/v1'
            };
        }

        case 'openai':
            return {
                provider: 'openai',
                apiKey: process.env.OPENAI_API_KEY,
                model: process.env.OPENAI_MODEL || 'gpt-4o'
            };

        case 'gemini':
            return {
                provider: 'gemini',
                apiKey: process.env.GEMINI_API_KEY,
                model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
            };

        default:
            throw new Error(`[SENTRY AGENT] Unsupported AI provider: ${provider}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract interface for AI providers
 */
interface AIProviderInterface {
    analyze(sourceCode: string): Promise<AnalysisResponse>;
}

/**
 * Extracts JSON from potentially markdown-wrapped responses
 * Some models return ```json ... ``` format
 */
function extractJSON(content: string): string {
    // Try to extract JSON from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
        return jsonMatch[1].trim();
    }

    // Try to find raw JSON object
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        return objectMatch[0];
    }

    return content.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENROUTER PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

class OpenRouterProvider implements AIProviderInterface {
    private client: OpenAI;
    private model: string;
    private fallbackModels: string[];

    constructor(config: ProviderConfig) {
        this.model = config.model;
        this.fallbackModels = config.fallbackModels || [];
        this.client = new OpenAI({
            apiKey: config.apiKey || 'sk-or-v1-free',
            baseURL: config.baseURL,
            timeout: API_TIMEOUT_MS,
            defaultHeaders: {
                'HTTP-Referer': 'https://SENTRY.dev',
                'X-Title': 'SENTRY Vulnerability Analyzer'
            }
        });
    }

    async analyze(sourceCode: string): Promise<AnalysisResponse> {
        const modelsToTry = [this.model, ...this.fallbackModels];
        const userPrompt = generateAnalysisPrompt(sourceCode);

        for (let i = 0; i < modelsToTry.length; i++) {
            const currentModel = modelsToTry[i];
            const isLastModel = i === modelsToTry.length - 1;

            try {
                console.log(`[SENTRY AGENT] Using OpenRouter with model: ${currentModel}${i > 0 ? ' (fallback)' : ''}`);

                const completion = await this.client.chat.completions.create({
                    model: currentModel,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: MAX_TOKENS,
                    temperature: TEMPERATURE,
                });

                const content = completion.choices[0]?.message?.content;
                if (!content) {
                    if (isLastModel) {
                        return {
                            hypotheses: [],
                            success: false,
                            error: 'Empty response from OpenRouter API'
                        };
                    }
                    console.log(`[SENTRY AGENT] Empty response from ${currentModel}, trying next model...`);
                    continue;
                }

                console.log('[SENTRY AGENT] Raw AI response:\n', content.substring(0, 300));
                const result = this.parseResponse(content);

                // If parsing failed and we have more models, try the next one
                if (!result.success && !isLastModel) {
                    console.log(`[SENTRY AGENT] Parse failed for ${currentModel}, trying next model...`);
                    continue;
                }

                return result;
            } catch (error) {
                if (isLastModel) {
                    return this.handleError(error);
                }
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.log(`[SENTRY AGENT] ${currentModel} failed: ${errorMsg.substring(0, 100)}, trying next model...`);
            }
        }

        return {
            hypotheses: [],
            success: false,
            error: 'All models failed'
        };
    }

    private parseResponse(content: string): AnalysisResponse {
        try {
            console.log('[SENTRY AGENT] Raw response length:', content.length);
            const jsonContent = extractJSON(content);
            console.log('[SENTRY AGENT] Extracted JSON:', jsonContent.substring(0, 300));
            const parsed = JSON.parse(jsonContent);

            if (!validateAIResponse(parsed)) {
                console.error('[SENTRY AGENT] Schema validation failed. Received:', JSON.stringify(parsed, null, 2).substring(0, 500));
                return {
                    hypotheses: [],
                    success: false,
                    error: 'Response does not match expected schema'
                };
            }

            const hypotheses: VulnerabilityHypothesis[] = parsed.hypotheses.map(h => ({
                target: h.target,
                vulnerabilityType: mapVulnerabilityType(h.vulnerabilityType),
                confidence: h.confidence,
                reasoning: h.reasoning
            }));

            return { hypotheses, success: true };
        } catch (parseError) {
            return {
                hypotheses: [],
                success: false,
                error: `Invalid JSON response: ${content.substring(0, 200)}`
            };
        }
    }

    private handleError(error: unknown): AnalysisResponse {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SENTRY AGENT] OpenRouter analysis failed:', errorMessage);
        return {
            hypotheses: [],
            success: false,
            error: errorMessage
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

class OpenAIProvider implements AIProviderInterface {
    private client: OpenAI;
    private model: string;

    constructor(config: ProviderConfig) {
        if (!config.apiKey) {
            throw new Error(
                '[SENTRY AGENT] OPENAI_API_KEY not found in environment variables.\n' +
                'Set it with: export OPENAI_API_KEY="your-key-here"'
            );
        }

        this.model = config.model;
        this.client = new OpenAI({
            apiKey: config.apiKey,
            timeout: API_TIMEOUT_MS,
        });
    }

    async analyze(sourceCode: string): Promise<AnalysisResponse> {
        try {
            const userPrompt = generateAnalysisPrompt(sourceCode);

            console.log(`[SENTRY AGENT] Using OpenAI with model: ${this.model}`);

            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                max_tokens: MAX_TOKENS,
                temperature: TEMPERATURE,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                return {
                    hypotheses: [],
                    success: false,
                    error: 'Empty response from OpenAI API'
                };
            }

            return this.parseResponse(content);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private parseResponse(content: string): AnalysisResponse {
        try {
            const parsed = JSON.parse(content);

            if (!validateAIResponse(parsed)) {
                return {
                    hypotheses: [],
                    success: false,
                    error: 'Response does not match expected schema'
                };
            }

            const hypotheses: VulnerabilityHypothesis[] = parsed.hypotheses.map(h => ({
                target: h.target,
                vulnerabilityType: mapVulnerabilityType(h.vulnerabilityType),
                confidence: h.confidence,
                reasoning: h.reasoning
            }));

            return { hypotheses, success: true };
        } catch (parseError) {
            return {
                hypotheses: [],
                success: false,
                error: `Invalid JSON response: ${content.substring(0, 200)}`
            };
        }
    }

    private handleError(error: unknown): AnalysisResponse {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SENTRY AGENT] OpenAI analysis failed:', errorMessage);
        return {
            hypotheses: [],
            success: false,
            error: errorMessage
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE GEMINI PROVIDER (New SDK)
// ─────────────────────────────────────────────────────────────────────────────

class GeminiProvider implements AIProviderInterface {
    private client: GoogleGenAI;
    private model: string;

    constructor(config: ProviderConfig) {
        if (!config.apiKey) {
            throw new Error(
                '[SENTRY AGENT] GEMINI_API_KEY not found in environment variables.\n' +
                'Set it with: export GEMINI_API_KEY="your-key-here"'
            );
        }

        this.model = config.model;
        this.client = new GoogleGenAI({ apiKey: config.apiKey });
    }

    async analyze(sourceCode: string): Promise<AnalysisResponse> {
        try {
            const userPrompt = generateAnalysisPrompt(sourceCode);

            console.log(`[SENTRY AGENT] Using Google Gemini with model: ${this.model}`);

            const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

            const response = await this.client.models.generateContent({
                model: this.model,
                contents: [{
                    role: 'user',
                    parts: [{ text: fullPrompt }]
                }],
                config: {
                    temperature: TEMPERATURE,
                    maxOutputTokens: MAX_TOKENS,
                }
            });

            const content = response.text;

            if (!content) {
                return {
                    hypotheses: [],
                    success: false,
                    error: 'Empty response from Gemini API'
                };
            }

            console.log('[SENTRY AGENT] Raw Gemini response:\n', content.substring(0, 500));
            return this.parseResponse(content);
        } catch (error) {
            return this.handleError(error);
        }
    }

    private parseResponse(content: string): AnalysisResponse {
        try {
            const jsonContent = extractJSON(content);
            const parsed = JSON.parse(jsonContent);

            if (!validateAIResponse(parsed)) {
                console.error('[SENTRY AGENT] Schema validation failed:', JSON.stringify(parsed, null, 2).substring(0, 500));
                return {
                    hypotheses: [],
                    success: false,
                    error: 'Response does not match expected schema'
                };
            }

            const hypotheses: VulnerabilityHypothesis[] = parsed.hypotheses.map(h => ({
                target: h.target,
                vulnerabilityType: mapVulnerabilityType(h.vulnerabilityType),
                confidence: h.confidence,
                reasoning: h.reasoning
            }));

            return { hypotheses, success: true };
        } catch (parseError) {
            return {
                hypotheses: [],
                success: false,
                error: `Invalid JSON response: ${content.substring(0, 200)}`
            };
        }
    }

    private handleError(error: unknown): AnalysisResponse {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SENTRY AGENT] Gemini analysis failed:', errorMessage);
        return {
            hypotheses: [],
            success: false,
            error: errorMessage
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates the appropriate AI provider based on configuration
 */
function createProvider(): AIProviderInterface {
    const config = getProviderConfig();

    console.log(`[SENTRY AGENT] Initializing ${config.provider.toUpperCase()} provider`);

    switch (config.provider) {
        case 'openrouter':
            return new OpenRouterProvider(config);
        case 'openai':
            return new OpenAIProvider(config);
        case 'gemini':
            return new GeminiProvider(config);
        default:
            throw new Error(`[SENTRY AGENT] Unsupported provider: ${config.provider}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYSIS FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes Solidity code for Access Control vulnerabilities using configured AI provider
 * 
 * @param request - The analysis request containing source code
 * @returns AnalysisResponse with vulnerability hypotheses
 * 
 * @example
 * ```typescript
 * const response = await analyzeContract({
 *   sourceCode: `
 *     contract Vault {
 *       function withdraw(uint256 amount) external {
 *         // Missing onlyOwner!
 *         payable(msg.sender).transfer(amount);
 *       }
 *     }
 *   `
 * });
 * 
 * console.log(response.hypotheses);
 * // [{ target: "withdraw", vulnerabilityType: "ACCESS_CONTROL", ... }]
 * ```
 */
export async function analyzeContract(
    request: AnalysisRequest
): Promise<AnalysisResponse> {
    const startTime = Date.now();

    console.log('[SENTRY AGENT] Starting vulnerability analysis...');
    console.log(`[SENTRY AGENT] Code length: ${request.sourceCode.length} characters`);

    try {
        const provider = createProvider();
        const result = await provider.analyze(request.sourceCode);

        const durationMs = Date.now() - startTime;
        console.log(`[SENTRY AGENT] Analysis complete in ${durationMs}ms`);

        if (result.success && result.hypotheses.length > 0) {
            console.log(`[SENTRY AGENT] Found ${result.hypotheses.length} potential vulnerabilities`);
            result.hypotheses.forEach((h, i) => {
                console.log(`  [${i + 1}] ${h.target} (${h.confidence}% confidence)`);
            });
        }

        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[SENTRY AGENT] Analysis failed:', errorMessage);

        return {
            hypotheses: [],
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Maps AI vulnerability type string to our enum
 */
function mapVulnerabilityType(
    type: string
): VulnerabilityHypothesis['vulnerabilityType'] {
    const normalized = type.toUpperCase().replace(/[^A-Z]/g, '_');

    switch (normalized) {
        case 'ACCESS_CONTROL':
        case 'ACCESSCONTROL':
        case 'MISSING_ACCESS_CONTROL':
            return 'ACCESS_CONTROL';
        case 'REENTRANCY':
            return 'REENTRANCY';
        case 'OVERFLOW':
        case 'UNDERFLOW':
        case 'INTEGER_OVERFLOW':
            return 'OVERFLOW';
        default:
            return 'OTHER';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets a formatted summary of the analysis results
 * 
 * @param response - The analysis response
 * @returns Human-readable summary string
 */
export function getAnalysisSummary(response: AnalysisResponse): string {
    const config = getProviderConfig();
    const lines: string[] = [
        '═══════════════════════════════════════════════════════════════════════════',
        '  SENTRY AI HYPOTHESIS REPORT',
        '═══════════════════════════════════════════════════════════════════════════',
        '',
        `  Provider: ${config.provider.toUpperCase()} (${config.model})`,
        `  Status: ${response.success ? '✓ ANALYSIS COMPLETE' : '✗ ANALYSIS FAILED'}`,
    ];

    if (response.error) {
        lines.push(`  Error: ${response.error}`);
    }

    lines.push(`  Hypotheses Found: ${response.hypotheses.length}`);
    lines.push('');

    if (response.hypotheses.length > 0) {
        lines.push('  POTENTIAL VULNERABILITIES:');
        lines.push('─────────────────────────────────────────────────────────────────────────────');

        response.hypotheses.forEach((h, i) => {
            lines.push(`  [${i + 1}] Target Function: ${h.target}`);
            lines.push(`      Type: ${h.vulnerabilityType}`);
            lines.push(`      Confidence: ${h.confidence}%`);
            lines.push(`      Reasoning: ${h.reasoning}`);
            lines.push('');
        });
    } else {
        lines.push('  No vulnerabilities detected by AI analysis.');
        lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Checks if API key is configured for the selected provider
 * @returns boolean indicating if API key is present (if required)
 */
export function isAPIKeyConfigured(): boolean {
    const config = getProviderConfig();

    switch (config.provider) {
        case 'openrouter':
            // OpenRouter can work with free models without API key
            return true;
        case 'openai':
            return !!process.env.OPENAI_API_KEY;
        case 'gemini':
            return !!process.env.GEMINI_API_KEY;
        default:
            return false;
    }
}

/**
 * Gets the current provider configuration info
 * @returns Provider configuration summary
 */
export function getProviderInfo(): { provider: string; model: string; requiresKey: boolean } {
    const config = getProviderConfig();
    return {
        provider: config.provider,
        model: config.model,
        requiresKey: config.provider !== 'openrouter' || !config.model.includes(':free')
    };
}

