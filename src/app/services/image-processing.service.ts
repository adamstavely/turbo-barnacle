import { Injectable } from '@angular/core';
import { getPixel, setPixel, interpolateBilinear } from '../utils/math-helpers';
import { WorkerManagerService } from './worker-manager.service';

@Injectable({
  providedIn: 'root'
})
export class ImageProcessingService {
  constructor(private workerManager?: WorkerManagerService) {}
  
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

  async applyDenoiseBilateralAsync(imageData: ImageData, spatialSigma: number = 5, colorSigma: number = 50): Promise<ImageData> {
    if (this.workerManager) {
      try {
        const worker = await this.workerManager.getFilterWorker();
        return new Promise((resolve, reject) => {
          worker.onmessage = (event) => {
            if (event.data.type === 'process') {
              resolve(event.data.result);
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.error));
            }
          };
          worker.onerror = reject;
          worker.postMessage({
            type: 'process',
            payload: {
              imageData,
              filter: 'bilateral',
              params: { spatialSigma, colorSigma }
            }
          }, [imageData.data.buffer]);
        });
      } catch (error) {
        console.warn('Worker failed, falling back to synchronous processing:', error);
      }
    }
    // Fallback to synchronous processing
    return this.applyDenoiseBilateral(imageData, spatialSigma, colorSigma);
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

  /**
   * Apply super-resolution upscaling (basic implementation)
   * Uses bicubic interpolation for upscaling
   */
  async removeMoireAsync(imageData: ImageData, intensity: number): Promise<ImageData> {
    if (this.workerManager) {
      try {
        const worker = await this.workerManager.getMoireWorker();
        return new Promise((resolve, reject) => {
          worker.onmessage = (event) => {
            if (event.data.type === 'process') {
              resolve(event.data.result);
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.error));
            }
          };
          worker.onerror = reject;
          worker.postMessage({
            type: 'process',
            payload: {
              imageData,
              intensity
            }
          }, [imageData.data.buffer]);
        });
      } catch (error) {
        console.warn('Worker failed, falling back to synchronous processing:', error);
      }
    }
    // Fallback to synchronous processing
    return this.removeMoire(imageData, intensity);
  }

  removeMoire(imageData: ImageData, intensity: number): ImageData {
    // Synchronous fallback implementation
    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);
    
    if (intensity === 0) {
      return result;
    }
    
    const strength = intensity / 100;
    const kernelSize = Math.max(3, Math.floor(5 * strength));
    const halfKernel = Math.floor(kernelSize / 2);
    
    // Simple spatial domain notch filter
    for (let y = halfKernel; y < imageData.height - halfKernel; y++) {
      for (let x = halfKernel; x < imageData.width - halfKernel; x++) {
        let rSum = 0, gSum = 0, bSum = 0;
        let count = 0;
        
        // Average with edge-preserving
        for (let dy = -halfKernel; dy <= halfKernel; dy++) {
          for (let dx = -halfKernel; dx <= halfKernel; dx++) {
            const px = x + dx;
            const py = y + dy;
            const idx = (py * imageData.width + px) * 4;
            
            // Weight by distance from center
            const dist = Math.sqrt(dx * dx + dy * dy);
            const weight = Math.exp(-dist * dist / (2 * strength * strength));
            
            rSum += imageData.data[idx] * weight;
            gSum += imageData.data[idx + 1] * weight;
            bSum += imageData.data[idx + 2] * weight;
            count += weight;
          }
        }
        
        const idx = (y * imageData.width + x) * 4;
        result.data[idx] = Math.max(0, Math.min(255, rSum / count));
        result.data[idx + 1] = Math.max(0, Math.min(255, gSum / count));
        result.data[idx + 2] = Math.max(0, Math.min(255, bSum / count));
        result.data[idx + 3] = imageData.data[idx + 3];
      }
    }
    
    return result;
  }

  isolateColorChannel(imageData: ImageData, channel: 'red' | 'green' | 'blue' | 'hue' | 'saturation' | 'value' | 'lightness' | 'a-channel' | 'b-channel' | null): ImageData {
    if (!channel) {
      return imageData; // Return original if no channel selected
    }

    const result = new ImageData(imageData.width, imageData.height);

    if (channel === 'red' || channel === 'green' || channel === 'blue') {
      // RGB channels
      const channelIndex = channel === 'red' ? 0 : channel === 'green' ? 1 : 2;
      for (let i = 0; i < imageData.data.length; i += 4) {
        result.data[i + channelIndex] = imageData.data[i + channelIndex];
        result.data[i + (channelIndex === 0 ? 1 : 0)] = 0;
        result.data[i + (channelIndex === 2 ? 1 : 2)] = 0;
        result.data[i + 3] = imageData.data[i + 3];
      }
    } else if (channel === 'hue' || channel === 'saturation' || channel === 'value') {
      // HSV channels
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i] / 255;
        const g = imageData.data[i + 1] / 255;
        const b = imageData.data[i + 2] / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0, s = 0, v = max;
        
        if (delta !== 0) {
          s = delta / max;
          if (max === r) {
            h = ((g - b) / delta) % 6;
          } else if (max === g) {
            h = (b - r) / delta + 2;
          } else {
            h = (r - g) / delta + 4;
          }
          h /= 6;
        }
        
        if (channel === 'hue') {
          // Display hue as RGB
          const rgb = this.hsvToRgb(h, 1, 1);
          result.data[i] = rgb.r;
          result.data[i + 1] = rgb.g;
          result.data[i + 2] = rgb.b;
        } else if (channel === 'saturation') {
          const gray = Math.round(s * 255);
          result.data[i] = gray;
          result.data[i + 1] = gray;
          result.data[i + 2] = gray;
        } else { // value
          const gray = Math.round(v * 255);
          result.data[i] = gray;
          result.data[i + 1] = gray;
          result.data[i + 2] = gray;
        }
        result.data[i + 3] = imageData.data[i + 3];
      }
    } else if (channel === 'lightness' || channel === 'a-channel' || channel === 'b-channel') {
      // Lab color space channels
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i] / 255;
        const g = imageData.data[i + 1] / 255;
        const b = imageData.data[i + 2] / 255;
        
        // Convert RGB to Lab (simplified)
        const lab = this.rgbToLab(r, g, b);
        
        if (channel === 'lightness') {
          const gray = Math.round((lab.l / 100) * 255);
          result.data[i] = gray;
          result.data[i + 1] = gray;
          result.data[i + 2] = gray;
        } else if (channel === 'a-channel') {
          // Map a* channel (-128 to 127) to 0-255
          const gray = Math.round((lab.a + 128) / 255 * 255);
          result.data[i] = gray;
          result.data[i + 1] = gray;
          result.data[i + 2] = gray;
        } else { // b-channel
          const gray = Math.round((lab.b + 128) / 255 * 255);
          result.data[i] = gray;
          result.data[i + 1] = gray;
          result.data[i + 2] = gray;
        }
        result.data[i + 3] = imageData.data[i + 3];
      }
    }

    return result;
  }

  private hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 1/6) {
      r = c; g = x; b = 0;
    } else if (h < 2/6) {
      r = x; g = c; b = 0;
    } else if (h < 3/6) {
      r = 0; g = c; b = x;
    } else if (h < 4/6) {
      r = 0; g = x; b = c;
    } else if (h < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  private rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
    // Convert RGB to XYZ
    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    
    // Apply gamma correction
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    // Convert to Lab
    const l = (116 * y) - 16;
    const a = 500 * (x - y);
    const bVal = 200 * (y - z);
    
    return { l, a, b: bVal };
  }

  async removeHighlightsAsync(imageData: ImageData, intensity: 'soft' | 'medium' | 'aggressive'): Promise<ImageData> {
    if (this.workerManager) {
      try {
        const worker = await this.workerManager.getHighlightWorker();
        return new Promise((resolve, reject) => {
          worker.onmessage = (event) => {
            if (event.data.type === 'process') {
              resolve(event.data.result);
            } else if (event.data.type === 'error') {
              reject(new Error(event.data.error));
            }
          };
          worker.onerror = reject;
          worker.postMessage({
            type: 'process',
            payload: {
              imageData,
              intensity
            }
          }, [imageData.data.buffer]);
        });
      } catch (error) {
        console.warn('Worker failed, falling back to synchronous processing:', error);
      }
    }
    // Fallback to synchronous processing
    return this.removeHighlights(imageData, intensity);
  }

  removeHighlights(imageData: ImageData, intensity: 'soft' | 'medium' | 'aggressive'): ImageData {
    // Synchronous fallback - same logic as worker
    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);

    const opacityReduction = {
      soft: 0.3,
      medium: 0.6,
      aggressive: 1.0
    };

    const reduction = opacityReduction[intensity];

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i] / 255;
      const g = imageData.data[i + 1] / 255;
      const b = imageData.data[i + 2] / 255;
      const a = imageData.data[i + 3];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      let h = 0;
      if (delta !== 0) {
        if (max === r) {
          h = ((g - b) / delta) % 6;
        } else if (max === g) {
          h = (b - r) / delta + 2;
        } else {
          h = (r - g) / delta + 4;
        }
        h /= 6;
      }

      const s = max === 0 ? 0 : delta / max;
      const v = max;

      let isHighlight = false;
      if (h >= 0.14 && h <= 0.19 && s > 0.3 && v > 0.5) {
        isHighlight = true; // Yellow
      } else if ((h >= 0.92 || h <= 0.06) && s > 0.3 && v > 0.5) {
        isHighlight = true; // Pink
      } else if (h >= 0.28 && h <= 0.42 && s > 0.3 && v > 0.5) {
        isHighlight = true; // Green
      }

      if (isHighlight) {
        const x = Math.floor((i / 4) % imageData.width);
        const y = Math.floor((i / 4) / imageData.width);
        const neighbors = this.getNeighborAverage(imageData, x, y, reduction >= 1.0 ? 3 : 5);
        
        if (reduction >= 1.0) {
          result.data[i] = neighbors.r;
          result.data[i + 1] = neighbors.g;
          result.data[i + 2] = neighbors.b;
        } else {
          result.data[i] = Math.round(imageData.data[i] * (1 - reduction) + neighbors.r * reduction);
          result.data[i + 1] = Math.round(imageData.data[i + 1] * (1 - reduction) + neighbors.g * reduction);
          result.data[i + 2] = Math.round(imageData.data[i + 2] * (1 - reduction) + neighbors.b * reduction);
        }
        result.data[i + 3] = a;
      }
    }

    return result;
  }

  // Deprecated: Use SuperResolutionService instead
  applySuperResolution(imageData: ImageData, scaleFactor: number = 2): ImageData {
    // Fallback implementation using bicubic
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

