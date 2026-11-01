#!/usr/bin/env python3
"""Convert all product/blog/category images to optimized WebP and shrink the logo.

Strategy (documented in docs/PERFORMANCE.md):
- JPEG product photos  -> WebP q78, max width 1200px (retina headroom for ~800px slots)
- Hero/background pics -> WebP q80, max width 1600px (kept for the big home hero)
- Logo PNG (1.8MB!)    -> logo-mark.webp 512px alpha q90  (header / splash / drawer)
                       -> logo-mark-64.png  + logo-mark-192.png (favicon / touch icon)
- Originals deleted afterwards (git history keeps them).
All references in src/ and prisma/ are rewritten to the new paths.
"""
import os, glob, json
from PIL import Image

ROOT = "/home/z/my-project"
IMG = os.path.join(ROOT, "public/assets/img")

LOGO_SPACED = "Ornate Persian Teal and Gold Emblem logo.png"
LOGO_UNDER = "Ornate_Persian_Teal_and_Gold_Emblem_logo.png"

converted = []  # (old_path, new_path, old_size, new_size)

def convert(src_path, max_w, quality):
    im = Image.open(src_path)
    old_size = os.path.getsize(src_path)
    if src_path.lower().endswith(".png"):
        im = im.convert("RGBA")
        has_alpha = im.getextrema()[3][0] < 255
    else:
        im = im.convert("RGB")
        has_alpha = False
    if im.width > max_w:
        h = round(im.height * max_w / im.width)
        im = im.resize((max_w, h), Image.LANCZOS)
    new_path = os.path.splitext(src_path)[0] + ".webp"
    if has_alpha:
        im.save(new_path, "WEBP", quality=quality, method=6)
    else:
        im.save(new_path, "WEBP", quality=quality, method=6)
    converted.append((src_path, new_path, old_size, os.path.getsize(new_path)))

# ---- 1. logo: resized webp + small png icons ----
logo = os.path.join(IMG, LOGO_SPACED)
im = Image.open(logo).convert("RGBA")
mark512 = os.path.join(IMG, "logo-mark.webp")
im.resize((512, round(im.height * 512 / im.width)), Image.LANCZOS).save(
    mark512, "WEBP", quality=90, method=6)
for size in (64, 192):
    im.resize((size, size), Image.LANCZOS).save(
        os.path.join(IMG, f"logo-mark-{size}.png"), "PNG", optimize=True)
print("logo:", os.path.getsize(logo)//1024, "KB ->",
      os.path.getsize(mark512)//1024, "KB (webp 512px) + 64/192 png icons")

# ---- 2. all other images ----
hero_names = {  # large on-screen backgrounds deserve more pixels
    "dl_a97b0e9f11.jpg", "dl_af6f95412a.jpg", "img_aa403269cee3.png",
}
for f in sorted(glob.glob(IMG + "/*")):
    base = os.path.basename(f)
    if base in ("logo-mark.webp", "logo-mark-64.png", "logo-mark-192.png"):
        continue
    if base == LOGO_SPACED or base == LOGO_UNDER:
        continue
    if f.lower().endswith((".jpg", ".jpeg", ".png")):
        convert(f, 1600 if base in hero_names else 1200, 80 if base in hero_names else 78)

# ---- 3. delete originals (incl. both logo PNGs) ----
for old, new, o, n in converted:
    os.remove(old)
os.remove(logo)
os.remove(os.path.join(IMG, LOGO_UNDER))

# ---- 4. rewrite references in source ----
repl = {}
for old, new, _, _ in converted:
    repl["/assets/img/" + os.path.basename(old)] = "/assets/img/" + os.path.basename(new)
repl["/assets/img/" + LOGO_SPACED] = "/assets/img/logo-mark.webp"
repl["/assets/img/" + LOGO_UNDER] = "/assets/img/logo-mark.webp"

targets = []
for d in ("src", "prisma"):
    for ext in (".ts", ".tsx"):
        targets += glob.glob(f"{ROOT}/{d}/**/*{ext}", recursive=True)
changed_files = []
for t in targets:
    with open(t, encoding="utf-8") as fh:
        txt = fh.read()
    new_txt = txt
    for a, b in repl.items():
        new_txt = new_txt.replace(a, b)
    if new_txt != txt:
        with open(t, "w", encoding="utf-8") as fh:
            fh.write(new_txt)
        changed_files.append(os.path.relpath(t, ROOT))

# ---- 5. report ----
old_total = sum(o for _, _, o, _ in converted)
new_total = sum(n for _, _, _, n in converted)
print(f"\nconverted {len(converted)} images")
print(f"images: {old_total/1048576:.1f} MB -> {new_total/1048576:.1f} MB "
      f"({100 - 100*new_total/old_total:.0f}% smaller)")
print("rewrote refs in:", ", ".join(sorted(set(changed_files))))
json.dump({"converted": len(converted),
           "old_mb": round(old_total/1048576, 1),
           "new_mb": round(new_total/1048576, 1)},
          open(os.path.join(ROOT, ".zscripts/img_report.json"), "w"))
