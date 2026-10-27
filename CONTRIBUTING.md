# Contributing to Solstice (至日)

> *"Treat every line of code, like every career path, as an evolving work of art."*

We are delighted by your interest in elevating **Solstice (至日)**. Whether you are expanding the Knowledge Graph (KG) with frontier competency nodes, enriching our RAG benchmark databases, or refining the celestial canvas UI, we welcome your craftsmanship.

---

## 🎨 Development Principles

1. **The Canvas Principle**: Avoid mechanical checklist implementations. Ensure every feature empowers the user's agency and narrative dignity.
2. **Graph-RAG Rigor**: Knowledge Graph edges must have clear domain rationales (`weight`, `coupling strength`, and `rationale`).
3. **Type Sovereignty**: Strict TypeScript everywhere. No `any` escapes without explicit architectural justification.
4. **Celestial Aesthetics**: Adhere to the Solstice design palette (`#0B0F19`, `#111726`, `#D4AF37`, `#38BDF8`).

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/Moon-Meld/Solstice.git
cd Solstice

# Install dependencies
npm install

# Start local development server
npm run dev

# Run strict type checking and production build
npm run build
```

---

## 🌿 Submitting Pull Requests

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/your-artisan-feature
   ```
2. Verify build integrity:
   ```bash
   npm run build
   ```
3. Commit with semantic clarity:
   ```bash
   git commit -m "feat(constellation): add multi-hop bridge for Triton CUDA kernels"
   ```
4. Open a Pull Request with a clear description and screenshot if UI changes are included.
