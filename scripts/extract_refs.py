#!/usr/bin/env python3
"""Extract per-page body text, image usage, and data model hints from Risheh HTML sources."""
import re, os, json, html as H

ROOT = "/home/z/my-project/risheh-source/Risheh"
PAGES = ["index.html","about.html","categories.html","product-details.html","login-register.html",
         "user-dashboard.html","my-artworks.html","orders-shipping.html","finance-settlement.html",
         "cart-checkout.html","payment-confirm.html","authenticity-lab.html","authenticity-verify.html",
         "blog.html","contact.html","admin-dashboard.html"]
OUT = "/home/z/my-project/risheh-source/refs"
os.makedirs(OUT, exist_ok=True)

img_usage = {}
for p in PAGES:
    path = os.path.join(ROOT, p)
    html = open(path, encoding="utf-8").read()
    body_m = re.search(r"<body[^>]*>(.*)</body>", html, re.S)
    body = body_m.group(1) if body_m else html
    # remove scripts/styles/svg internals
    body = re.sub(r"<script.*?</script>", " ", body, flags=re.S)
    body = re.sub(r"<style.*?</style>", " ", body, flags=re.S)
    body = re.sub(r"<svg.*?</svg>", " [svg] ", body, flags=re.S)
    # capture img srcs with alt
    imgs = re.findall(r'<img[^>]*src="([^"]+)"[^>]*?(?:alt="([^"]*)")?[^>]*>', body)
    for src, alt in imgs:
        if src not in img_usage: img_usage[src] = []
        img_usage[src].append(p)
    # mark images inline
    body = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', r' [IMG:\1] ', body)
    # capture buttons text
    body = re.sub(r"<button([^>]*)>", r"\n[BUTTON\1] ", body)
    body = re.sub(r"</button>", " [/BUTTON]\n", body)
    # links
    body = re.sub(r'<a\s([^>]*href="[^"]*"[^>]*)>', r"\n[A \1] ", body)
    body = re.sub(r"</a>", " [/A]", body)
    # inputs
    body = re.sub(r'<(input|select|textarea)[^>]*>', r'\n[\1-CTRL] ', body)
    # strip tags
    text = re.sub(r"<[^>]+>", "\n", body)
    text = H.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    text = re.sub(r"(\n )+", "\n ", text)
    out = os.path.join(OUT, p.replace(".html", ".txt"))
    open(out, "w", encoding="utf-8").write(text.strip())
    print(f"{p}: {len(text)//1024}KB text -> {out}")

# image usage map
used = {k: sorted(set(v)) for k, v in sorted(img_usage.items())}
json.dump(used, open(os.path.join(OUT, "image_usage.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"\n{len(used)} unique images referenced")
