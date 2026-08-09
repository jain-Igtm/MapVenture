#!/usr/bin/env python3
"""Generate MapVenture Android launcher icons and splash screens."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SIZE = 1024


def blend(start: tuple[int, int, int], end: tuple[int, int, int], amount: float):
    return tuple(round(left + (right - left) * amount) for left, right in zip(start, end))


def cubic(
    start: tuple[float, float],
    control_a: tuple[float, float],
    control_b: tuple[float, float],
    end: tuple[float, float],
    steps: int = 80,
):
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        inverse = 1 - t
        x = (
            inverse**3 * start[0]
            + 3 * inverse**2 * t * control_a[0]
            + 3 * inverse * t**2 * control_b[0]
            + t**3 * end[0]
        )
        y = (
            inverse**3 * start[1]
            + 3 * inverse**2 * t * control_a[1]
            + 3 * inverse * t**2 * control_b[1]
            + t**3 * end[1]
        )
        points.append((x, y))
    return points


def build_icon() -> Image.Image:
    scale = SIZE / 512
    background = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    gradient = Image.new("RGBA", (SIZE, SIZE))
    pixels = gradient.load()
    for y in range(SIZE):
        for x in range(SIZE):
            amount = (x + y) / (2 * (SIZE - 1))
            color = blend((23, 61, 53), (9, 20, 18), amount)
            pixels[x, y] = (*color, 255)

    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, SIZE - 1, SIZE - 1),
        radius=round(128 * scale),
        fill=255,
    )
    background.alpha_composite(Image.composite(gradient, background, mask))

    draw = ImageDraw.Draw(background)
    map_shape = [
        (88 * scale, 144 * scale),
        (196 * scale, 98 * scale),
        (316 * scale, 140 * scale),
        (424 * scale, 96 * scale),
        (424 * scale, 368 * scale),
        (316 * scale, 414 * scale),
        (196 * scale, 372 * scale),
        (88 * scale, 416 * scale),
    ]
    draw.polygon(map_shape, fill=(245, 241, 232, 240))
    draw.line(
        [(196 * scale, 98 * scale), (196 * scale, 372 * scale)],
        fill=(191, 209, 199, 255),
        width=round(13 * scale),
    )
    draw.line(
        [(316 * scale, 140 * scale), (316 * scale, 414 * scale)],
        fill=(191, 209, 199, 255),
        width=round(13 * scale),
    )

    first = cubic((122, 334), (174, 246), (221, 276), (248, 205))
    second = cubic((248, 205), (270, 146), (337, 163), (388, 124))
    route = [(round(x * scale), round(y * scale)) for x, y in [*first, *second[1:]]]
    width = round(27 * scale)
    warm = (233, 179, 95)
    coral = (242, 118, 88)

    route_mask = Image.new("L", (SIZE, SIZE), 0)
    route_draw = ImageDraw.Draw(route_mask)
    route_draw.line(route, fill=255, width=width, joint="curve")
    radius = width // 2
    for point in (route[0], route[-1]):
        x, y = point
        route_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)

    route_gradient = Image.new("RGBA", (SIZE, SIZE), (*warm, 255))
    gradient_draw = ImageDraw.Draw(route_gradient)
    start_x = round(min(point[0] for point in route))
    end_x = round(max(point[0] for point in route))
    for x in range(SIZE):
        amount = max(0, min(1, (x - start_x) / max(1, end_x - start_x)))
        gradient_draw.line(
            [(x, 0), (x, SIZE)],
            fill=(*blend(warm, coral, amount), 255),
        )
    background.alpha_composite(
        Image.composite(route_gradient, Image.new("RGBA", (SIZE, SIZE)), route_mask)
    )
    draw = ImageDraw.Draw(background)

    center = (249 * scale, 203 * scale)
    draw.ellipse(
        (
            center[0] - 31 * scale,
            center[1] - 31 * scale,
            center[0] + 31 * scale,
            center[1] + 31 * scale,
        ),
        fill=(23, 61, 53, 255),
    )
    draw.ellipse(
        (
            center[0] - 12 * scale,
            center[1] - 12 * scale,
            center[0] + 12 * scale,
            center[1] + 12 * scale,
        ),
        fill=(233, 179, 95, 255),
    )
    return background


def resized(icon: Image.Image, size: int):
    return icon.resize((size, size), Image.Resampling.LANCZOS)


def write_launcher_icons(icon: Image.Image):
    densities = {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }
    for density, (legacy_size, foreground_size) in densities.items():
        directory = RES / f"mipmap-{density}"
        directory.mkdir(parents=True, exist_ok=True)
        legacy = resized(icon, legacy_size)
        legacy.save(directory / "ic_launcher.png")
        legacy.save(directory / "ic_launcher_round.png")

        foreground = Image.new("RGBA", (foreground_size, foreground_size), (0, 0, 0, 0))
        inner_size = round(foreground_size * 2 / 3)
        inner = resized(icon, inner_size)
        offset = (foreground_size - inner_size) // 2
        foreground.alpha_composite(inner, (offset, offset))
        foreground.save(directory / "ic_launcher_foreground.png")


def write_splash_screens(icon: Image.Image):
    for path in RES.glob("drawable*/splash.png"):
        with Image.open(path) as current:
            dimensions = current.size
        canvas = Image.new("RGBA", dimensions, (11, 21, 20, 255))
        logo_size = round(min(dimensions) * 0.42)
        logo = resized(icon, logo_size)
        canvas.alpha_composite(
            logo,
            ((dimensions[0] - logo_size) // 2, (dimensions[1] - logo_size) // 2),
        )
        canvas.convert("RGB").save(path, optimize=True)


def main():
    icon = build_icon()
    source_directory = ROOT / "assets"
    source_directory.mkdir(exist_ok=True)
    icon.save(source_directory / "android-icon.png", optimize=True)
    write_launcher_icons(icon)
    write_splash_screens(icon)


if __name__ == "__main__":
    main()
