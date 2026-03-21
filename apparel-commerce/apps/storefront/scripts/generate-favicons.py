"""
Generate favicon + PWA icon sizes from the abstract Maharlika mark.

Sizing follows common UI/UX + PWA guidance (matches ui-ux-pro-max / modern web standards):
 - 16, 32, 48 : browser favicons
 - 180 : apple-touch-icon
 - 192, 512 : Android / manifest

Run from repo root:
 python apparel-commerce/apps/storefront/scripts/generate-favicons.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

# Monorepo: apparel-commerce/ is two levels below repo root in typical layouts
SCRIPT = Path(__file__).resolve()
STOREFRONT = SCRIPT.parents[1] # .../apps/storefront
# scripts -> storefront -> apps -> apparel-commerce
REPO_APPAREL = SCRIPT.parents[3] # .../apparel-commerce

DEFAULT_SRC = REPO_APPAREL / "public" / "Maharlika Logo Design (abstract).png"
OUT_DIR = STOREFRONT / "public" / "icons"

SIZES = {
 "favicon-16x16.png": 16,
 "favicon-32x32.png": 32,
 "favicon-48x48.png": 48,
 "apple-touch-icon.png": 180,
 "android-chrome-192x192.png": 192,
 "android-chrome-512x512.png": 512,
}


def flatten_on_white(im: Image.Image) -> Image.Image:
 im = im.convert("RGBA")
 bg = Image.new("RGB", im.size, (255, 255, 255))
 bg.paste(im, mask=im.split()[3])
 return bg


def contain_square(im_rgb: Image.Image, size: int, *, pad_ratio: float = 0.12) -> Image.Image:
 """Fit image inside size×size with padding so fine lines stay visible at small sizes."""
 w, h = im_rgb.size
 pad = max(1, int(round(size * pad_ratio)))
 inner = size - 2 * pad
 scale = min(inner / w, inner / h)
 nw = max(1, int(round(w * scale)))
 nh = max(1, int(round(h * scale)))
 resized = im_rgb.resize((nw, nh), Image.Resampling.LANCZOS)
 canvas = Image.new("RGB", (size, size), (255, 255, 255))
 canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2))
 return canvas


def main() -> int:
 src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
 if not src.is_file():
 print(f"Missing source: {src}", file=sys.stderr)
 return 1

 OUT_DIR.mkdir(parents=True, exist_ok=True)
 flat = flatten_on_white(Image.open(src))

 for name, dim in SIZES.items():
 # Slightly more padding for tiny favicons
 pad = 0.18 if dim <= 16 else 0.14 if dim <= 32 else 0.12
 icon = contain_square(flat, dim, pad_ratio=pad)
 dest = OUT_DIR / name
 icon.save(dest, "PNG", optimize=True)
 print(f"Wrote {dest.relative_to(STOREFRONT)} ({dim}×{dim})")

 return 0


if __name__ == "__main__":
 raise SystemExit(main())
