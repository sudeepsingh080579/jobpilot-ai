"""Draw the JobPilot mark as PWA icons. Original geometry, indigo and sun."""

from PIL import Image, ImageDraw

INDIGO = (79, 70, 229, 255)
WHITE = (255, 255, 255, 255)
SUN = (245, 196, 0, 255)


def mark(size: int, pad: float) -> Image.Image:
    image = Image.new("RGBA", (size, size), INDIGO)
    draw = ImageDraw.Draw(image)
    inner = size * (1 - pad * 2)
    left = size * pad
    # upward chevron
    x1, y1 = left + inner * 0.18, left + inner * 0.62
    x2, y2 = left + inner * 0.50, left + inner * 0.30
    x3, y3 = left + inner * 0.82, left + inner * 0.62
    width = max(2, int(size * 0.055))
    draw.line([(x1, y1), (x2, y2), (x3, y3)], fill=WHITE, width=width, joint="curve")
    # round the joins a little by drawing a disk at the peak
    r = width / 2
    draw.ellipse((x2 - r, y2 - r, x2 + r, y2 + r), fill=WHITE)
    draw.ellipse((x1 - r, y1 - r, x1 + r, y1 + r), fill=WHITE)
    draw.ellipse((x3 - r, y3 - r, x3 + r, y3 + r), fill=WHITE)
    sun = size * 0.11
    cx, cy = left + inner * 0.78, left + inner * 0.22
    draw.ellipse((cx - sun, cy - sun, cx + sun, cy + sun), fill=SUN)
    return image


def save(path: str, size: int, pad: float) -> None:
    mark(size, pad).save(path, "PNG")


if __name__ == "__main__":
    save("public/icons/icon-192.png", 192, 0.0)
    save("public/icons/icon-512.png", 512, 0.0)
    save("public/icons/icon-maskable-512.png", 512, 0.18)
    save("public/icons/apple-touch-icon.png", 180, 0.08)
    save("src/app/icon.png", 512, 0.0)
