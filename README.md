# My portfolio

One page: a hello, five projects on a timeline you can swipe through, and a way
to reach me.

**Live:** https://ananya-build.github.io/portfolio/

## How it's put together

No framework, no build step, nothing to install. Open `index.html` and it runs.

```
index.html        every word on the site. The five projects are plain HTML
                  rather than data in a config file — I'd rather edit prose
css/styles.css    the palette, the glass panes, and all the scene animations
js/water.js       the moving light on the background
js/main.js        the timeline, plus everything that reveals on scroll
assets/           my headshot at two sizes, and the favicon
```

To run it locally:

```bash
python3 -m http.server 8000
```

Opening the file directly mostly works, but a server behaves like the real thing.

## Deploying

```bash
./scripts/bump-assets.sh    # only if I touched css/ or js/
git add -A && git commit -m "..." && git push
```

GitHub Pages stamps `Cache-Control: max-age=600` on every file and won't let you
change it, so for ten minutes a browser just reuses whatever it already has. The
version of that which actually hurts is fresh HTML sitting on top of an old
stylesheet — the page loads, it just looks wrong. `bump-assets.sh` puts a version
on the CSS and JS URLs so new markup can't pair with stale assets. The HTML is
cached either way, so ⌘⇧R when I want to see a change immediately.

## Why it looks like this

The palette came out of a moodboard I'd been collecting, which turned out to be
all deep water: near-black navy (`#050A18`), bioluminescent cyan (`#5FDCEC`),
electric blue (`#2E6FE0`), iridescent slate.

**The background is a caustics field.** It's computed on a canvas about 300px
wide and then drawn up to full size through a blur, which costs roughly 20,000
pixel writes a frame instead of two million. Straight sine waves came out looking
like a woven net rather than water; warping the sample point by a second, slower
field is what breaks the cells into irregular sizes. It stops when the tab is
hidden and doesn't run at all under `prefers-reduced-motion`.

**The panes get their edge from a masked gradient border**, not a flat
translucent fill. That thin specular line along the top-left is most of the
reason they read as glass instead of gray boxes.

**Type** is Instrument Serif for headings against Inter for everything else.

**Every graphic is hand-drawn SVG.** Nothing traced, nothing lifted from anyone.
The anomaly-detection diagram is a simplified redraw of my own figure. The
LinkedIn card uses a generic profile glyph rather than LinkedIn's actual mark,
since that's their artwork and not mine to ship.

**Awards live in their own bordered callouts** so they don't vanish into body
text, and one phrase per project gets a highlighter wash — whatever that piece of
work actually is.

## The timeline scrolling — read this before changing it

Two things here are easy to undo by accident.

**Don't intercept vertical scroll.** An early version mapped wheel `deltaY` onto
the rail so a mouse could drive the timeline. The page opens on my newest
project, which sits at the far right, so scrolling *up* rewound the entire
timeline before the page would budge, while scrolling down let go immediately. It
felt broken because it was. The page owns vertical scrolling now.

**Scroll-snap is off for mouse and trackpad, on for touch.** Chrome reverts each
discrete wheel delta back to the nearest snap point, so with snapping enabled a
mouse wheel can't move the rail at all — it springs straight back. Touch keeps
CSS snapping, where a momentum swipe clears the threshold easily and snapping is
what you'd expect. Everywhere else, `scheduleSettle()` in `main.js` lines up the
nearest pane 180ms after scrolling stops, with a `programmatic` flag so it never
fights an animation already in flight.

## Accessibility

The keyboard path works end to end: skip link, visible focus, and ←/→/Home/End on
the timeline. Every scene carries an `aria-label` describing what it shows.
`prefers-reduced-motion` turns off the water, the drift and the animations, and
drops each graphic straight to its finished state.

## An SVG trap worth knowing about

A CSS keyframe that animates `transform` overrides an SVG element's
`transform="translate(...)"` attribute. The moment the animation lands on
`transform:none`, the element snaps to the top-left corner of the drawing — so a
graphic looks correct until it finishes animating, then falls apart. Positioning
belongs on a wrapper `<g>`, with the animation on a child inside it.

`scripts/check-svg-transforms.py` catches it: it reads the keyframes that move
things, works out which elements those animations apply to, and flags any that
also carry a positioning attribute.

```bash
python3 scripts/check-svg-transforms.py
```

## Adding a project

Each one is a single `<article class="pane">`.

1. Copy an existing article, give it a new `id` and `data-hue`.
2. Add an `<li>` to `#railNodes` with the next `data-go` index.
3. Stat tiles are `.stat`, bullet points are `.notes`.

The rail, the progress bar and the arrows all count the panes at runtime, so
nothing else needs touching.
