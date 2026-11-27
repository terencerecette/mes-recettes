import math
import os
import struct
import zlib


def write_png(path, width, height, rgba_bytes):
    """Write an RGBA/RGB PNG file using stdlib zlib & struct."""
    def chunk(tag, data):
        return (
            struct.pack("!I", len(data))
            + tag
            + data
            + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    # Color type 2 = RGB (opaque, 3 bytes per pixel - ideal for iOS apple-touch-icon)
    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)
        start = y * stride
        raw.extend(rgba_bytes[start : start + stride])

    ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), level=9)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def blend(bg, fg, alpha):
    if alpha <= 0.0:
        return bg
    if alpha >= 1.0:
        return fg
    inv = 1.0 - alpha
    return (
        bg[0] * inv + fg[0] * alpha,
        bg[1] * inv + fg[1] * alpha,
        bg[2] * inv + fg[2] * alpha,
    )


def dist_rounded_rect(px, py, cx, cy, half_w, half_h, radius):
    dx = abs(px - cx) - (half_w - radius)
    dy = abs(py - cy) - (half_h - radius)
    qx = max(dx, 0.0)
    qy = max(dy, 0.0)
    return math.hypot(qx, qy) + min(max(dx, dy), 0.0) - radius


def dist_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r


def dist_ellipse(px, py, cx, cy, rx, ry):
    # Approximate SDF for ellipse
    nx = (px - cx) / rx
    ny = (py - cy) / ry
    d = math.hypot(nx, ny)
    if d == 0:
        return -min(rx, ry)
    return (d - 1.0) * min(rx, ry)


def sample_color(u, v):
    """Evaluate scene color at normalized coordinates u, v in [0, 1]."""
    # Background: warm terracotta gradient (#C85A32 -> #B44B25)
    t = 0.55 * u + 0.45 * v
    bg = (
        200.0 * (1.0 - t) + 180.0 * t,
        90.0 * (1.0 - t) + 75.0 * t,
        50.0 * (1.0 - t) + 37.0 * t,
    )
    # Subtle soft radial highlight in the center
    radial = max(0.0, 1.0 - math.hypot(u - 0.38, v - 0.32) * 1.4)
    bg = (
        min(255.0, bg[0] + radial * 14.0),
        min(255.0, bg[1] + radial * 10.0),
        min(255.0, bg[2] + radial * 7.0),
    )

    cream = (250.0, 248.0, 245.0)  # #FAF8F5
    sage = (74.0, 124.0, 89.0)     # #4A7C59
    warm_cream = (242.0, 236.0, 227.0)

    # All geometry in [0, 1] with ~19% safe margin on all sides
    # Top knob of cloche
    d_knob = dist_circle(u, v, 0.50, 0.285, 0.043)
    # Dome: upper half of an ellipse (v <= 0.585)
    d_dome_ellipse = dist_ellipse(u, v, 0.50, 0.585, 0.252, 0.262)
    d_dome = max(d_dome_ellipse, v - 0.585)
    # Cloche rim/tray
    d_tray = dist_rounded_rect(u, v, 0.50, 0.642, 0.292, 0.028, 0.026)
    # Bottom accent bar (recipe book spine / line)
    d_bar = dist_rounded_rect(u, v, 0.50, 0.728, 0.160, 0.015, 0.014)

    # Combine cream shapes with crisp antialiasing (px scale approx 1/256)
    d_cream = min(d_knob, d_dome, d_tray)
    aa = 0.0035
    alpha_cream = max(0.0, min(1.0, 0.5 - d_cream / aa))
    col = blend(bg, cream, alpha_cream)

    alpha_bar = max(0.0, min(1.0, 0.5 - d_bar / aa)) * 0.90
    col = blend(col, warm_cream, alpha_bar)

    # Sage leaf detail nestled on the right side of the dome
    # Rotated ellipse leaf around (0.605, 0.455)
    lu = u - 0.605
    lv = v - 0.455
    ang = -0.68
    ru = lu * math.cos(ang) - lv * math.sin(ang)
    rv = lu * math.sin(ang) + lv * math.cos(ang)
    d_leaf = max(
        dist_ellipse(ru, rv, 0.0, 0.0, 0.062, 0.036),
        dist_ellipse(ru, rv, -0.015, 0.032, 0.075, 0.055),
    )
    # Actually simple almond leaf via intersection of two offset circles
    c1 = dist_circle(ru, rv, 0.0, 0.034, 0.064)
    c2 = dist_circle(ru, rv, 0.0, -0.034, 0.064)
    d_leaf = max(c1, c2)
    alpha_leaf = max(0.0, min(1.0, 0.5 - d_leaf / aa))
    col = blend(col, sage, alpha_leaf)

    # Subtle cream inner highlight arc on left side of dome
    d_arc_outer = dist_ellipse(u, v, 0.50, 0.585, 0.215, 0.225)
    d_arc_inner = -dist_ellipse(u, v, 0.50, 0.585, 0.195, 0.205)
    d_arc = max(d_arc_outer, d_arc_inner, v - 0.535, u - 0.46)
    alpha_arc = max(0.0, min(1.0, 0.5 - d_arc / aa)) * 0.16
    col = blend(col, (200.0, 90.0, 50.0), alpha_arc)

    return col


def render_icon(size, out_path):
    buf = bytearray(size * size * 3)
    # 2x2 supersampling per pixel for super smooth edges
    offsets = (0.25, 0.75)
    idx = 0
    for y in range(size):
        for x in range(size):
            r = g = b = 0.0
            for oy in offsets:
                v = (y + oy) / size
                for ox in offsets:
                    u = (x + ox) / size
                    sr, sg, sb = sample_color(u, v)
                    r += sr
                    g += sg
                    b += sb
            buf[idx] = max(0, min(255, int(round(r * 0.25))))
            buf[idx + 1] = max(0, min(255, int(round(g * 0.25))))
            buf[idx + 2] = max(0, min(255, int(round(b * 0.25))))
            idx += 3
    write_png(out_path, size, size, buf)
    print(f"Generated {out_path} ({size}x{size})")


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pub_dir = os.path.join(base_dir, "public")
    os.makedirs(pub_dir, exist_ok=True)
    render_icon(180, os.path.join(pub_dir, "apple-touch-icon.png"))
    render_icon(192, os.path.join(pub_dir, "pwa-192x192.png"))
    render_icon(512, os.path.join(pub_dir, "pwa-512x512.png"))
