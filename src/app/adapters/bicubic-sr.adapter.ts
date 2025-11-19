import { SuperResolutionAdapter } from './super-resolution-adapter.interface';
import { getPixel, setPixel } from '../utils/math-helpers';

export class BicubicSrAdapter implements SuperResolutionAdapter {
  name = 'Bicubic';

  async upscale(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
    const newWidth = Math.floor(imageData.width * scaleFactor);
    const newHeight = Math.floor(imageData.height * scaleFactor);
    const result = new ImageData(newWidth, newHeight);

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = x / scaleFactor;
        const srcY = y / scaleFactor;
        
        const pixel = this.bicubicInterpolate(imageData, srcX, srcY);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }

  private bicubicInterpolate(imageData: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const fx = x - x1;
    const fy = y - y1;

    let r = 0, g = 0, b = 0, a = 0;

    for (let j = -1; j <= 2; j++) {
      for (let i = -1; i <= 2; i++) {
        const px = x1 + i;
        const py = y1 + j;
        const pixel = getPixel(imageData, px, py);
        
        const wx = this.cubicWeight(fx - i);
        const wy = this.cubicWeight(fy - j);
        const weight = wx * wy;

        r += pixel.r * weight;
        g += pixel.g * weight;
        b += pixel.b * weight;
        a += pixel.a * weight;
      }
    }

    return {
      r: Math.max(0, Math.min(255, Math.round(r))),
      g: Math.max(0, Math.min(255, Math.round(g))),
      b: Math.max(0, Math.min(255, Math.round(b))),
      a: Math.max(0, Math.min(255, Math.round(a)))
    };
  }

  private cubicWeight(t: number): number {
    const absT = Math.abs(t);
    if (absT <= 1) {
      return 1.5 * absT * absT * absT - 2.5 * absT * absT + 1;
    } else if (absT <= 2) {
      return -0.5 * absT * absT * absT + 2.5 * absT * absT - 4 * absT + 2;
    }
    return 0;
  }
}

