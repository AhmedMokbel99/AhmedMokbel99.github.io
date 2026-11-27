import json
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(".").resolve()
HTMLS = sorted(
    p for p in ROOT.rglob("*.html")
    if ".git" not in p.parts and "_source" not in p.parts and "deploy" not in p.parts
)
issues = []


def local_target(value, source):
    value = (value or "").strip()
    if not value or value.startswith(("http:", "https:", "mailto:", "tel:", "data:", "javascript:", "#")):
        return None
    if "${" in value or "{" in value:
        return None
    clean = value.split("#", 1)[0].split("?", 1)[0]
    if not clean:
        return None
    if clean.startswith("/"):
        return ROOT / unquote(clean.lstrip("/"))
    return (source.parent / unquote(clean)).resolve()


# JSON validity
for p in sorted(ROOT.rglob("*.json")):
    if ".git" in p.parts or "_source" in p.parts:
        continue
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as exc:
        issues.append(f"JSON_INVALID {p.relative_to(ROOT)}: {exc}")

# Per-HTML checks
for p in HTMLS:
    rel = p.relative_to(ROOT)
    text = p.read_text(encoding="utf-8", errors="replace")
    h1 = len(re.findall(r"<h1\b", text, re.I))
    if h1 != 1:
        issues.append(f"H1_COUNT {rel}: {h1}")
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', text, re.S | re.I):
        try:
            json.loads(m.group(1))
        except Exception as exc:
            issues.append(f"JSONLD_INVALID {rel}: {exc}")
    for m in re.finditer(r'\b(?:src|href)="([^"]+)"', text, re.I):
        target = local_target(m.group(1), p)
        if target is not None and not target.exists():
            issues.append(f"MISSING_FILE {rel}: {m.group(1)}")
    for m in re.finditer(r"<img\b[^>]*>", text, re.I):
        tag = m.group(0)
        if not re.search(r"\balt=", tag, re.I):
            issues.append(f"IMG_NO_ALT {rel}: {tag[:110]}")
        if not re.search(r"\bwidth=", tag, re.I) or not re.search(r"\bheight=", tag, re.I):
            issues.append(f"IMG_NO_SIZE {rel}: {tag[:110]}")

# Sitemap targets
sm = ROOT / "sitemap.xml"
if sm.exists():
    for loc in re.findall(r"<loc>(.*?)</loc>", sm.read_text(encoding="utf-8")):
        path = urlparse(loc).path.lstrip("/")
        target = ROOT / (path or "index.html")
        if not target.exists():
            issues.append(f"SITEMAP_MISSING {loc}")

# SEO / AI consistency checks
robots = ROOT / "robots.txt"
if robots.exists():
    for line in robots.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith(("Content-Signal:", "Agentmap:")):
            issues.append(f"ROBOTS_UNKNOWN_DIRECTIVE {stripped}")

sitemap = ROOT / "sitemap.xml"
if sitemap.exists() and "/privacy.html" not in sitemap.read_text(encoding="utf-8"):
    issues.append("SITEMAP_MISSING_PRIVACY")

for p in HTMLS:
    text = p.read_text(encoding="utf-8", errors="replace")
    if '"priceRange": "$$"' in text:
        issues.append(f"UNVERIFIED_PRICE_RANGE {p.relative_to(ROOT)}")
    for m in re.finditer(r'href="https://wa\.me/\d+(?:\?text=)?[^"]*"', text, re.I):
        if "?text=" not in m.group(0):
            issues.append(f"WA_LINK_NO_TEXT {p.relative_to(ROOT)}: {m.group(0)[:100]}")

for p in ROOT.rglob("*"):
    if not p.is_file() or any(part in p.parts for part in (".git", "_source")):
        continue
    if p.suffix.lower() not in {".json", ".md", ".txt"}:
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    if "24 portfolio projects" in text:
        issues.append(f"STALE_PROJECT_COUNT {p.relative_to(ROOT)}")

print(f"HTML_FILES {len(HTMLS)}")
print(f"ISSUES {len(issues)}")
for item in issues[:200]:
    print(item)
