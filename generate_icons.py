"""Generate apple-touch-icon.png for game and admin apps.

Usage: python3 generate_icons.py

Requires: pip install pillow cairosvg
Converts the favicon.svg to a 180x180 PNG using cairosvg.
If cairosvg is not available, opens a browser-based fallback.
"""
from PIL import Image, ImageDraw, ImageFont
import os
import sys
import webbrowser
import http.server
import threading

SIZE = 180
BG_COLOR = (15, 20, 25)  # #0f1419
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def try_cairosvg():
    """Try to convert SVG to PNG using cairosvg."""
    try:
        import cairosvg
        svg_path = os.path.join(SCRIPT_DIR, "game", "public", "favicon.svg")
        for app in ["game", "admin"]:
            out = os.path.join(SCRIPT_DIR, app, "public", "apple-touch-icon.png")
            cairosvg.svg2png(url=svg_path, write_to=out,
                             output_width=SIZE, output_height=SIZE)
            print(f"✓ Created {out} (cairosvg)")
        return True
    except ImportError:
        return False

def try_pillow_emoji():
    """Try to render emoji using Pillow with a system emoji font."""
    candidates = [
        # Windows
        "C:/Windows/Fonts/seguiemj.ttf",
        # Linux
        "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
        "/usr/share/fonts/noto-emoji/NotoColorEmoji.ttf",
        "/usr/share/fonts/truetype/noto-color-emoji/NotoColorEmoji.ttf",
        # macOS
        "/System/Library/Fonts/Apple Color Emoji.ttc",
    ]
    for font_path in candidates:
        if not os.path.exists(font_path):
            continue
        try:
            img = Image.new("RGBA", (SIZE, SIZE), BG_COLOR + (255,))
            draw = ImageDraw.Draw(img)
            font = ImageFont.truetype(font_path, 120)
            draw.text((SIZE // 2, SIZE // 2), "🦖", font=font, anchor="mm",
                      embedded_color=True)
            for app in ["game", "admin"]:
                out = os.path.join(SCRIPT_DIR, app, "public", "apple-touch-icon.png")
                img.save(out, "PNG")
                print(f"✓ Created {out} (emoji font: {os.path.basename(font_path)})")
            return True
        except Exception as e:
            print(f"  Warning: {font_path} failed ({e})")
    return False

def browser_fallback():
    """Generate HTML that renders the emoji icon and auto-downloads as PNG."""
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Generate Icon</title></head>
<body style="margin:0;background:#222;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh">
<h2>GameREX Icon Generator</h2>
<canvas id="c" width="{SIZE}" height="{SIZE}" style="border:1px solid #444;border-radius:12px"></canvas>
<p>Right-click the image below and "Save image as..." → <code>apple-touch-icon.png</code></p>
<p>Save it to both <code>game/public/</code> and <code>admin/public/</code></p>
<img id="img" style="border:1px solid #444;border-radius:12px;margin-top:12px" />
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
ctx.fillStyle = '#0f1419';
ctx.fillRect(0, 0, {SIZE}, {SIZE});
ctx.font = '120px serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('🦖', {SIZE}//2, {SIZE}//2);
document.getElementById('img').src = c.toDataURL('image/png');
</script>
</body></html>"""
    html_path = os.path.join(SCRIPT_DIR, "_icon_generator.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"\n⚠️  No emoji font or cairosvg found.")
    print(f"Opening {html_path} in your browser...")
    print(f"Right-click the rendered image → Save as → apple-touch-icon.png")
    print(f"Copy it to game/public/ and admin/public/")
    webbrowser.open(f"file://{html_path}")

if __name__ == "__main__":
    for app in ["game", "admin"]:
        os.makedirs(os.path.join(SCRIPT_DIR, app, "public"), exist_ok=True)

    if try_cairosvg():
        sys.exit(0)
    if try_pillow_emoji():
        sys.exit(0)
    browser_fallback()

