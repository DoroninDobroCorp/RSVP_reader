# Asset provenance

The HummingRead vector assets in `assets/brand/` were authored specifically for
this repository on 2026-08-11 as editable SVG/code-native artwork. They do not
copy a named artist, app, mascot, or third-party mark. The palette and shape
language are documented in `design-tokens.json`.

The earlier raster Pico exploration (`pico-hero.png`, `pico-quick-send.png`, and
`pico-mark-1024.png`) remains in the integration line because the owner selected
that direction. The editable vector master, pose sheet, icon master, horizontal
wordmark, monochrome mark, and social-card master are now the maintained source
assets. Raster exports are generated locally from those masters and checked for
dimensions/alpha where their destination requires it.

The responsive `pico-hero-640.webp` and `pico-quick-send-640.webp` files are
deterministic web delivery derivatives of the retained high-resolution PNGs.
The 440×280 Chrome small-promo and 1400×560 marquee PNGs are deterministic
exports of their editable SVG masters. Regenerate all four exports with
`npm run assets:generate`; do not hand-edit the derivatives.

No stock imagery, remote font file, generated remote code, or third-party logo is
embedded. The wordmark uses platform font fallbacks, so production exports must
be inspected on the build machine before store submission.
