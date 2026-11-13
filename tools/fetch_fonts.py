"""تنزيل خطوط الموقع محليًا + قصّها على الحروف المستخدمة، وتوليد @font-face داخل css/style.css.

    python tools/fetch_fonts.py

بيحتاج fonttools:
    python -m pip install fonttools brotli
"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"
STYLE = ROOT / "css" / "style.css"

START = "/* fonts:start — خطوط مستضافة محليًا، لا تعدّل هذا القسم يدويًا */"
END = "/* fonts:end */"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

URL = (
    "https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800"
    "&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700"
    "&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
)

KEEP = {"arabic", "latin"}

# الأوزان المستخدمة فعليًا فقط — أي وزن ناقص المتصفح يستخدم أقرب وزن متاح
KEEP_WEIGHTS = {
    "IBM Plex Sans Arabic": {"400", "700"},
    "Tajawal": {"800"},
    "IBM Plex Mono": {"400", "500"},
}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def subset_unicodes() -> str:
    """كل الحروف اللي ممكن يحتاجها الموقع: النصوص الحالية + الحروف العربية
    واللاتينية الأساسية، عشان أي تعديل من اللوحة يفضل شغال."""
    text = ""
    sources = [ROOT / "index.html", ROOT / "404.html"]
    sources += sorted((ROOT / "content").glob("*.json"))
    for path in sources:
        if path.exists():
            text += path.read_text(encoding="utf-8")

    chars = set(text)
    chars |= {chr(code) for code in range(0x20, 0x7F)}
    chars |= {chr(code) for code in range(0xA0, 0x100)}
    chars |= {chr(code) for code in range(0x600, 0x700)}
    chars |= {chr(code) for code in range(0x2000, 0x2070)}
    chars |= {chr(code) for code in range(0x20A0, 0x20D0)}
    chars |= {chr(code) for code in range(0x2190, 0x2200)}
    chars |= {chr(code) for code in range(0x2500, 0x2580)}
    chars |= {chr(code) for code in range(0x25A0, 0x2600)}
    chars |= set("﷼٪‰")
    chars = {c for c in chars if ord(c) > 0x1F}
    return ",".join(f"U+{ord(c):04X}" for c in sorted(chars))


def subset_font(source: Path, target: Path, unicodes: str) -> bool:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(source),
            f"--output-file={target}",
            "--flavor=woff2",
            "--layout-features=*",
            f"--unicodes={unicodes}",
            "--no-hinting",
        ],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and target.exists()


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    FONTS.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")

    blocks = re.findall(r"/\*\s*([^*]+?)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
    faces = []
    total = 0
    unicodes = subset_unicodes()

    for subset, body in blocks:
        subset = subset.strip()
        if subset not in KEEP:
            continue

        family = re.search(r"font-family:\s*'([^']+)'", body).group(1)
        weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
        if weight not in KEEP_WEIGHTS.get(family, set()):
            continue
        src = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
        unicode_range = re.search(r"unicode-range:\s*([^;]+);", body).group(1).strip()

        name = f"{slug(family)}-{weight}-{subset}.woff2"
        target = FONTS / name
        raw = Path(tempfile.gettempdir()) / f"font-source-{name}"
        data = urllib.request.urlopen(
            urllib.request.Request(src, headers={"User-Agent": UA}), timeout=60
        ).read()
        raw.write_bytes(data)

        if not subset_font(raw, target, unicodes):
            target.write_bytes(data)
        raw.unlink(missing_ok=True)

        total += target.stat().st_size
        faces.append((family, weight, name, unicode_range))

    lines = [START]
    for family, weight, name, unicode_range in faces:
        lines.append(
            "@font-face {\n"
            f"  font-family: '{family}';\n"
            "  font-style: normal;\n"
            f"  font-weight: {weight};\n"
            "  font-display: swap;\n"
            f"  src: url('../assets/fonts/{name}') format('woff2');\n"
            f"  unicode-range: {unicode_range};\n"
            "}"
        )
    lines.append(END)
    block = "\n\n".join(lines)

    style = STYLE.read_text(encoding="utf-8")
    if START in style and END in style:
        head, rest = style.split(START, 1)
        _, tail = rest.split(END, 1)
        style = head + block + tail
    else:
        style = block + "\n\n" + style

    STYLE.write_text(style, encoding="utf-8", newline="\n")

    # حذف أي ملف خط قديم مش مستخدم
    used = {name for _, _, name, _ in faces}
    for old in FONTS.glob("*.woff2"):
        if old.name not in used:
            old.unlink()
            print(f"حُذف {old.name}")

    print(f"خطوط: {len(faces)} ملف · {total / 1024:.0f} كيلوبايت · داخل css/style.css")
    return 0


if __name__ == "__main__":
    sys.exit(main())
