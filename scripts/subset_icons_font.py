#!/usr/bin/env python3
"""Subset the Material Symbols variable font (3.9MB) to only the ligature
names actually used by the app (PERFORMANCE.md item 8/10 — fonts + dead assets).

The woff2 keeps:
- the 'liga' layout feature (icon names still render as glyphs)
- FILL axis support (MSymbol filled variant)
- ASCII + digits (ligature components + numerals in badges)
Missing a name only risks that one icon showing as text — verified afterwards
with a browser sweep across all views (docs/TESTING flow).
"""
import glob, re, subprocess, os

ROOT = "/home/z/my-project"
SRC_FONT = f"{ROOT}/public/assets/fonts/5dbf3c8ebcb5.woff2"
OUT = f"{ROOT}/public/assets/fonts/material-symbols-subset.woff2"
CSS = f"{ROOT}/public/assets/fonts/material-symbols.css"

# ---- 1. collect candidate icon names from source ----
names = set()
for f in glob.glob(f"{ROOT}/src/**/*.ts*", recursive=True):
    txt = open(f, encoding="utf-8").read()
    names.update(re.findall(r'name="([a-z_0-9]+)"', txt))       # <MSymbol name="x">
    names.update(re.findall(r'name: "([a-z_0-9]+)"', txt))      # { name: "x" } maps
    names.update(re.findall(r': "([a-z_0-9]+)"', txt))          # value maps (navIcons etc.)
names.discard("")
names.update({"star", "favorite", "favorite_border"})  # runtime-toggled variants
names = sorted(names)
print(f"{len(names)} candidate icon names")

# ---- 2. subset (ligatures + fill axis + digits/latin kept) ----
text = "".join(sorted(set("".join(names)))) + "0123456789"
subprocess.run(
    [
        "pyftsubset", SRC_FONT,
        f"--output-file={OUT}",
        f"--text={text}",
        "--layout-features=liga,rvrn",
        "--flavor=woff2",
        "--unicodes=U+0020-007E",  # keep ASCII range glyphs for safety
        "--no-hinting",
        "--desubroutinize",
    ],
    check=True,
)
old, new = os.path.getsize(SRC_FONT), os.path.getsize(OUT)
print(f"subset: {old/1048576:.1f} MB -> {new/1024:.0f} KB ({100-100*new/old:.0f}% smaller)")

# ---- 3. point the CSS at the subset ----
txt = open(CSS, encoding="utf-8").read()
txt = txt.replace("5dbf3c8ebcb5.woff2", "material-symbols-subset.woff2")
open(CSS, "w", encoding="utf-8").write(txt)
print("material-symbols.css -> subset file")

# ---- 4. remove the giant original ----
os.remove(SRC_FONT)
print("original 3.9MB font removed (kept in git history)")
