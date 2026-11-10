# Architecture Overview

```
src/
├── main.ts                # Application bootstrapper
├── style.css              # Theme CSS tokens, Glassmorphism UI, Responsive layout
├── engine/
│   ├── Card.ts            # Card model definition
│   ├── Deck.ts            # 52-card deck & Fisher-Yates shuffle
│   ├── SolitaireEngine.ts # Game state machine & Klondike rules engine
│   └── SoundSynth.ts      # Web Audio API audio synthesizer
├── gfx/
│   ├── CardRenderer.ts    # Vector & Canvas card graphics generator
│   └── WinAnimation.ts    # Bouncing card cascade physics particle renderer
└── ui/
    └── SolitaireUI.ts     # Touch/Mouse controller, layout geometry & main canvas manager
```
