"""Generate social preview images (1200x630) and the 512px logo. Run after changing names or taglines.

  python -X utf8 scripts/make_images.py

Uses Windows fonts (Malgun Gothic, Georgia) only to rasterize; no font file is shipped.
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = pathlib.Path("C:/Windows/Fonts")
BG, INK, SOFT, ACCENT = (250, 250, 247), (18, 22, 28), (59, 65, 74), (47, 91, 234)

CARDS = {
    "home": (None, "servi.im", "직접 만든 프로그램 · 유틸리티 · 서비스"),
    "ohmyzip": ("ohmyzip", "ohmyZip", "Windows 압축 관리자 · 무료"),
    "ohmypic": ("ohmypic", "ohMypic", "Windows 이미지 뷰어 · 무료"),
    "dojang": ("dojang", "인주공방", "도장 이미지 만들기 · 웹 서비스 · 무료"),
}


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def logo(size):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 14 // 64, fill=ACCENT)
    f = font("georgiab.ttf", size * 40 // 64)
    d.text((size * 30 // 64, size * 33 // 64), "s", font=f, fill="white", anchor="mm")
    r = size * 4 // 64
    cx, cy = size * 48 // 64, size * 42 // 64
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG)
    return im


def card(icon, title, tagline):
    im = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1200, 10], fill=ACCENT)
    art = logo(220) if icon is None else Image.open(ROOT / f"assets/icons/{icon}.png").convert("RGBA").resize((220, 220), Image.LANCZOS)
    im.paste(art, (110, 205), art)
    title_font = "georgiab.ttf" if title.isascii() else "malgunbd.ttf"  # Georgia has no Hangul
    d.text((380, 250), title, font=font(title_font, 96), fill=INK, anchor="ls")
    d.text((384, 330), tagline, font=font("malgun.ttf", 40), fill=SOFT, anchor="ls")
    d.text((384, 410), "servi.im", font=font("malgunbd.ttf", 30), fill=ACCENT, anchor="ls")
    return im


def main():
    out = ROOT / "assets/og"
    out.mkdir(parents=True, exist_ok=True)
    for name, spec in CARDS.items():
        card(*spec).save(out / f"{name}.png", optimize=True)
    logo(512).save(ROOT / "assets/logo-512.png", optimize=True)
    print("wrote", ", ".join(f"assets/og/{n}.png" for n in CARDS), "assets/logo-512.png")


if __name__ == "__main__":
    main()
