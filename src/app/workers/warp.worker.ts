/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'warp':
        const { imageData, warpType, params } = payload;
        const result = applyWarp(imageData, warpType, params);
        self.postMessage({ type: 'warp', result }, [result.data.buffer]);
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

function applyWarp(imageData: ImageData, warpType: string, params: any): ImageData {
  const result = new ImageData(imageData.width, imageData.height);

  switch (warpType) {
    case 'lens':
      result.data.set(applyLensDistortion(imageData, params.barrel || 0, params.pincushion || 0));
      break;
    case 'rotation':
      result.data.set(applyRotation(imageData, params.angle || 0));
      break;
    default:
      result.data.set(imageData.data);
  }

  return result;
}

function applyLensDistortion(imageData: ImageData, barrel: number, pincushion: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(imageData.data);
  const centerX = imageData.width / 2;
  const centerY = imageData.height / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const r = Math.sqrt(dx * dx + dy * dy) / maxRadius;

      const distortion = barrel * r * r + pincushion * r * r * r * r;
      const newR = r * (1 + distortion);
      const newDx = dx * (newR / (r || 1));
      const newDy = dy * (newR / (r || 1));

      const srcX = centerX + newDx;
      const srcY = centerY + newDy;

      const pixel = bilinearInterpolate(imageData, srcX, srcY);
      const idx = (y * imageData.width + x) * 4;
      data[idx] = pixel.r;
      data[idx + 1] = pixel.g;
      data[idx + 2] = pixel.b;
      data[idx + 3] = pixel.a;
    }
  }

  return data;
}

function applyRotation(imageData: ImageData, angle: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(imageData.data);
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centerX = imageData.width / 2;
  const centerY = imageData.height / 2;

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;

      const srcX = dx * cos - dy * sin + centerX;
      const srcY = dx * sin + dy * cos + centerY;

      const pixel = bilinearInterpolate(imageData, srcX, srcY);
      const idx = (y * imageData.width + x) * 4;
      data[idx] = pixel.r;
      data[idx + 1] = pixel.g;
      data[idx + 2] = pixel.b;
      data[idx + 3] = pixel.a;
    }
  }

  return data;
}

function bilinearInterpolate(img: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = x1 + 1;
  const y2 = y1 + 1;

  const fx = x - x1;
  const fy = y - y1;

  const p11 = getPixel(img, x1, y1);
  const p12 = getPixel(img, x1, y2);
  const p21 = getPixel(img, x2, y1);
  const p22 = getPixel(img, x2, y2);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return {
    r: lerp(lerp(p11.r, p21.r, fx), lerp(p12.r, p22.r, fx), fy),
    g: lerp(lerp(p11.g, p21.g, fx), lerp(p12.g, p22.g, fx), fy),
    b: lerp(lerp(p11.b, p21.b, fx), lerp(p12.b, p22.b, fx), fy),
    a: lerp(lerp(p11.a, p21.a, fx), lerp(p12.a, p22.a, fx), fy)
  };
}

function getPixel(img: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
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

