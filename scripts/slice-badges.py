#!/usr/bin/env python3
"""
Decoupe la planche de badges du studio en vingt PNG.

La planche : quatre rangees de cinq medaillons sur fond bleu nuit — les
rangees 1 et 3 allumees, les rangees 2 et 4 verrouillees (grises). On
repere chaque medaillon par sa luminosite (bien au-dessus du fond), on
recoupe chacun dans un carre, et on rend transparent ce qui est hors du
cercle : pose sur le fond de l'app, il n'y a plus de carre autour.

  python3 scripts/slice-badges.py planche.png
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

IDS = [
    'day1', 'day7', 'day30', 'day100', 'reels100',
    'reels1000', 'reels10000', 'care1', 'care10', 'care3',
]
OUT = Path('assets/badges')
SIZE = 400


def blobs(img: Image.Image, threshold: int = 70):
    """Les taches claires : boites (x0, y0, x1, y1) des composantes connexes."""
    g = img.convert('L')
    w, h = g.size
    px = g.load()
    mask = [[px[x, y] > threshold for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    boxes = []
    for y in range(h):
        for x in range(w):
            if not mask[y][x] or seen[y][x]:
                continue
            stack = [(x, y)]
            seen[y][x] = True
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while stack:
                cx, cy = stack.pop()
                n += 1
                x0, x1 = min(x0, cx), max(x1, cx)
                y0, y1 = min(y0, cy), max(y1, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if n > 2000:   # un medaillon, pas une etincelle
                boxes.append((x0, y0, x1, y1))
    return boxes


def merge(boxes):
    """
    Le symbole d'un medaillon est une tache A L'INTERIEUR de son anneau : on
    fusionne une boite avec celle qui contient son centre, et rien d'autre.
    Deux voisins ne se touchent jamais par le centre, meme serres.
    """
    boxes = sorted(boxes, key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))   # les grandes d'abord
    out = []
    for b in boxes:
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        for i, o in enumerate(out):
            if o[0] <= cx <= o[2] and o[1] <= cy <= o[3]:
                out[i] = (min(o[0], b[0]), min(o[1], b[1]), max(o[2], b[2]), max(o[3], b[3]))
                break
        else:
            out.append(b)
    return out


def main(src: str):
    img = Image.open(src).convert('RGBA')
    boxes = merge(blobs(img))
    if len(boxes) != 20:
        sys.exit(f'{len(boxes)} medaillons trouves, il en faut 20 — ajuste le seuil.')
    # Rangees par ordonnee, colonnes par abscisse.
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows = [sorted(boxes[i * 5:(i + 1) * 5], key=lambda b: b[0]) for i in range(4)]
    OUT.mkdir(parents=True, exist_ok=True)
    for r, row in enumerate(rows):
        lit = r in (0, 2)
        base = 0 if r < 2 else 5
        for k, (x0, y0, x1, y1) in enumerate(row):
            side = max(x1 - x0, y1 - y0) + 12
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            crop = img.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((SIZE, SIZE), Image.LANCZOS)
            # Hors du cercle : transparent. Le medaillon touche presque ses bords.
            mask = Image.new('L', (SIZE, SIZE), 0)
            ImageDraw.Draw(mask).ellipse((6, 6, SIZE - 6, SIZE - 6), fill=255)
            crop.putalpha(mask)
            name = IDS[base + k] + ('' if lit else '-locked')
            crop.save(OUT / f'{name}.png')
            print('ok', name)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('usage: slice-badges.py planche.png')
    main(sys.argv[1])
