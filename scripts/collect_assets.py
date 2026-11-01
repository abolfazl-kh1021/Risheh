#!/usr/bin/env python3
"""Collect all image URLs from Risheh pages; download remote ones, copy local ones, produce mapping."""
import re, os, json, hashlib, shutil, subprocess

ROOT = "/home/z/my-project/risheh-source/Risheh"
PAGES = ["index.html","about.html","categories.html","product-details.html","login-register.html",
         "user-dashboard.html","my-artworks.html","orders-shipping.html","finance-settlement.html",
         "cart-checkout.html","payment-confirm.html","authenticity-lab.html","authenticity-verify.html",
         "blog.html","contact.html","admin-dashboard.html"]
PUB = "/home/z/my-project/public/assets"
os.makedirs(f"{PUB}/img", exist_ok=True)
os.makedirs(f"{PUB}/fonts", exist_ok=True)

mapping = {}  # source url -> local public path
remote_urls = []
for p in PAGES:
    html = open(os.path.join(ROOT, p), encoding="utf-8").read()
    for u in re.findall(r'https://lh3\.googleusercontent\.com/[^"\'\s<>]+', html):
        remote_urls.append((p, u))
    for u in re.findall(r'src="(assets/[^"]+)"', html):
        remote_urls.append((p, u))

print(f"unique URLs: {len(set(u for _, u in remote_urls))}")

# 1) copy local assets (fonts + css for reference)
for f in os.listdir(f"{ROOT}/assets/fonts"):
    if f.endswith((".woff2", ".css")):
        shutil.copy(f"{ROOT}/assets/fonts/{f}", f"{PUB}/fonts/{f}")
print("fonts copied:", len(os.listdir(f"{PUB}/fonts")))

# local images: only used ones
used_local = set(u for _, u in remote_urls if u.startswith("assets/img/"))
for rel in used_local:
    src = os.path.join(ROOT, rel)
    if not os.path.exists(src):
        print("MISSING local:", rel); continue
    name = os.path.basename(rel)
    safe = name.replace(" ", "_")
    shutil.copy(src, f"{PUB}/img/{safe}")
    mapping[rel] = f"/assets/img/{safe}"
print("local images copied:", len(used_local))

# 2) download remote images
uniq_remote = sorted(set(u for _, u in remote_urls if u.startswith("http")))
print("remote unique:", len(uniq_remote))
fail = 0
for i, u in enumerate(uniq_remote):
    # stable name from content hash of url
    h = hashlib.md5(u.encode()).hexdigest()[:10]
    dest = f"{PUB}/img/dl_{h}.jpg"
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        mapping[u] = f"/assets/img/dl_{h}.jpg"; continue
    r = subprocess.run(["curl", "-sL", "--max-time", "25", "-o", dest, "-w", "%{http_code}", u],
                       capture_output=True, text=True)
    code = r.stdout.strip()
    ok = code == "200" and os.path.exists(dest) and os.path.getsize(dest) > 1000
    if ok:
        mapping[u] = f"/assets/img/dl_{h}.jpg"
    else:
        fail += 1
        if os.path.exists(dest): os.remove(dest)
        print(f"FAIL {code} {u[:80]}")
    if (i+1) % 25 == 0: print(f"  ...{i+1}/{len(uniq_remote)}")

json.dump(mapping, open("/home/z/my-project/risheh-source/refs/asset_map.json", "w"), ensure_ascii=False, indent=1)
print(f"downloaded ok: {len(uniq_remote)-fail}/{len(uniq_remote)} failed: {fail}")
print("total files in public/assets/img:", len(os.listdir(f"{PUB}/img")))
