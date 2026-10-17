from PIL import Image
import os

BASE = r"C:\Users\Fatih\Desktop\fatihgo-mobile-fixed"
noglow = Image.open(os.path.join(BASE, ".superpowers", "master-amber-noglow.png")).convert("RGBA")

def resize(img, size):
    return img.resize((size, size), Image.LANCZOS)

fg_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for density, size in fg_sizes.items():
    d = os.path.join(BASE, "android", "app", "src", "main", "res", f"mipmap-{density}")
    resize(noglow, size).save(os.path.join(d, "ic_launcher_foreground.webp"), "WEBP")

splash_sizes = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}
for density, size in splash_sizes.items():
    d = os.path.join(BASE, "android", "app", "src", "main", "res", f"drawable-{density}")
    resize(noglow, size).save(os.path.join(d, "splashscreen_logo.png"))

img_dir = os.path.join(BASE, "assets", "images")
resize(noglow, 1024).save(os.path.join(img_dir, "splash-icon.png"))
resize(noglow, 1024).save(os.path.join(img_dir, "logo.png"))

fg_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
small = resize(noglow, int(512 * 0.62))
offset = (512 - small.width) // 2
fg_512.paste(small, (offset, offset), small)
fg_512.save(os.path.join(img_dir, "android-icon-foreground.png"))

print("Fixed transparent assets regenerated.")
