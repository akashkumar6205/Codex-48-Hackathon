"""
WCAG 2.1 AA contrast ratio computation and brand palette analysis.
Computes relative luminance, contrast ratios, and color distance per WCAG specs.
Uses numpy and standard library with optional Pillow acceleration.
"""
import zlib
import struct
import numpy as np
from typing import List, Tuple, Optional, Dict, Any

class ContrastChecker:
    AA_NORMAL_TEXT = 4.5    # Standard text (<= 18pt regular or <= 14pt bold)
    AA_LARGE_TEXT = 3.0     # Large text (> 18pt regular or > 14pt bold) and graphics

    def relative_luminance(self, rgb: Tuple[int, int, int]) -> float:
        """
        Compute relative luminance per WCAG 2.1 formula:
        L = 0.2126 * R + 0.7152 * G + 0.0722 * B
        where channels are linearized from sRGB.
        """
        def linearize(channel_val: int) -> float:
            c = channel_val / 255.0
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

        r = linearize(rgb[0])
        g = linearize(rgb[1])
        b = linearize(rgb[2])
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    def contrast_ratio(self, color1: Tuple[int, int, int], color2: Tuple[int, int, int]) -> float:
        """
        Compute WCAG 2.1 contrast ratio between two RGB colors:
        Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 is lighter and L2 is darker.
        """
        l1 = self.relative_luminance(color1)
        l2 = self.relative_luminance(color2)
        lighter = max(l1, l2)
        darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)

    def extract_dominant_colors(self, image_data: np.ndarray, max_colors: int = 5) -> List[Tuple[int, int, int]]:
        """
        Extract dominant RGB colors from a pixel array using color histogram quantization.
        image_data: H x W x 3 or H x W x 4 numpy array of uint8.
        """
        if image_data is None or image_data.size == 0:
            return [(255, 255, 255), (0, 0, 0)]

        # Flatten pixels to (N, 3)
        rgb_pixels = image_data[:, :, :3].reshape(-1, 3)

        # Downsample for speed if image is large
        if len(rgb_pixels) > 20000:
            step = len(rgb_pixels) // 10000
            rgb_pixels = rgb_pixels[::step]

        # Quantize colors to 5 bits per channel (32 levels per channel, 32768 total buckets)
        quantized = (rgb_pixels // 8) * 8
        unique_colors, counts = np.unique(quantized, axis=0, return_counts=True)

        # Sort by frequency descending
        sorted_indices = np.argsort(counts)[::-1]
        dominant = []
        for idx in sorted_indices:
            color = tuple(int(c) for c in unique_colors[idx])
            # Ensure not nearly identical to an already selected color
            if all(self.color_distance(color, d) > 25 for d in dominant):
                dominant.append(color)
            if len(dominant) >= max_colors:
                break

        return dominant or [(255, 255, 255), (0, 0, 0)]

    def color_distance(self, c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> float:
        """Euclidean distance in sRGB space (approximation of perceptual color distance)."""
        rmean = (c1[0] + c2[0]) / 2.0
        dr = c1[0] - c2[0]
        dg = c1[1] - c2[1]
        db = c1[2] - c2[2]
        # Redmean weighted approximation
        weight_r = 2 + rmean / 256.0
        weight_g = 4.0
        weight_b = 2 + (255 - rmean) / 256.0
        return float(np.sqrt(weight_r * dr * dr + weight_g * dg * dg + weight_b * db * db))

    def check_palette_compliance(
        self,
        image_pixels: np.ndarray,
        brand_palette: List[Tuple[int, int, int]],
        max_distance: float = 60.0
    ) -> List[Dict[str, Any]]:
        """
        Check if dominant colors in the visual asset adhere to the approved brand palette.
        Returns list of off-palette color warnings.
        """
        if not brand_palette:
            return []

        dominant_colors = self.extract_dominant_colors(image_pixels, max_colors=4)
        violations = []

        for color in dominant_colors:
            # Skip near-white, near-black, and transparent neutral backgrounds
            if (color[0] > 240 and color[1] > 240 and color[2] > 240) or (color[0] < 15 and color[1] < 15 and color[2] < 15):
                continue

            min_dist = min(self.color_distance(color, bp) for bp in brand_palette)
            if min_dist > max_distance:
                violations.append({
                    "rgb": color,
                    "hex": "#{:02x}{:02x}{:02x}".format(*color),
                    "min_distance": round(min_dist, 1),
                    "threshold": max_distance
                })

        return violations

    def load_image_pixels(self, file_path: str) -> Tuple[Optional[np.ndarray], Tuple[int, int]]:
        """
        Load image pixels as RGB numpy array.
        Uses Pillow if installed, otherwise uses pure Python PNG decoder.
        Returns (numpy_array, (width, height)).
        """
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                rgb = img.convert("RGB")
                return np.array(rgb), (img.width, img.height)
        except Exception:
            pass

        # Native PNG reader fallback
        try:
            return self._read_png_fallback(file_path)
        except Exception:
            return None, (0, 0)

    def _read_png_fallback(self, file_path: str) -> Tuple[Optional[np.ndarray], Tuple[int, int]]:
        """Pure Python PNG decoder supporting RGB, RGBA, Grayscale, and Palette-indexed (PLTE) images."""
        with open(file_path, "rb") as f:
            data = f.read()

        if len(data) < 8 or data[:8] != b"\x89PNG\r\n\x1a\n":
            return None, (0, 0)

        pos = 8
        width = height = bit_depth = color_type = 0
        idat_chunks = []
        palette = b""

        while pos < len(data) - 4:
            chunk_len = struct.unpack(">I", data[pos:pos+4])[0]
            chunk_type = data[pos+4:pos+8]
            chunk_data = data[pos+8:pos+8+chunk_len]
            pos += 12 + chunk_len

            if chunk_type == b"IHDR":
                width, height, bit_depth, color_type = struct.unpack(">IIBB", chunk_data[:10])
            elif chunk_type == b"PLTE":
                palette = chunk_data
            elif chunk_type == b"IDAT":
                idat_chunks.append(chunk_data)
            elif chunk_type == b"IEND":
                break

        if not idat_chunks or width == 0 or height == 0:
            return None, (width, height)

        # Decompress IDAT
        try:
            decompressed = zlib.decompress(b"".join(idat_chunks))
        except Exception:
            return None, (width, height)

        # Determine bytes per pixel based on color type
        # 0: Grayscale, 2: RGB, 3: Palette, 6: RGBA
        if color_type == 6:
            bytes_per_pixel = 4
        elif color_type == 2:
            bytes_per_pixel = 3
        elif color_type in (0, 3):
            bytes_per_pixel = 1
        else:
            bytes_per_pixel = 3

        stride = 1 + width * bytes_per_pixel
        raw_rows = []

        for y in range(height):
            row_start = y * stride
            if row_start >= len(decompressed):
                break
            filter_type = decompressed[row_start]
            row_data = bytearray(decompressed[row_start+1:min(row_start+stride, len(decompressed))])

            if len(row_data) < width * bytes_per_pixel:
                row_data.extend(b"\x00" * (width * bytes_per_pixel - len(row_data)))

            prev_row = raw_rows[-1] if y > 0 else bytearray(width * bytes_per_pixel)
            for x in range(len(row_data)):
                left = row_data[x - bytes_per_pixel] if x >= bytes_per_pixel else 0
                up = prev_row[x] if x < len(prev_row) else 0
                if filter_type == 1:  # Sub
                    row_data[x] = (row_data[x] + left) & 0xFF
                elif filter_type == 2:  # Up
                    row_data[x] = (row_data[x] + up) & 0xFF
                elif filter_type == 3:  # Average
                    row_data[x] = (row_data[x] + ((left + up) >> 1)) & 0xFF
                elif filter_type == 4:  # Paeth
                    diag = prev_row[x - bytes_per_pixel] if (x >= bytes_per_pixel and x < len(prev_row)) else 0
                    p = left + up - diag
                    pa = abs(p - left)
                    pb = abs(p - up)
                    pc = abs(p - diag)
                    pr = left if (pa <= pb and pa <= pc) else (up if pb <= pc else diag)
                    row_data[x] = (row_data[x] + pr) & 0xFF
            raw_rows.append(row_data)

        if not raw_rows:
            return None, (width, height)

        # Format rows into RGB array
        if color_type == 3 and palette:
            # Indexed color: map each byte through PLTE
            palette_entries = np.frombuffer(palette, dtype=np.uint8).reshape(-1, 3)
            indices = np.frombuffer(b"".join(raw_rows), dtype=np.uint8)
            # Clip indices within palette bounds
            indices = np.clip(indices, 0, len(palette_entries) - 1)
            arr = palette_entries[indices].reshape((height, width, 3))
        else:
            flat_bytes = b"".join(raw_rows)
            expected_len = height * width * bytes_per_pixel
            if len(flat_bytes) > expected_len:
                flat_bytes = flat_bytes[:expected_len]
            arr = np.frombuffer(flat_bytes, dtype=np.uint8).reshape((height, width, bytes_per_pixel))
            if color_type == 6:
                arr = arr[:, :, :3]
            elif color_type == 0:
                arr = np.repeat(arr, 3, axis=2)

        return arr, (width, height)

contrast_checker = ContrastChecker()
