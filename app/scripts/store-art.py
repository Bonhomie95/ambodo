#!/usr/bin/env python3
"""Store art: framed screenshots (App Store 6.9", Google Play phone), the Play feature graphic and 512 icon.

    python3 scripts/store-art.py <raw-shots-dir>

<raw-shots-dir> holds ios/<name>.png (1320x2868, iPhone 17 Pro Max) and android/<name>.png (any phone size),
named after SLIDES below. Output lands in ../store (repo root). Needs Pillow.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

APP = Path(__file__).resolve().parent.parent
OUT = APP.parent / 'store'
FONTS = APP / 'node_modules' / '@expo-google-fonts'
SERIF = str(FONTS / 'fraunces' / '600SemiBold' / 'Fraunces_600SemiBold.ttf')
SANS = str(FONTS / 'manrope' / '600SemiBold' / 'Manrope_600SemiBold.ttf')
INK, INK2 = (20, 26, 51), (43, 47, 99)
GLOW = {'coral': (255, 107, 91, 110), 'teal': (46, 196, 182, 110), 'sun': (255, 201, 74, 70)}  # sun goes muddy on ink if strong

# name, headline, subline, glow colour — order = store order.
SLIDES = [
    ('today', 'Two homes.\nOne calm plan.', 'Who has the kids, every handoff, every week.', 'coral'),
    ('talk', 'Heated?\nHit pause.', 'ToneGuard catches harsh words before they land.', 'teal'),
    ('calendar', 'Custody,\ncrystal clear.', '2-2-3, week on / week off, or your own rhythm.', 'sun'),
    ('expenses', 'Split it. Settle it.\nDone.', 'Every receipt logged. Every share clear.', 'coral'),
    ('records', 'Court-ready\nin one tap.', 'Every message sealed. Export a verified PDF.', 'teal'),
    ('plan', 'One plan.\nBoth homes.', 'Whoever pays, you both get everything.', 'sun'),
]


def backdrop(w, h, glow):
    """Ink gradient with a soft coloured glow — the app's paywall look."""
    img = Image.new('RGB', (w, h), INK)
    px = img.load()
    for y in range(h):
        t = y / h
        row = tuple(int(INK2[i] * (1 - t) + INK[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    halo = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    r = int(w * 0.55)
    ImageDraw.Draw(halo).ellipse((w - r * 1.2, -r * 0.6, w + r * 0.8, r * 1.4), fill=GLOW[glow])
    halo = halo.filter(ImageFilter.GaussianBlur(w * 0.18))
    img.paste(halo, (0, 0), halo)
    return img


def rounded(shot, radius):
    mask = Image.new('L', shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *shot.size), radius, fill=255)
    out = shot.convert('RGBA')
    out.putalpha(mask)
    return out


def text_block(draw, x, y, w, head, sub, head_px, sub_px):
    serif, sans = ImageFont.truetype(SERIF, head_px), ImageFont.truetype(SANS, sub_px)
    for line in head.split('\n'):
        draw.text((x, y), line, font=serif, fill='white')
        y += int(head_px * 1.12)
    y += int(sub_px * 0.6)
    words, line = sub.split(), ''
    for word in words:  # wrap the subline to the width
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=sans) > w and line:
            draw.text((x, y), line, font=sans, fill=(255, 255, 255, 200))
            y += int(sub_px * 1.4)
            line = word
        else:
            line = trial
    draw.text((x, y), line, font=sans, fill=(255, 255, 255, 200))
    return y + int(sub_px * 1.4)


def frame(raw, size, glow, head, sub, head_px, sub_px, margin, shot_w, radius):
    w, h = size
    img = backdrop(w, h, glow)
    draw = ImageDraw.Draw(img, 'RGBA')
    bottom = text_block(draw, margin, int(margin * 1.1), w - margin * 2, head, sub, head_px, sub_px)
    shot = Image.open(raw).convert('RGB')
    shot = shot.resize((shot_w, round(shot.height * shot_w / shot.width)), Image.LANCZOS)
    top = max(bottom + margin // 2, h - shot.height)  # sit on the bottom edge, or bleed past it
    left = (w - shot_w) // 2
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((left, top + 30, left + shot_w, top + shot.height + 30), radius, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    img.paste(shadow, (0, 0), shadow)
    framed = rounded(shot, radius)
    ImageDraw.Draw(framed).rounded_rectangle((0, 0, framed.width - 1, framed.height - 1), radius, outline=(255, 255, 255, 60), width=4)
    img.paste(framed, (left, top), framed)
    return img


def shots(raw_dir):
    for platform, size, head_px, sub_px, margin, shot_w, radius in [
        ('ios', (1320, 2868), 118, 44, 110, 1040, 120),     # App Store 6.9" (1320x2868)
        ('android', (1080, 1920), 80, 34, 76, 700, 64),     # Play phone, 9:16
    ]:
        (OUT / platform).mkdir(parents=True, exist_ok=True)
        for i, (name, head, sub, glow) in enumerate(SLIDES, 1):
            raw = raw_dir / platform / f'{name}.png'
            if not raw.exists():
                print('skip (no raw shot):', raw)
                continue
            out = OUT / platform / f'{i:02d}-{name}.jpg'
            frame(raw, size, glow, head, sub, head_px, sub_px, margin, shot_w, radius).save(out, quality=92)
            print('wrote', out.relative_to(OUT.parent))


def play_graphics():
    OUT.mkdir(exist_ok=True)
    Image.open(APP / 'assets/images/icon.png').convert('RGB').resize((512, 512), Image.LANCZOS).save(OUT / 'play-icon-512.png')
    g = backdrop(1024, 500, 'coral')
    halo = Image.new('RGBA', g.size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse((-160, 180, 360, 700), fill=GLOW['teal'][:3] + (90,))
    halo = halo.filter(ImageFilter.GaussianBlur(90))
    g.paste(halo, (0, 0), halo)
    mark = Image.open(APP / 'assets/images/splash-icon.png').convert('RGBA').crop((150, 280, 875, 735))
    mark = mark.resize((300, round(mark.height * 300 / mark.width)), Image.LANCZOS)
    g.paste(mark, (80, (500 - mark.height) // 2), mark)
    d = ImageDraw.Draw(g, 'RGBA')
    d.text((440, 148), 'Ambodo', font=ImageFont.truetype(SERIF, 112), fill='white')
    d.text((444, 290), 'Co-parent calmly.', font=ImageFont.truetype(SANS, 36), fill=(255, 255, 255, 215))
    d.text((444, 338), 'Keep the record.', font=ImageFont.truetype(SANS, 36), fill=(255, 255, 255, 215))
    g.save(OUT / 'play-feature-graphic.png')
    print('wrote store/play-icon-512.png, store/play-feature-graphic.png')


if __name__ == '__main__':
    play_graphics()
    if len(sys.argv) > 1:
        shots(Path(sys.argv[1]))
