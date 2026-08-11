# Asset provenance

The editable HummingRead SVG assets in `assets/brand/` were created inside this
repository during the 2026-08-11 integration work as code-native brand
explorations. The repository history and `design-tokens.json` are their
available source record; no external stock source or third-party logo is
identified for those SVG files.

The earlier raster Pico exploration (`pico-hero.png`, `pico-quick-send.png`, and
`pico-mark-1024.png`) was already present at the R2 starting checkpoint
`89efb7d`, and the owner selected that visual direction. However, the
repository does not contain a verifiable original prompt/source file, creation
tool record, creator identity, creation date, or third-party license for those
three retained PNGs. Owner selection is not copyright provenance. Their legal
right to ship therefore remains an explicit owner/legal release gate; this
document does not infer ownership.

The responsive `pico-hero-640.webp` and `pico-quick-send-640.webp` files are
deterministic web delivery derivatives of the retained high-resolution PNGs.
The 440×280 Chrome small-promo and 1400×560 marquee PNGs are deterministic
exports of their editable SVG masters. The repository's
`scripts/generate-raster-assets.mjs` uses locked Sharp `0.35.3` to produce
these outputs; regenerate them with `npm run assets:generate` and do not
hand-edit the derivatives. This reproducible transformation records how the
derivatives were made, but does not cure the unknown provenance of their raster
inputs.

No remote font file or generated remote code is embedded. The wordmark uses
platform font fallbacks, so production exports must be inspected on the build
machine before store submission.
