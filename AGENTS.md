# AGENTS.md - Canonical Agent Contract

This is the source of truth for all AI coding agents working in this repository.

Every model-specific instruction file must stay aligned with this contract:

- `CLAUDE.md`
- `CODEX.md`
- `GEMINI.md`

When this file changes, update the adapters and run:

```powershell
./scripts/check-agent-docs.ps1
```

## Project Identity

- Project name: `Rokumon Solitaire`
- Project type: `Browser & Mobile HTML5 Canvas Web Game`
- Primary user: `Casual & Solitaire Enthusiast Players (Desktop & Mobile)`
- Current stage: `active build`
- Product owner persona: `personas/head-of-product-vibe-coding.md`
- Technical owner persona: `personas/cto-vibe-coding.md`
- Persona council protocol: `personas/agent-council-protocol.md`

## Product Goal

A complete, responsive, highly polished Klondike Solitaire browser and mobile game featuring buttery smooth drag-and-drop mechanics, single/double tap auto-moves, customizable themes, Web Audio sound effects, hint system, undo/redo, auto-complete solver sweep, and the classic bouncing card victory animation.

## Non-Negotiable Standard

The project must be useful, reliable, fast-loading (60fps), and vibe-true.

Protect the playfield at all times across screen sizes (portrait & landscape). Input must feel instantaneous with zero perceptible lag.

## Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Verify project docs & drift
powershell -ExecutionPolicy Bypass -File ./scripts/check-agent-docs.ps1
```

## Verification Policy

Before finishing a code change, run verification:
- `npm run build` type-checking and bundling.
- Manual smoke test for UI & Touch interactions.
- `powershell -ExecutionPolicy Bypass -File ./scripts/check-agent-docs.ps1`.
