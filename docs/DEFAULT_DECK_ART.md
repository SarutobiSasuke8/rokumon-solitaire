# Classic default deck

Updated 2026-11-02 following Alexei's correction and attached King of Hearts reference.

## Direction

Actual traditional playing cards. White faces, red and black indices/pips, mirrored English-pattern court illustrations in flat red, blue, yellow and black. All 12 nobles get proper conventional figures. Number cards use ordinary pip arrangements; aces remain standard. The earlier full-bleed engraved fantasy direction is rejected.

A complete default deck means 52 standard faces and a consistent back. Future premium decks may offer optional alternative styles. They do not determine the default design.

## Artwork and editing

Use Adrian Kennard's classic SVG playing cards from https://www.me.uk/cards/ . The creator releases the designs under CC0: https://creativecommons.org/publicdomain/zero/1.0/ . The source page describes their basis in historical Goodall & Son designs.

The selected generator settings are box=on and ace=Plain; plain=on must NOT be set because that removes the illustrated courts. Source ZIP is classic-playing-cards-source.zip in this docs directory. 52 face SVGs are imported into the existing public directory as classic-AH.svg through classic-KS.svg. Ten uses T in source filenames. Existing procedural card backs remain available.

SVG is the editable master format for this classic artwork. Edit paths and colours in a vector editor when customisation is needed. GIMP/XCF and AI-generated paintings are unnecessary for the standard deck. Retain the source ZIP and provenance. No new workspace or folder structure was created.

## Local implementation

CardRenderer loads all 52 SVG faces and activates them together; failures retain procedural rendering. The existing Canvas cache, responsive dimensions and victory animation reuse the renderer. SolitaireUI requests loading and redraws when ready. The art review page uses the same CardRenderer, rather than an unrelated mockup.

The included deck requires no purchase. Storefront, pricing, entitlements and premium artwork remain future work. No hub package sync or deployment is included.

## Review

Open deck-art-review.html through the local Vite server for the 3 heart courts, all 12 nobles, gameplay sizes and the full 52-card contact sheet. Use the local game to check stock, moves, undo, small screens and card-back settings.

The earlier generated PNG is retained only as an unselected draft. It is not in public/, the current review page or the game's asset list.

