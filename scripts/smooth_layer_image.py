#!/usr/bin/env python3
"""Smooth jagged/aliased edges in layer PNG images. Usage: python smooth_layer_image.py <path-to-image> [--output out.png]"""
import sys
import os

try:
    from PIL import Image, ImageFilter
except ImportError:
    print("Install Pillow: pip install Pillow")
    sys.exit(1)


def smooth_image(path: str, output: str | None = None, strength: float = 1.0) -> None:
    """Apply edge-preserving smoothing to reduce jagged lines."""
    img = Image.open(path).convert("RGBA")
    r, g, b, a = img.split()

    # Slight Gaussian blur softens jagged edges without losing too much detail
    # strength 1.0 = radius 1, 2.0 = radius 2, etc.
    radius = max(0.5, min(3.0, strength))
    blurred = img.filter(ImageFilter.GaussianBlur(radius=radius))

    # Blend original with blurred to preserve sharpness while smoothing edges
    blend = Image.blend(img, blurred, alpha=0.35)

    out = output or path.replace(".png", "_smoothed.png")
    blend.save(out, "PNG")
    print(f"Saved smoothed image to {out}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python smooth_layer_image.py <image.png> [--output out.png] [--strength 1.0]")
        sys.exit(1)

    path = sys.argv[1]
    output = None
    strength = 1.0

    args = sys.argv[2:]
    for i, a in enumerate(args):
        if a == "--output" and i + 1 < len(args):
            output = args[i + 1]
        elif a == "--strength" and i + 1 < len(args):
            try:
                strength = float(args[i + 1])
            except ValueError:
                pass

    if not os.path.isfile(path):
        print(f"File not found: {path}")
        sys.exit(1)

    smooth_image(path, output, strength)
