# Classic deck source and implementation receipt

2026-11-02. This replaces the selected direction in the earlier pilot receipt.

User correction: traditional playing cards, matching the attached flat-colour King of Hearts. Rejected draft: full-bleed crimson/gold engraved King.

Source: Adrian Kennard, https://www.me.uk/cards/
Licence declared by creator: CC0, https://creativecommons.org/publicdomain/zero/1.0/
Download: https://www.me.uk/cards/makeadeck.cgi?box=on&ace=Plain&zip=1
Downloaded original: docs/classic-playing-cards-source.zip

52 standard SVG faces extracted to existing public/ with classic- prefix. Jokers and backs from the archive are not imported. No remote runtime dependency; no AI-generated court illustration is used.

Local changes: complete classic face loader in CardRenderer; redraw after loading in SolitaireUI; replacement art review page; corrected deck brief and inventory; source credit in CREDITS.md.

Earlier PNG and earlier receipt remain historical drafts. No GIMP master is required for the current SVG approach. Game rules, statistics, music and existing card-back settings are unaffected by this art change. Deployment remains separate.


## Validation and local adaptations

- Reproducible importer: scripts/import-classic-deck.py. All 52 SVGs parsed as XML and all inventory IDs were checked as unique.
- Kept conventional white grounds on aces and pip cards by omitting their optional inset boxes; retained framed court illustrations. Removed the printed source URL text on the Ace of Spades; source attribution remains in CREDITS.md. Original ZIP is unchanged.
- Total original extracted face size before normalisation: 583,856 bytes.
- Production build/typecheck and agent-doc check passed. Vite reports existing font-path resolution warnings; font configuration was not changed in this work.
- Browser screenshot inspection confirmed traditional court artwork and correct plain white number faces in the actual game. Stock draw changed moves from 0 to 1; Undo restored 0; Redo restored 1.
- Actual-device touch acceptance and a natural completed match were not performed.
