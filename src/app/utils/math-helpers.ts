export type InterpolationMethod = 'nearest' | 'bilinear' | 'bicubic' | 'lanczos';

export function interpolateNearest(src: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const px = Math.round(x);
  const py = Math.round(y);
  return getPixel(src, px, py);
}

export function interpolateBilinear(src: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = x1 + 1;
  const y2 = y1 + 1;

  const fx = x - x1;
  const fy = y - y1;

  const p11 = getPixel(src, x1, y1);
  const p12 = getPixel(src, x1, y2);
  const p21 = getPixel(src, x2, y1);
  const p22 = getPixel(src, x2, y2);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return {
    r: lerp(lerp(p11.r, p21.r, fx), lerp(p12.r, p22.r, fx), fy),
    g: lerp(lerp(p11.g, p21.g, fx), lerp(p12.g, p22.g, fx), fy),
    b: lerp(lerp(p11.b, p21.b, fx), lerp(p12.b, p22.b, fx), fy),
    a: lerp(lerp(p11.a, p21.a, fx), lerp(p12.a, p22.a, fx), fy)
  };
}

export function getPixel(img: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const index = (y * img.width + x) * 4;
  return {
    r: img.data[index],
    g: img.data[index + 1],
    b: img.data[index + 2],
    a: img.data[index + 3]
  };
}

export function setPixel(img: ImageData, x: number, y: number, r: number, g: number, b: number, a: number): void {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) {
    return;
  }

  const index = (y * img.width + x) * 4;
  img.data[index] = r;
  img.data[index + 1] = g;
  img.data[index + 2] = b;
  img.data[index + 3] = a;
}

export function applyMatrix3x3(img: ImageData, matrix: number[][]): ImageData {
  const result = new ImageData(img.width, img.height);
  const [a, b, c, d, e, f, g, h, i] = matrix.flat();

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const denominator = g * x + h * y + i;
      if (Math.abs(denominator) < 0.0001) continue;

      const srcX = (a * x + b * y + c) / denominator;
      const srcY = (d * x + e * y + f) / denominator;

      const pixel = interpolateBilinear(img, srcX, srcY);
      setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
    }
  }

  return result;
}

