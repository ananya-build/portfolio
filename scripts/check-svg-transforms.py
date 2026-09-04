#!/usr/bin/env python3
"""Catch SVG transform attributes that a CSS animation would clobber.

A CSS keyframe that animates `transform` overrides an SVG element's
`transform="translate(...)"` presentation attribute. The moment the animation
lands on `transform:none` or a bare `scale()`, the element snaps to the origin
— usually the top-left corner of the drawing. Positioning has to live on a
wrapper <g>, with the animation on a child.

This flags any element that carries BOTH a transform attribute and a class
that CSS animates transform on directly (not via a descendant selector).
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
css  = (root / "css/styles.css").read_text()
html = (root / "index.html").read_text()

# keyframes that actually move things
moving = {m.group(1) for m in re.finditer(r'@keyframes\s+([\w-]+)\s*\{(.*?)\n\}', css, re.S)
          if 'transform' in m.group(2)}

# selectors whose own element gets one of those animations
suspect = set()
for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
    sel, body = m.group(1).strip(), m.group(2)
    if '@' in sel or 'animation' not in body:
        continue
    if not any(re.search(r'animation(-name)?\s*:[^;]*\b%s\b' % re.escape(n), body) for n in moving):
        continue
    for one in sel.split(','):
        last = one.strip().split()[-1]                 # the element actually animated
        for cls in re.findall(r'\.([\w-]+)', last):
            suspect.add(cls)

bad = []
for cls in sorted(suspect):
    for el in re.finditer(r'<(\w+)([^>]*\bclass="[^"]*\b%s\b[^"]*"[^>]*)>' % re.escape(cls), html):
        if re.search(r'\btransform="', el.group(2)):
            bad.append((cls, el.group(0)[:90]))

if bad:
    print("SVG transform conflicts — move the positioning onto a wrapper <g>:\n")
    for cls, snippet in bad:
        print("  .%-14s %s" % (cls, snippet))
    sys.exit(1)

print("ok — %d animated classes checked, none clobber a transform attribute" % len(suspect))
