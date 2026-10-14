"""Render measured source elevation and hillshade; requires numpy and Pillow."""
from pathlib import Path
import gzip
import struct
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def read_base(path):
    raw = gzip.decompress(path.read_bytes())
    assert raw[:4] == b'HRGN' and struct.unpack_from('<H', raw, 4)[0] == 1
    datum = struct.unpack_from('<i', raw, 22)[0] * 0.5
    size, spacing = struct.unpack_from('<Hd', raw, 28)
    heights = np.frombuffer(raw, '<i2', size * size, 38).reshape(size, size) * 0.5 - datum
    return heights, spacing


def render(region, title):
    folder = ROOT / 'public/moon' / region
    heights, spacing = read_base(folder / 'lola.bin.gz')
    low, high = heights.min(), heights.max()
    t = (heights - low) / max(high - low, 1)
    palette = np.array([[44, 75, 100], [89, 133, 146], [154, 170, 143], [207, 181, 132], [244, 231, 197]])
    rgb = np.stack([np.interp(t, np.linspace(0, 1, len(palette)), palette[:, c]) for c in range(3)], axis=-1)
    dz, dx = np.gradient(heights, spacing)
    normal = np.stack([-dx, np.ones_like(dx), -dz], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    light = np.array([-0.6, 0.6, -0.5]); light /= np.linalg.norm(light)
    shade = np.clip(np.sum(normal * light, axis=-1), 0, 1)
    grey = np.repeat(((shade * 0.8 + 0.15) * 255)[..., None], 3, axis=2)
    output = Image.new('RGB', (1600, 900), '#101519')
    draw = ImageDraw.Draw(output)
    draw.text((30, 20), title + ' / measured LOLA base', fill='#e5e9e8', font_size=26)
    for index, pixels in enumerate([rgb, grey]):
        image = Image.fromarray(pixels.astype('uint8')).resize((750, 750), Image.Resampling.BILINEAR)
        output.paste(image, (30 + 790 * index, 85))
    draw.text((30, 57), f'Elevation relative to anchor: {low:.0f} to {high:.0f} m', fill='#a8b4b8', font_size=18)
    draw.text((820, 57), 'Hillshade / north up / light from northwest', fill='#a8b4b8', font_size=18)
    draw.text((30, 850), f'{heights.shape[0] * spacing / 1000:.0f} km square | 118 m source DEM resampled to {spacing:g} m grid; no added measurement detail', fill='#a8b4b8', font_size=18)
    draw.text((30, 877), 'NASA / GSFC LOLA team; USGS Astrogeology. Authored game landforms and materials are absent here.', fill='#a8b4b8', font_size=16)
    output.save(folder / 'source-relief.png')


if __name__ == '__main__':
    render('shackleton', 'Shackleton ridge')
    render('marius', 'Marius Hills')
