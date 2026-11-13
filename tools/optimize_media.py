"""توليد نسخ خفيفة من صور المشاريع (مصغّرة + نسخة متوسطة) وضغط الصور الثقيلة.

يُشغَّل يدويًا عند إضافة صور كثيرة، واللوحة تولّد نفس النسخ تلقائيًا عند الرفع.
    python tools/optimize_media.py
"""

from __future__ import annotations

import io
import os
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "assets" / "projects"

EXTS = {".jpg", ".jpeg", ".png"}
SUFFIX = re.compile(r"-(640|900|1200|1400|thumb)$", re.IGNORECASE)

THUMB_EDGE = 360
GRID_EDGE = 640
MEDIUM_EDGE = 1200
THUMB_QUALITY = 74
GRID_QUALITY = 76
MEDIUM_QUALITY = 80
FULL_QUALITY = 82
RECOMPRESS_OVER = 240 * 1024
FULL_MAX_EDGE = 2000


def save_jpeg(img: Image.Image, path: Path, quality: int) -> int:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    data = buf.getvalue()
    path.write_bytes(data)
    return len(data)


def fit(img: Image.Image, edge: int) -> Image.Image:
    if max(img.size) <= edge:
        return img
    copy = img.copy()
    copy.thumbnail((edge, edge), Image.LANCZOS)
    return copy


def base_name(path: Path) -> str:
    return SUFFIX.sub("", path.stem)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    if not PROJECTS.is_dir():
        print("لا يوجد مجلد الصور")
        return 1

    files = [p for p in PROJECTS.iterdir() if p.is_file() and p.suffix.lower() in EXTS]
    groups: dict[str, list[Path]] = {}
    for path in files:
        groups.setdefault(base_name(path), []).append(path)

    thumbs = mediums = heavy = 0
    saved = 0

    for base, items in sorted(groups.items()):
        fulls = [p for p in items if not SUFFIX.search(p.stem)]
        source = max(fulls or items, key=lambda p: p.stat().st_size)

        with Image.open(source) as opened:
            img = opened.convert("RGB")

            # ضغط الصور الكبيرة جدًا مع الحفاظ على أبعادها المنطقية
            if source.stat().st_size > RECOMPRESS_OVER:
                target = fit(img, FULL_MAX_EDGE)
                if target is not img or source.stat().st_size > RECOMPRESS_OVER * 2:
                    before = source.stat().st_size
                    after = save_jpeg(target, source, FULL_QUALITY)
                    if after < before * 0.92:
                        saved += before - after
                        heavy += 1
                    else:
                        save_jpeg(target, source, 88)

            # نسخة المصغّرة للشريط
            thumb_path = PROJECTS / f"{base}-thumb.jpg"
            save_jpeg(fit(img, THUMB_EDGE), thumb_path, THUMB_QUALITY)
            thumbs += 1

            # نسخة كروت الأعمال في الصفحة الرئيسية
            save_jpeg(fit(img, GRID_EDGE), PROJECTS / f"{base}-640.jpg", GRID_QUALITY)

            # نسخة متوسطة للنافذة (أوضح من 900px وأخف من الأصل)
            save_jpeg(fit(img, MEDIUM_EDGE), PROJECTS / f"{base}-1200.jpg", MEDIUM_QUALITY)
            mediums += 1

    print(f"مصغّرات: {thumbs} · متوسطة: {mediums} · صور مضغوطة: {heavy}")
    print(f"تم توفير {saved / 1048576:.1f} ميجابايت من الصور الأصلية")
    return 0


if __name__ == "__main__":
    sys.exit(main())
