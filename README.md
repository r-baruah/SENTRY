# �️ SENTRY

**The Deterministic Smart Contract Vulnerability Prover**

SENTRY is an AI-powered security tool that identifies and **cryptographically proves** vulnerabilities in Solidity smart contracts using Foundry's formal verification.

![SENTRY Pipeline](https://img.shields.io/badge/Status-Beta-yellow)
![License](https://img.shields.io/badge/License-MIT-blue)
![Solidity](https://img.shields.io/badge/Solidity-^0.8.0-363636)

---

## 🎯 What SENTRY Does

Unlike traditional static analyzers that produce false positives, SENTRY follows a **Hypothesis → Verification** model:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Sanitize   │───▶│   Compile   │───▶│  AI Analyze │───▶│   Verify    │
│  Imports    │    │   (Forge)   │    │  (Kimi K2)  │    │  (Foundry)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                              │                  │
                                              ▼                  ▼
                                        AI Hypothesis      PROOF or
                                       "withdraw() is     FALSE POSITIVE
                                        vulnerable"
```

**Key Principle:** The AI provides *hypotheses*, but only cryptographic proof (via Foundry exploit tests) determines the final verdict.

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** 18+
- **Foundry** (for verification): `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **OpenRouter API Key** (free tier available): [Get one here](https://openrouter.ai/keys)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/sentry.git
cd sentry

# Install dependencies
npm install

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your OpenRouter API key

# Start the server
npm run dev
```

### Usage

Send a POST request to analyze a contract:

```bash
curl -X POST http://localhost:3005/audit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Vault {\n    function withdraw(uint256 amount) external {\n        payable(msg.sender).transfer(amount);\n    }\n}"
  }'
```

---

## 🏗️ Architecture

```
sentry/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── agent/     # AI analysis (multi-provider)
│   │   │   ├── analyzer.ts   # Provider abstraction
│   │   │   └── prompts.ts    # Prompt engineering
│   │   ├── engine/    # Verification engine
│   │   │   ├── compiler.ts   # Foundry wrapper
│   │   │   ├── sanitizer.ts  # Import remapping
│   │   │   └── verifier.ts   # Exploit injection
│   │   └── index.ts   # API endpoints
│   └── templates/     # Solidity test harnesses
├── frontend/          # Next.js dashboard
├── contracts/         # Sample vulnerable contracts
└── workspace/         # Foundry runtime workspace
```

---

## 🤖 Multi-Provider AI Support

SENTRY supports multiple AI providers with automatic fallback:

| Provider | Models | Cost |
|----------|--------|------|
| **OpenRouter** (default) | Kimi K2, DeepSeek v3.2, GLM-4.5 | Free tier |
| **OpenAI** | GPT-4o, GPT-4-turbo | Paid |
| **Google Gemini** | Gemini 2.5 Pro/Flash | Paid |

### Model Fallback Chain

```bash
# In .env - comma-separated fallback list
OPENROUTER_MODEL=moonshotai/kimi-k2,deepseek/deepseek-v3.2-speciale
```

If the primary model fails (rate limit, error), SENTRY automatically tries the next model in the chain.

---

## 🔍 Vulnerability Detection

Currently focused on **Access Control** vulnerabilities:

- Missing `onlyOwner` modifiers
- Unauthorized fund withdrawal
- Unprotected state-changing functions
- Missing role-based access control

### Example Detection

```solidity
contract Vault {
    // ❌ VULNERABLE: Anyone can drain funds!
    function withdraw(uint256 amount) external {
        payable(msg.sender).transfer(amount);
    }
}
```

SENTRY will:
1. **Detect** the missing access control
2. **Generate** an exploit test
3. **Prove** the vulnerability via Foundry

---

## 🛣️ Roadmap

- [x] Multi-provider AI support (OpenRouter, OpenAI, Gemini)
- [x] Model fallback chain
- [x] Access Control vulnerability detection
- [ ] Reentrancy detection
- [ ] Integer overflow/underflow detection
- [ ] Flash loan attack detection
- [ ] Multi-contract analysis
- [ ] GitHub Actions integration

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---

<p align="center">
  <strong>Built with �️ for the DeFi security community</strong>
</p>
