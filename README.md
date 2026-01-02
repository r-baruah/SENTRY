# <img src="./public/logo.svg" height="46" alt="SENTRY"/>

![Next.js](https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=next.js&logoColor=white)
![Foundry](https://img.shields.io/badge/Foundry-1C1C1C?style=for-the-badge&logo=ethereum&logoColor=white)
![DeepSeek](https://img.shields.io/badge/AI-DeepSeek_v3.2-0D1117?style=for-the-badge&logo=openai&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-0D1117?style=for-the-badge&logo=typescript&logoColor=3178C6)

> **The Deterministic Verification Engine.**

---

## 1. THE PHILOSOPHY
### `PROBABILITY != TRUTH`

AI Auditors hallucinate. **SENTRY proves.**

We bridge the gap between **Stochastic AI (DeepSeek/LLMs)** and **Deterministic Execution (Foundry)**. Moving from "Probability" to "Cryptographic Truth".

| Feature | Standard AI Auditor | SENTRY |
| :--- | :--- | :--- |
| **Methodology** | Generative / Stochastic | **Verificational / Deterministic** |
| **Output** | Probability-based Reports | **Cryptographic Proofs (PoC)** |
| **False Positives** | High Noise | **Zero. False. Positives.** |
| **Execution** | Static Analysis | **Live Dynamic Execution** |

---

## 2. SYSTEM ARCHITECTURE

SENTRY solves **"Import Hell"** via a proprietary **Dependency Virtualization Layer** that mocks complex dependencies (OpenZeppelin) inside an ephemeral sandbox, enabling 300ms verification loops.

```txt
[ INPUT SOURCE ]
      |
      v
[ SANITIZER ] :: (Regex / Mocking Engine)
      |
      v
[ VIRTUALIZATION LAYER ] :: (Ephemeral Sandbox)
      |
      v
[ AI AGENT ] :: (DeepSeek v3.2 / Targeting)
      |
      v
[ FOUNDRY ENGINE ] :: (Fuzzing / Verification)
      |
      v
[ VERDICT ] :: (Pass / Fail)
```

**The Innovation:** 
The **Dependency Virtualization Layer** is the key technical feat. It prevents compilation errors by virtually mounting standard libraries (OpenZeppelin, Solmate) on-the-fly, creating a "perfect" build environment for the AI's generated exploits.

---

## 3. KEY FEATURES

### Targeting System
Uses **DeepSeek v3.2** to extract AST vectors and identify potential attack surfaces. It does *not* write reports; it generates attack hypotheses.

### The Kill Chain
Auto-generation of **Solidity Test Harnesses**. Inspired by Trail of Bits, SENTRY programmatically constructs executables to validate the AI's hypothesis.

### Ephemeral Sandboxing
Clean-room environment for every request. No shared state, no pollution.

---

## 4. TRACK FIT

### GenAI + Blockchain
**The Feedback Loop:** 
1. AI identifies the target. 
2. Blockchain verifies the truth. 
3. Zero hallucinations survive the chain.

### Ethereum Ecosystem
**Foundry Native:**
Built on the metal of the Ethereum standard. If it compiles in Foundry, it runs in SENTRY.

---

## 5. QUICK START

```bash
# 1. Clone
git clone https://github.com/your-username/sentry.git

# 2. Install
pnpm install

# 3. Install Foundry (CRITICAL)
foundryup

# 4. Burn
npm run dev
```

---

**SENTRY** // Deterministic Verification Engine.
