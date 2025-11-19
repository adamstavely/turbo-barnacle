import { Injectable } from '@angular/core';
import { getPixel, setPixel, interpolateBilinear } from '../utils/math-helpers';

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {
  
  applyBrightness(imageData: ImageData, value: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const factor = value; // -100 to 100, mapped to -1 to 1

    for (let i = 0; i < imageData.data.length; i += 4) {
      result.data[i] = Math.max(0, Math.min(255, imageData.data[i] + factor * 255));
      result.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + factor * 255));
      result.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + factor * 255));
      result.data[i + 3] = imageData.data[i + 3];
    }

    return result;
  }

  applyContrast(imageData: ImageData, value: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const factor = (259 * (value * 255 + 255)) / (255 * (259 - value * 255));

    for (let i = 0; i < imageData.data.length; i += 4) {
      result.data[i] = Math.max(0, Math.min(255, factor * (imageData.data[i] - 128) + 128));
      result.data[i + 1] = Math.max(0, Math.min(255, factor * (imageData.data[i + 1] - 128) + 128));
      result.data[i + 2] = Math.max(0, Math.min(255, factor * (imageData.data[i + 2] - 128) + 128));
      result.data[i + 3] = imageData.data[i + 3];
    }

    return result;
  }

  applySaturation(imageData: ImageData, value: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const factor = value; // -1 to 1

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      result.data[i] = Math.max(0, Math.min(255, gray + factor * (r - gray)));
      result.data[i + 1] = Math.max(0, Math.min(255, gray + factor * (g - gray)));
      result.data[i + 2] = Math.max(0, Math.min(255, gray + factor * (b - gray)));
      result.data[i + 3] = imageData.data[i + 3];
    }

    return result;
  }

  applyGamma(imageData: ImageData, value: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const gamma = value; // 0.1 to 3.0
    const lookup = new Array(256);

    for (let i = 0; i < 256; i++) {
      lookup[i] = Math.pow(i / 255, 1 / gamma) * 255;
    }

    for (let i = 0; i < imageData.data.length; i += 4) {
      result.data[i] = lookup[imageData.data[i]];
      result.data[i + 1] = lookup[imageData.data[i + 1]];
      result.data[i + 2] = lookup[imageData.data[i + 2]];
      result.data[i + 3] = imageData.data[i + 3];
    }

    return result;
  }

  applySharpen(imageData: ImageData, amount: number): ImageData {
    const kernel = [
      0, -amount, 0,
      -amount, 1 + 4 * amount, -amount,
      0, -amount, 0
    ];
    return this.applyConvolution(imageData, kernel, 3);
  }

  applyDenoiseGaussian(imageData: ImageData, radius: number): ImageData {
    const size = Math.ceil(radius * 2) * 2 + 1;
    const kernel = this.createGaussianKernel(size, radius);
    return this.applyConvolution(imageData, kernel, size);
  }

  applyDenoiseMedian(imageData: ImageData, radius: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const r = Math.floor(radius);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const values: number[][] = [];

        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
              const pixel = getPixel(imageData, px, py);
              values.push([pixel.r, pixel.g, pixel.b]);
            }
          }
        }

        values.sort((a, b) => {
          const avgA = (a[0] + a[1] + a[2]) / 3;
          const avgB = (b[0] + b[1] + b[2]) / 3;
          return avgA - avgB;
        });

        const median = values[Math.floor(values.length / 2)];
        setPixel(result, x, y, median[0], median[1], median[2], 255);
      }
    }

    return result;
  }

  applyBinarizationOtsu(imageData: ImageData): ImageData {
    // Convert to grayscale first
    const gray = this.toGrayscale(imageData);
    
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < gray.data.length; i += 4) {
      histogram[gray.data[i]]++;
    }

    // Calculate Otsu threshold
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    const totalPixels = imageData.width * imageData.height;

    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;

      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = i;
      }
    }

    // Apply threshold
    const result = new ImageData(imageData.width, imageData.height);
    for (let i = 0; i < gray.data.length; i += 4) {
      const value = gray.data[i] > threshold ? 255 : 0;
      result.data[i] = value;
      result.data[i + 1] = value;
      result.data[i + 2] = value;
      result.data[i + 3] = 255;
    }

    return result;
  }

  autoLightingCorrection(imageData: ImageData): ImageData {
    // Calculate average brightness
    let sum = 0;
    let count = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
      sum += gray;
      count++;
    }

    const avgBrightness = sum / count;
    const targetBrightness = 128;
    const adjustment = (targetBrightness - avgBrightness) / 255;

    return this.applyBrightness(imageData, adjustment);
  }

  applyCLAHE(imageData: ImageData, tileSize: number = 8, clipLimit: number = 2.0): ImageData {
    const gray = this.toGrayscale(imageData);
    const result = new ImageData(imageData.width, imageData.height);
    const tilesX = Math.ceil(imageData.width / tileSize);
    const tilesY = Math.ceil(imageData.height / tileSize);

    // Process each tile
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x0 = tx * tileSize;
        const y0 = ty * tileSize;
        const x1 = Math.min(x0 + tileSize, imageData.width);
        const y1 = Math.min(y0 + tileSize, imageData.height);

        // Calculate histogram for tile
        const histogram = new Array(256).fill(0);
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const pixel = getPixel(gray, x, y);
            histogram[pixel.r]++;
          }
        }

        // Clip histogram
        const clipped = this.clipHistogram(histogram, clipLimit);
        const cdf = this.calculateCDF(clipped);
        const maxCDF = cdf[255];

        // Apply transformation
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const pixel = getPixel(gray, x, y);
            const value = Math.round((cdf[pixel.r] / maxCDF) * 255);
            setPixel(result, x, y, value, value, value, 255);
          }
        }
      }
    }

    return result;
  }

  removeShadows(imageData: ImageData, threshold: number = 0.3): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const gray = this.toGrayscale(imageData);

    // Create morphological opening to estimate background
    const background = this.morphologicalOpening(gray, 5);

    // Subtract background and enhance
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const orig = getPixel(imageData, x, y);
        const bg = getPixel(background, x, y);
        const diff = bg.r - orig.r;

        if (diff > threshold * 255) {
          // Shadow detected, lighten it
          const factor = 1 + (diff / 255) * 0.5;
          const r = Math.min(255, orig.r * factor);
          const g = Math.min(255, orig.g * factor);
          const b = Math.min(255, orig.b * factor);
          setPixel(result, x, y, r, g, b, orig.a);
        } else {
          setPixel(result, x, y, orig.r, orig.g, orig.b, orig.a);
        }
      }
    }

    return result;
  }

  removeGlare(imageData: ImageData, threshold: number = 0.9): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const gray = this.toGrayscale(imageData);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const pixel = getPixel(imageData, x, y);
        const grayValue = getPixel(gray, x, y).r / 255;

        if (grayValue > threshold) {
          // Glare detected, use inpainting (simple: average of neighbors)
          const neighbors = this.getNeighborAverage(imageData, x, y, 3);
          setPixel(result, x, y, neighbors.r, neighbors.g, neighbors.b, pixel.a);
        } else {
          setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
        }
      }
    }

    return result;
  }

  whitenBackground(imageData: ImageData, threshold: number = 0.85): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const gray = this.toGrayscale(imageData);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const pixel = getPixel(imageData, x, y);
        const grayValue = getPixel(gray, x, y).r / 255;

        if (grayValue > threshold) {
          // Background detected, whiten it
          const factor = (grayValue - threshold) / (1 - threshold);
          const r = Math.min(255, pixel.r + (255 - pixel.r) * factor);
          const g = Math.min(255, pixel.g + (255 - pixel.g) * factor);
          const b = Math.min(255, pixel.b + (255 - pixel.b) * factor);
          setPixel(result, x, y, r, g, b, pixel.a);
        } else {
          setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
        }
      }
    }

    return result;
  }

  applyBinarizationNiblack(imageData: ImageData, windowSize: number = 15, k: number = -0.2): ImageData {
    const gray = this.toGrayscale(imageData);
    const result = new ImageData(imageData.width, imageData.height);
    const halfWindow = Math.floor(windowSize / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;

        // Calculate local mean and std dev
        for (let dy = -halfWindow; dy <= halfWindow; dy++) {
          for (let dx = -halfWindow; dx <= halfWindow; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
              const pixel = getPixel(gray, px, py);
              const value = pixel.r;
              sum += value;
              sumSq += value * value;
              count++;
            }
          }
        }

        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const stdDev = Math.sqrt(variance);
        const threshold = mean + k * stdDev;

        const pixel = getPixel(gray, x, y);
        const value = pixel.r > threshold ? 255 : 0;
        setPixel(result, x, y, value, value, value, 255);
      }
    }

    return result;
  }

  applyBinarizationSauvola(imageData: ImageData, windowSize: number = 15, k: number = 0.5, R: number = 128): ImageData {
    const gray = this.toGrayscale(imageData);
    const result = new ImageData(imageData.width, imageData.height);
    const halfWindow = Math.floor(windowSize / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let sum = 0;
        let sumSq = 0;
        let count = 0;

        // Calculate local mean and std dev
        for (let dy = -halfWindow; dy <= halfWindow; dy++) {
          for (let dx = -halfWindow; dx <= halfWindow; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
              const pixel = getPixel(gray, px, py);
              const value = pixel.r;
              sum += value;
              sumSq += value * value;
              count++;
            }
          }
        }

        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const stdDev = Math.sqrt(variance);
        const threshold = mean * (1 + k * (stdDev / R - 1));

        const pixel = getPixel(gray, x, y);
        const value = pixel.r > threshold ? 255 : 0;
        setPixel(result, x, y, value, value, value, 255);
      }
    }

    return result;
  }

  applyEdgeEnhancement(imageData: ImageData, strength: number = 1.0): ImageData {
    // Sobel edge detection kernel
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const gray = this.toGrayscale(imageData);
    const edges = new ImageData(imageData.width, imageData.height);

    // Detect edges
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < imageData.width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = getPixel(gray, x + kx, y + ky);
            const idx = (ky + 1) * 3 + (kx + 1);
            gx += pixel.r * sobelX[idx];
            gy += pixel.r * sobelY[idx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const value = Math.min(255, magnitude);
        setPixel(edges, x, y, value, value, value, 255);
      }
    }

    // Add edges to original
    const result = new ImageData(imageData.width, imageData.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const edgeValue = edges.data[i];
      result.data[i] = Math.min(255, imageData.data[i] + edgeValue * strength);
      result.data[i + 1] = Math.min(255, imageData.data[i + 1] + edgeValue * strength);
      result.data[i + 2] = Math.min(255, imageData.data[i + 2] + edgeValue * strength);
      result.data[i + 3] = imageData.data[i + 3];
    }

    return result;
  }

  applyDenoiseBilateral(imageData: ImageData, spatialSigma: number = 5, colorSigma: number = 50): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const windowSize = Math.ceil(spatialSigma * 3) * 2 + 1;
    const halfWindow = Math.floor(windowSize / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const centerPixel = getPixel(imageData, x, y);
        let weightSum = 0;
        let rSum = 0, gSum = 0, bSum = 0;

        for (let dy = -halfWindow; dy <= halfWindow; dy++) {
          for (let dx = -halfWindow; dx <= halfWindow; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
              const pixel = getPixel(imageData, px, py);
              
              // Spatial weight
              const spatialDist = Math.sqrt(dx * dx + dy * dy);
              const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma));

              // Color weight
              const colorDist = Math.sqrt(
                Math.pow(pixel.r - centerPixel.r, 2) +
                Math.pow(pixel.g - centerPixel.g, 2) +
                Math.pow(pixel.b - centerPixel.b, 2)
              );
              const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * colorSigma * colorSigma));

              const weight = spatialWeight * colorWeight;
              rSum += pixel.r * weight;
              gSum += pixel.g * weight;
              bSum += pixel.b * weight;
              weightSum += weight;
            }
          }
        }

        setPixel(result, x, y, rSum / weightSum, gSum / weightSum, bSum / weightSum, centerPixel.a);
      }
    }

    return result;
  }

  private clipHistogram(histogram: number[], clipLimit: number): number[] {
    const clipped = [...histogram];
    const totalPixels = histogram.reduce((a, b) => a + b, 0);
    const clipLevel = Math.floor(totalPixels * clipLimit / 256);

    let excess = 0;
    for (let i = 0; i < 256; i++) {
      if (clipped[i] > clipLevel) {
        excess += clipped[i] - clipLevel;
        clipped[i] = clipLevel;
      }
    }

    // Redistribute excess
    const increment = excess / 256;
    for (let i = 0; i < 256; i++) {
      clipped[i] += increment;
    }

    return clipped;
  }

  private calculateCDF(histogram: number[]): number[] {
    const cdf = new Array(256);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    return cdf;
  }

  private morphologicalOpening(imageData: ImageData, size: number): ImageData {
    // Erosion followed by dilation
    const eroded = this.morphologicalErosion(imageData, size);
    return this.morphologicalDilation(eroded, size);
  }

  private morphologicalErosion(imageData: ImageData, size: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const half = Math.floor(size / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let min = 255;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
              const pixel = getPixel(imageData, px, py);
              const gray = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
              min = Math.min(min, gray);
            }
          }
        }
        setPixel(result, x, y, min, min, min, 255);
      }
    }
    return result;
  }

  private morphologicalDilation(imageData: ImageData, size: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const half = Math.floor(size / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let max = 0;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
              const pixel = getPixel(imageData, px, py);
              const gray = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
              max = Math.max(max, gray);
            }
          }
        }
        setPixel(result, x, y, max, max, max, 255);
      }
    }
    return result;
  }

  private getNeighborAverage(imageData: ImageData, x: number, y: number, radius: number): { r: number; g: number; b: number } {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
          const pixel = getPixel(imageData, px, py);
          rSum += pixel.r;
          gSum += pixel.g;
          bSum += pixel.b;
          count++;
        }
      }
    }

    return {
      r: count > 0 ? rSum / count : 0,
      g: count > 0 ? gSum / count : 0,
      b: count > 0 ? bSum / count : 0
    };
  }

  private toGrayscale(imageData: ImageData): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
      result.data[i] = gray;
      result.data[i + 1] = gray;
      result.data[i + 2] = gray;
      result.data[i + 3] = imageData.data[i + 3];
    }
    return result;
  }

  private applyConvolution(imageData: ImageData, kernel: number[], size: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const half = Math.floor(size / 2);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let r = 0, g = 0, b = 0, a = 255;

        for (let ky = 0; ky < size; ky++) {
          for (let kx = 0; kx < size; kx++) {
            const px = x + kx - half;
            const py = y + ky - half;
            const pixel = getPixel(imageData, px, py);
            const weight = kernel[ky * size + kx];

            r += pixel.r * weight;
            g += pixel.g * weight;
            b += pixel.b * weight;
          }
        }

        result.data[(y * imageData.width + x) * 4] = Math.max(0, Math.min(255, r));
        result.data[(y * imageData.width + x) * 4 + 1] = Math.max(0, Math.min(255, g));
        result.data[(y * imageData.width + x) * 4 + 2] = Math.max(0, Math.min(255, b));
        result.data[(y * imageData.width + x) * 4 + 3] = a;
      }
    }

    return result;
  }

  private createGaussianKernel(size: number, sigma: number): number[] {
    const kernel: number[] = [];
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        kernel.push(value);
        sum += value;
      }
    }

    // Normalize
    return kernel.map(v => v / sum);
  }
}

