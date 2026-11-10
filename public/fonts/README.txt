Fonts for Solitaire, self-hosted so the game makes no request to Google Fonts
at runtime. Both are licensed under the SIL Open Font License 1.1 (OFL), which
permits bundling and redistribution. The full licence for each sits in this
folder.

outfit-latin.woff2
  Font:     Outfit (variable, wght axis), by Smartsheet Inc and Rodrigo Fuenzalida
  Source:   Google Fonts, the latin subset served for the stylesheet the game
            used to load:
            https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap
            -> https://fonts.gstatic.com/s/outfit/v15/QGYvz_MVcBeNP4NJtEtq.woff2
  SHA-256:  6c18d579fd87c3776be068b762cbc83fde3acb543d49eabd3ade842eb987e887
  Licence:  OFL 1.1, Outfit-OFL.txt
            (google/fonts repository, ofl/outfit/OFL.txt at commit
            bd8f81ddb5c74d5c8897b36ad88b440266245103)
  Upstream: https://github.com/Outfitio/Outfit-Fonts

space-grotesk-latin.woff2
  Font:     Space Grotesk (variable, wght axis), by Florian Karsten
  Source:   Google Fonts, the latin subset served for the stylesheet the game
            used to load:
            https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap
            -> https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2
  SHA-256:  0640890476fc1198ab4de571fb658de443c4d85b66466ec09534a8737ab1ce9d
  Licence:  OFL 1.1, SpaceGrotesk-OFL.txt
            (google/fonts repository, ofl/spacegrotesk/OFL.txt at commit
            bd8f81ddb5c74d5c8897b36ad88b440266245103)
  Upstream: https://github.com/floriankarsten/space-grotesk

Both files are byte-for-byte what Google Fonts served on 2026-10-09, so the
game looks the same as it did with the Google stylesheet. Neither licence
declares a Reserved Font Name, so the latin subset may keep its name. Only the
latin subset is shipped: it is the only one the browser downloaded for this
page. Characters outside it fall back to the system font.

The @font-face rules are in index.html.
