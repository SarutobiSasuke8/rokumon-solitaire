# Default deck pilot receipt

Date: 2026-11-02. Status: art-direction review; not approved or deployed.

## Created

- king-diamonds-pilot-illustration.png: original flattened illustration, 1060 x 1484 px, exact 5:7 aspect ratio, 4,556,914 bytes. Kept in docs/, outside public/ and dist/.
- deck-art-review.html: responsive local proof with separate HTML rank/suit overlays, 100/80/40/24 px samples, repeated-card overlap study and an index visibility toggle.
- DEFAULT_DECK_ART.md: production brief, editable-master contract, sequencing, runtime integration and promotion criteria.
- default-deck-art-manifest.json: 52 unique card IDs matching the engine, all 4 suit directions, 1 generated pilot, 51 planned faces and a planned uniform back.

## Generation provenance

Built-in OpenAI image generation. Original cache source:
C:/Users/sarut/.codex/generated_images/01a19c91-221a-7f62-b652-3f320432fff5/exec-98214dd1-8dba-494f-b5b2-bf72629a4b39.png

Brief: one original King of Diamonds illustration, portrait 5:7, full bleed, two-headed rotational court composition, banknote engraving and illuminated-manuscript detail; mature bearded king, gemstone crown, ceremonial sceptre, crimson/ivory brocade and gold filigree. Quiet ivory top-left and bottom-right corners. No generated letters, numbers, logos or watermark. Source target requested ideally 1600 x 2240; actual returned resolution was 1060 x 1484 and has not been upscaled.

No external artist image or commercial deck was used as a reference. This records the source method, not a legal clearance opinion.

## Validation

- PNG header dimensions and exact 5:7 ratio checked.
- JSON parsed; 52 unique IDs checked; exactly 1 face marked generated-review-pilot.
- Local browser proof loaded and visually inspected with full-size and 100/80/40/24 px samples. Index overlays revised to fit the corner area; smallest samples use larger relative indices.
- Index visibility toggle checked: labels disappear independently of art.
- Agent-document consistency check passed.
- No application source, engine, published package or production site changed. No game build required for this docs-only proof. This does not establish mobile-device or in-game acceptance.

## Pending and limits

GIMP 3.2 and its bridge plugin are installed, but gimp_status reported disconnected. Headless bridge launches timed out at 12 and 50 seconds; no GIMP editing succeeded. No XCF master or production WebP export exists. Recover the bridge and assemble a real master with named art, corner-well and editable index layers before calling the layered workflow complete.

The proof uses live HTML overlays; production must use the Canvas renderer and its actual font metrics. At 24 px, final rank/suit readability still needs device acceptance. Lower tableau exposure can hide the suit, so stack testing must include the compressed layout.

Next review milestone: settle the King direction, build its XCF master, then produce Queen and Jack of Diamonds using the same approved materials, linework and corner contract.
