#!/usr/bin/env python3
"""Audit Risheh source HTML pages: extract design tokens, structure, assets, interactions."""
import re, os, json, collections

ROOT = "/home/z/my-project/risheh-source/Risheh"
PAGES = ["index.html","about.html","categories.html","product-details.html","login-register.html",
         "user-dashboard.html","my-artworks.html","orders-shipping.html","finance-settlement.html",
         "cart-checkout.html","payment-confirm.html","authenticity-lab.html","authenticity-verify.html",
         "blog.html","contact.html","admin-dashboard.html"]

report = {}
for p in PAGES:
    path = os.path.join(ROOT, p)
    if not os.path.exists(path):
        report[p] = {"error": "missing"}
        continue
    html = open(path, encoding="utf-8").read()
    info = {"size_kb": round(len(html)/1024,1)}
    # title
    m = re.search(r"<title>(.*?)</title>", html, re.S)
    info["title"] = m.group(1).strip() if m else ""
    # tailwind config colors
    colors = set(re.findall(r'"#([0-9A-Fa-f]{6})"', html))
    info["hex_colors_used"] = sorted(c.upper() for c in colors)
    # fonts referenced
    fonts = set(re.findall(r'family=([\w+]+):', html)) | set(re.findall(r'font-family:\s*([^;}]+)', html))
    info["fonts"] = sorted(set(f.strip()[:40] for f in fonts))[:8]
    # images used
    imgs = re.findall(r'(?:src|href)="(assets/img/[^"]+)"', html)
    info["n_img_refs"] = len(imgs)
    info["unique_images"] = len(set(imgs))
    # vendor/scripts
    scripts = re.findall(r'src="((?:assets|https://)[^"]+\.(?:js)[^"]*)"', html)
    info["scripts"] = sorted(set(s.replace("https://","")[:60] for s in scripts))[:10]
    # section headings (h1,h2)
    h1h2 = re.findall(r"<h([12])[^>]*>(.*?)</h\1>", html, re.S)
    heads = []
    for lvl, t in h1h2[:14]:
        t2 = re.sub(r"<[^>]+>", "", t)
        t2 = re.sub(r"\s+", " ", t2).strip()
        if t2: heads.append(f"h{lvl}: {t2[:60]}")
    info["headings"] = heads
    # nav links (internal pages)
    links = re.findall(r'href="((?!https?://|assets|#|tel:|mailto:|javascript)[^"]+\.html)"', html)
    info["links_to"] = sorted(set(links))
    # buttons count
    info["n_buttons"] = len(re.findall(r"<button", html))
    info["n_forms"] = len(re.findall(r"<form", html))
    # custom style block sizes
    styles = re.findall(r"<style[^>]*>(.*?)</style>", html, re.S)
    info["custom_css_bytes"] = sum(len(s) for s in styles)
    # detect key component classes frequency (sample)
    cls = collections.Counter()
    for cm in re.finditer(r'class="([^"]+)"', html):
        for c in cm.group(1).split():
            if c.startswith(("rounded-", "shadow", "bg-brand", "text-brand", "border-")):
                cls[c] += 1
    info["top_classes"] = [f"{k}:{v}" for k,v in cls.most_common(12)]
    report[p] = info

print(json.dumps(report, ensure_ascii=False, indent=1))
