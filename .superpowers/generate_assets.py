from PIL import Image
import os

BASE = r"C:\Users\Fatih\Desktop\fatihgo-mobile-fixed"

opaque = Image.open(os.path.join(BASE, ".superpowers", "master-opaque.png")).convert("RGBA")
transparent = Image.open(os.path.join(BASE, ".superpowers", "master-transparent.png")).convert("RGBA")
mono = Image.open(os.path.join(BASE, ".superpowers", "master-mono.png")).convert("RGBA")

def resize(img, size):
    return img.resize((size, size), Image.LANCZOS)

# --- Native mipmap launcher icons (flat, opaque, ic_launcher + ic_launcher_round identical) ---
mipmap_sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fg_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

for density, size in mipmap_sizes.items():
    d = os.path.join(BASE, "android", "app", "src", "main", "res", f"mipmap-{density}")
    icon = resize(opaque, size)
    icon.save(os.path.join(d, "ic_launcher.webp"), "WEBP")
    icon.save(os.path.join(d, "ic_launcher_round.webp"), "WEBP")

for density, size in fg_sizes.items():
    d = os.path.join(BASE, "android", "app", "src", "main", "res", f"mipmap-{density}")
    fg = resize(transparent, size)
    fg.save(os.path.join(d, "ic_launcher_foreground.webp"), "WEBP")

# --- Native splash logo (transparent, drawable densities) ---
splash_sizes = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}
for density, size in splash_sizes.items():
    d = os.path.join(BASE, "android", "app", "src", "main", "res", f"drawable-{density}")
    resize(transparent, size).save(os.path.join(d, "splashscreen_logo.png"))

# --- assets/images sources (for future prebuilds / consistency) ---
img_dir = os.path.join(BASE, "assets", "images")
resize(opaque, 1024).save(os.path.join(img_dir, "icon.png"))
resize(opaque, 256).convert("RGB").save(os.path.join(img_dir, "favicon.png"))
resize(transparent, 1024).save(os.path.join(img_dir, "splash-icon.png"))
resize(transparent, 1024).save(os.path.join(img_dir, "logo.png"))
resize(mono, 1024).save(os.path.join(img_dir, "android-icon-monochrome.png"))

# background-only (bg fill, no glyph) for android-icon-background.png
bg_only = Image.new("RGBA", (1024, 1024), (11, 11, 15, 255))
bg_only.save(os.path.join(img_dir, "android-icon-background.png"))

# foreground with safe-zone scale (0.62, matches FibroRadar convention) for android-icon-foreground.png
fg_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
small = resize(transparent, int(512 * 0.62))
offset = (512 - small.width) // 2
fg_512.paste(small, (offset, offset), small)
fg_512.save(os.path.join(img_dir, "android-icon-foreground.png"))

# adaptive-icon.png (legacy/unused most likely, but keep consistent, opaque at original 1248 size)
resize(opaque, 1248).convert("RGB").save(os.path.join(img_dir, "adaptive-icon.png"))

print("All assets generated.")
