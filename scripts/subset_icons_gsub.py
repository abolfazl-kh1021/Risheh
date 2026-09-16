#!/usr/bin/env python3
"""Build name->glyph mapping from the Material Symbols GSUB ligature table,
then subset to exactly the glyphs the app needs (plus ASCII + digits)."""
from fontTools.ttLib import TTFont
from fontTools import subset
import glob, re, os

SRC = "/tmp/msymbols.woff2"
OUT = "public/assets/fonts/material-symbols-subset.woff2"

font = TTFont(SRC)

# ---- walk GSUB for ligature substitutions (components -> ligature glyph) ----
ligas = {}  # tuple(component glyph names) -> ligature glyph name
gsub = font["GSUB"].table
for lookup in gsub.LookupList.Lookup:
    if lookup.LookupType == 4:  # LigatureSubst
        for st in lookup.SubTable:
            for first, ligs in st.ligatures.items():
                for lig in ligs:
                    comps = (first,) + tuple(lig.Component)
                    ligas[comps] = lig.LigGlyph
    elif lookup.LookupType == 7:  # Extension
        st = lookup.SubTable[0].ext_sub_table if hasattr(lookup.SubTable[0], "ext_sub_table") else None
        if st is not None and st.LookupType == 4:
            for stl in st.SubTable:
                for first, ligs in stl.ligatures.items():
                    for lig in ligs:
                        comps = (first,) + tuple(lig.Component)
                        ligas[comps] = lig.LigGlyph

print(f"found {len(ligas)} ligatures in font")

# glyph name -> unicode (to map components back to letters)
cmap = font.getBestCmap()
glyph_order = font.getGlyphOrder()
rev = {}
for cp, gname in cmap.items():
    rev.setdefault(gname, cp)

def comps_to_text(comps):
    s = ""
    for g in comps:
        cp = rev.get(g)
        if cp is None:
            return None
        s += chr(cp)
    return s

name_to_glyph = {}
for comps, lig in ligas.items():
    t = comps_to_text(comps)
    if t and t.isascii() and t.islower() or (t and "_" in t):
        name_to_glyph[t] = lig

print(f"decoded {len(name_to_glyph)} icon names, e.g. {list(name_to_glyph)[:5]}")

# ---- collect needed names from source ----
names = set()
for f in glob.glob("src/**/*.ts*", recursive=True):
    txt = open(f, encoding="utf-8").read()
    names.update(re.findall(r'name="([a-z_0-9]+)"', txt))
    names.update(re.findall(r'name: "([a-z_0-9]+)"', txt))
    names.update(re.findall(r': "([a-z_0-9]+)"', txt))
names.discard("")
names.update({"star", "favorite", "favorite_border"})
missing = sorted(n for n in names if n not in name_to_glyph)
print(f"needed: {len(names)} | not in font (junk words, harmless): {missing[:12]}")

needed_glyphs = {name_to_glyph[n] for n in names if n in name_to_glyph}

# ---- subset by glyph list ----
opts = subset.Options()
opts.layout_features = ["liga", "rvrn", "ccmp"]
opts.flavor = "woff2"
opts.no_hinting = True
opts.notdef_outline = True
subsetter = subset.Subsetter(options=opts)
subsetter.populate(unicodes=list(range(0x20, 0x7F)), glyphs=needed_glyphs)
subsetter.subset(font)
font.save(OUT)
old, new = os.path.getsize(SRC), os.path.getsize(OUT)
print(f"{old/1048576:.1f} MB -> {new/1024:.0f} KB | kept {len(needed_glyphs)} icon glyphs")
