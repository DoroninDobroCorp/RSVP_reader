# PaceFlow visual system

## The non-negotiable character

Pico is a **hummingbird** and PaceFlow's focus pilot. The species is part of the product idea: Pico is fast, precise, hovers on one point, and moves in rhythm. Do not replace Pico with an otter, capybara, generic bird, or human figure.

Pico's recognisable anchors are:

- a large indigo/cobalt head and compact hummingbird body;
- cream face and belly, mint throat patch, and a single amber diamond focus point on the chest;
- a long narrow beak, one raised eyebrow, and a confident sideways look;
- a split bookmark-shaped tail and mint rhythm trail;
- editorial screen-print texture, heavy navy outlines, simplified geometry, and adult wit rather than children's-cartoon softness.

The voice is quick, dry, supportive, and a little cocky. Pico helps the reader keep momentum; Pico does not become an instructional lecturer or a decorative sticker unrelated to an action.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| Ink | `#101529` | outlines, typography, deepest background |
| Navy | `#17233f` | hero and Chrome extension surfaces |
| Cobalt | `#3156d8` | primary focus actions |
| Mint | `#75d3bd` | rhythm, progress, confirmation |
| Paper | `#f5eedf` | warm reading surface |
| Paper light | `#fffaf0` | inputs and lifted surfaces |
| Amber | `#f2ad4c` | focus point, numbered highlights |

Use two-pixel ink borders and small hard offset shadows to keep the interface graphic and tactile. Rounded shapes are welcome, but avoid turning every area into an unrelated floating pastel card. The home page should read as one path: promise → three-step rhythm → source dock → focus mode.

### Controlled overlap

Pico is allowed to break the grid. The hero tail crosses the hero border and rhythm strip; the Quick Send pose crosses its Chrome card on the right and bottom. These intersections create depth and tie adjacent sections together instead of leaving the character inside an isolated illustration box.

Overlap is compositional, never obstructive: interactive copy and controls stay in the higher readable layer, character images use `pointer-events: none`, mobile rhythm copy sits above the tail, and every supported viewport must retain zero horizontal overflow. Do not add overlap to every card—one strong boundary break per major scene is enough.

## Character usage

- `assets/brand/pico-hero.png` is the main home-page character.
- `assets/brand/pico-quick-send.png` illustrates sending an article or copied passage.
- `assets/brand/pico-mark-1024.png` is the canonical square app mark and source for generated size variants.
- `chrome-extension/assets/pico-quick-send.png` is the optimised popup illustration.
- `assets/icons/` and `chrome-extension/icons/` contain exact platform sizes derived from the canonical mark.

Do not mirror Pico casually: the eyebrow, focus point, beak direction, and rhythm trail form a consistent silhouette. Do not recolour the plumage per screen. Place Pico where the character explains motion or hierarchy, not as wallpaper. Decorative images use empty alt text because the same meaning is available in adjacent copy.

## Motion and accessibility

The hero may hover subtly and rhythm lines may drift, but all motion must stop under `prefers-reduced-motion: reduce`. Character images must never block text, controls, or keyboard focus. Mint, amber, and cobalt are fills or accents; readable body text remains ink on paper or paper on navy. Keep all touch targets at least 44 CSS pixels.

## Writing anchors

English hero: **Long reads. Zero drag.**

Russian hero: **Длинные тексты. Без пробуксовки.**

Pico's role label: **PICO · FOCUS PILOT** / **ПИКО · ПИЛОТ ФОКУСА**.

The Chrome extension is “Quick Send”: selected text, copied text, pasted text, the current article, or a link moves into the private local PaceFlow library and immediately opens focus mode.
