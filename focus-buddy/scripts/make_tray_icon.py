"""Generate a small transparent pixel-cat tray icon (local, no network)."""
from PIL import Image

S = 16               # 16x16 logical pixels
SCALE = 4            # -> 64x64 png
FUR = (167, 173, 181, 255)
DARK = (123, 130, 139, 255)
OUT = (47, 50, 55, 255)
EAR = (231, 154, 166, 255)
EYE = (35, 39, 44, 255)
SHINE = (234, 252, 255, 255)
NOSE = (230, 136, 154, 255)
T = (0, 0, 0, 0)

# 16x16 grid. Legend: . transparent, o outline, f fur, d dark stripe,
# e ear-inner, y eye, s shine, n nose
grid = [
    "................",
    "..o..........o..",
    ".oeo........oeo..",
    ".oefo......ofeo.",
    ".oeffo....offeo.",
    ".ooffffffffffoo.",
    ".offdffffdffffo.",
    "offfdffffdffffo.",
    "offyysffffyysffo",
    "offyyffffffyyffo",
    "offffffnnffffffo",
    ".offffnnnnfffffo",
    ".offffffffffffo.",
    "..offdffffdffo..",
    "...oofffffoo...",
    ".....ooooo......",
]

cmap = {
    ".": T, "o": OUT, "f": FUR, "d": DARK, "e": EAR,
    "y": EYE, "s": SHINE, "n": NOSE,
}

img = Image.new("RGBA", (S, S), T)
px = img.load()
for y, row in enumerate(grid):
    for x, ch in enumerate(row):
        if x < S and y < S:
            px[x, y] = cmap.get(ch, T)

img = img.resize((S * SCALE, S * SCALE), Image.NEAREST)
img.save("/app/focus-buddy/src/assets/tray.png")
print("tray.png written", img.size)
