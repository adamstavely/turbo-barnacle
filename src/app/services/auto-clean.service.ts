import { Injectable } from '@angular/core';
import { getPixel } from '../utils/math-helpers';

export interface AutoCleanRecommendations {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
  sharpen?: number;
  denoise?: number;
  binarization?: boolean;
  binarizationMethod?: 'otsu' | 'niblack' | 'sauvola';
  autoDeskew?: boolean;
  curvatureFlattening?: number;
  removeShadows?: boolean;
  removeGlare?: boolean;
  whitenBackground?: boolean;
  clahe?: boolean;
  confidence: number;
  reasoning: string[];
  transformations?: Array<{ name: string; params?: any; timestamp: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class AutoCleanService {
  
  /**
   * Analyze image and provide automatic enhancement recommendations
   */
  analyzeAndRecommend(imageData: ImageData): AutoCleanRecommendations {
    const recommendations: AutoCleanRecommendations = {
      confidence: 0,
      reasoning: [],
      transformations: []
    };

    // Analyze image characteristics
    const stats = this.analyzeImage(imageData);
    
    // Brightness analysis
    if (stats.averageBrightness < 100) {
      recommendations.brightness = Math.min(0.3, (100 - stats.averageBrightness) / 255);
      recommendations.reasoning.push(`Image is dark (avg brightness: ${stats.averageBrightness.toFixed(0)}). Suggest brightness increase.`);
      recommendations.transformations!.push({ name: 'brightness', params: { value: recommendations.brightness }, timestamp: Date.now() });
    } else if (stats.averageBrightness > 200) {
      recommendations.brightness = -0.1;
      recommendations.reasoning.push(`Image is bright (avg brightness: ${stats.averageBrightness.toFixed(0)}). Suggest slight brightness decrease.`);
      recommendations.transformations!.push({ name: 'brightness', params: { value: recommendations.brightness }, timestamp: Date.now() });
    }

    // Contrast analysis
    if (stats.contrast < 30) {
      recommendations.contrast = 0.2;
      recommendations.reasoning.push(`Low contrast detected (${stats.contrast.toFixed(0)}). Suggest contrast increase.`);
      recommendations.transformations!.push({ name: 'contrast', params: { value: recommendations.contrast }, timestamp: Date.now() });
    }

    // Noise analysis
    if (stats.noiseLevel > 15) {
      recommendations.denoise = Math.min(3, stats.noiseLevel / 10);
      recommendations.reasoning.push(`High noise detected (${stats.noiseLevel.toFixed(1)}). Suggest denoising.`);
      recommendations.transformations!.push({ name: 'denoise', params: { value: recommendations.denoise }, timestamp: Date.now() });
    }

    // Blur analysis
    if (stats.sharpness < 50) {
      recommendations.sharpen = 0.3;
      recommendations.reasoning.push(`Image appears blurry (sharpness: ${stats.sharpness.toFixed(0)}). Suggest sharpening.`);
      recommendations.transformations!.push({ name: 'sharpen', params: { value: recommendations.sharpen }, timestamp: Date.now() });
    }

    // Skew analysis
    if (stats.skewAngle > 1 || stats.skewAngle < -1) {
      recommendations.autoDeskew = true;
      recommendations.reasoning.push(`Image appears skewed (${stats.skewAngle.toFixed(1)}°). Suggest auto-deskew.`);
      recommendations.transformations!.push({ name: 'autoDeskew', timestamp: Date.now() });
    }

    // Shadow/glare detection
    if (stats.shadowRatio > 0.2) {
      recommendations.removeShadows = true;
      recommendations.reasoning.push(`Shadows detected (${(stats.shadowRatio * 100).toFixed(0)}%). Suggest shadow removal.`);
      recommendations.transformations!.push({ name: 'removeShadows', timestamp: Date.now() });
    }

    if (stats.glareRatio > 0.1) {
      recommendations.removeGlare = true;
      recommendations.reasoning.push(`Glare detected (${(stats.glareRatio * 100).toFixed(0)}%). Suggest glare removal.`);
      recommendations.transformations!.push({ name: 'removeGlare', timestamp: Date.now() });
    }

    // Background analysis
    if (stats.backgroundBrightness < 200) {
      recommendations.whitenBackground = true;
      recommendations.reasoning.push(`Background is not white (brightness: ${stats.backgroundBrightness.toFixed(0)}). Suggest background whitening.`);
      recommendations.transformations!.push({ name: 'whitenBackground', timestamp: Date.now() });
    }

    // Text clarity analysis
    if (stats.textClarity < 0.6) {
      recommendations.binarization = true;
      recommendations.binarizationMethod = 'otsu';
      recommendations.reasoning.push(`Text clarity is low (${(stats.textClarity * 100).toFixed(0)}%). Suggest binarization.`);
      recommendations.transformations!.push({ name: 'binarization', params: { method: recommendations.binarizationMethod }, timestamp: Date.now() });
    }

    // Always suggest CLAHE for better contrast
    recommendations.clahe = true;
    recommendations.transformations!.push({ name: 'clahe', timestamp: Date.now() });

    // Calculate confidence based on number of recommendations
    const recommendationCount = Object.keys(recommendations).filter(
      key => key !== 'confidence' && key !== 'reasoning' && recommendations[key as keyof AutoCleanRecommendations] !== undefined
    ).length;
    
    recommendations.confidence = Math.min(0.95, 0.5 + (recommendationCount * 0.1));

    return recommendations;
  }

  /**
   * Analyze image statistics
   */
  private analyzeImage(imageData: ImageData): {
    averageBrightness: number;
    contrast: number;
    noiseLevel: number;
    sharpness: number;
    skewAngle: number;
    shadowRatio: number;
    glareRatio: number;
    backgroundBrightness: number;
    textClarity: number;
  } {
    let totalBrightness = 0;
    let minBrightness = 255;
    let maxBrightness = 0;
    let pixelCount = 0;
    const brightnessValues: number[] = [];

    // Sample pixels for performance (every 10th pixel)
    for (let i = 0; i < imageData.data.length; i += 40) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const brightness = (r + g + b) / 3;
      
      totalBrightness += brightness;
      brightnessValues.push(brightness);
      minBrightness = Math.min(minBrightness, brightness);
      maxBrightness = Math.max(maxBrightness, brightness);
      pixelCount++;
    }

    const averageBrightness = totalBrightness / pixelCount;
    const contrast = maxBrightness - minBrightness;

    // Estimate noise (variance in local regions)
    const noiseLevel = this.estimateNoise(imageData);
    
    // Estimate sharpness (edge strength)
    const sharpness = this.estimateSharpness(imageData);
    
    // Estimate skew (simplified)
    const skewAngle = this.estimateSkew(imageData);
    
    // Estimate shadows and glare
    const shadowRatio = this.estimateShadowRatio(imageData);
    const glareRatio = this.estimateGlareRatio(imageData);
    
    // Background brightness (assume edges are background)
    const backgroundBrightness = this.estimateBackgroundBrightness(imageData);
    
    // Text clarity (edge density in mid-brightness regions)
    const textClarity = this.estimateTextClarity(imageData);

    return {
      averageBrightness,
      contrast,
      noiseLevel,
      sharpness,
      skewAngle,
      shadowRatio,
      glareRatio,
      backgroundBrightness,
      textClarity
    };
  }

  private estimateNoise(imageData: ImageData): number {
    // Sample local variance
    let totalVariance = 0;
    let sampleCount = 0;

    for (let y = 5; y < imageData.height - 5; y += 20) {
      for (let x = 5; x < imageData.width - 5; x += 20) {
        const center = getPixel(imageData, x, y);
        const centerBrightness = (center.r + center.g + center.b) / 3;
        
        let localVariance = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const pixel = getPixel(imageData, x + dx, y + dy);
            const brightness = (pixel.r + pixel.g + pixel.b) / 3;
            localVariance += Math.pow(brightness - centerBrightness, 2);
          }
        }
        totalVariance += Math.sqrt(localVariance / 25);
        sampleCount++;
      }
    }

    return sampleCount > 0 ? totalVariance / sampleCount : 0;
  }

  private estimateSharpness(imageData: ImageData): number {
    // Use edge detection to estimate sharpness
    let edgeStrength = 0;
    let edgeCount = 0;

    for (let y = 1; y < imageData.height - 1; y += 10) {
      for (let x = 1; x < imageData.width - 1; x += 10) {
        const center = getPixel(imageData, x, y);
        const right = getPixel(imageData, x + 1, y);
        const bottom = getPixel(imageData, x, y + 1);
        
        const centerBrightness = (center.r + center.g + center.b) / 3;
        const rightBrightness = (right.r + right.g + right.b) / 3;
        const bottomBrightness = (bottom.r + bottom.g + bottom.b) / 3;
        
        const edgeX = Math.abs(centerBrightness - rightBrightness);
        const edgeY = Math.abs(centerBrightness - bottomBrightness);
        edgeStrength += Math.sqrt(edgeX * edgeX + edgeY * edgeY);
        edgeCount++;
      }
    }

    return edgeCount > 0 ? (edgeStrength / edgeCount) : 0;
  }

  private estimateSkew(imageData: ImageData): number {
    // Estimate skew angle by detecting text line angles
    // Uses Hough-like approach: detect horizontal lines and measure their angle
    
    const angles: number[] = [];
    const sampleStep = 10;
    
    // Sample horizontal lines across the image
    for (let y = imageData.height * 0.2; y < imageData.height * 0.8; y += sampleStep) {
      const lineBrightness: number[] = [];
      
      // Sample brightness along horizontal line
      for (let x = imageData.width * 0.1; x < imageData.width * 0.9; x += 2) {
        const pixel = getPixel(imageData, x, y);
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        lineBrightness.push(brightness);
      }
      
      // Find edges (text lines)
      const edges: number[] = [];
      for (let i = 1; i < lineBrightness.length - 1; i++) {
        const diff = Math.abs(lineBrightness[i] - lineBrightness[i - 1]);
        if (diff > 30) {
          edges.push(i);
        }
      }
      
      // If we have multiple edges, estimate line angle
      if (edges.length >= 2) {
        // Calculate average spacing (text should have regular spacing)
        let totalSpacing = 0;
        for (let i = 1; i < edges.length; i++) {
          totalSpacing += edges[i] - edges[i - 1];
        }
        const avgSpacing = totalSpacing / (edges.length - 1);
        
        // Check if spacing is regular (indicates text line)
        let isRegular = true;
        for (let i = 1; i < edges.length; i++) {
          const spacing = edges[i] - edges[i - 1];
          if (Math.abs(spacing - avgSpacing) > avgSpacing * 0.3) {
            isRegular = false;
            break;
          }
        }
        
        if (isRegular && edges.length >= 3) {
          // Estimate angle by comparing line positions at different y coordinates
          const nextY = y + sampleStep;
          if (nextY < imageData.height * 0.8) {
            const nextLineBrightness: number[] = [];
            for (let x = imageData.width * 0.1; x < imageData.width * 0.9; x += 2) {
              const pixel = getPixel(imageData, x, nextY);
              const brightness = (pixel.r + pixel.g + pixel.b) / 3;
              nextLineBrightness.push(brightness);
            }
            
            const nextEdges: number[] = [];
            for (let i = 1; i < nextLineBrightness.length - 1; i++) {
              const diff = Math.abs(nextLineBrightness[i] - nextLineBrightness[i - 1]);
              if (diff > 30) {
                nextEdges.push(i);
              }
            }
            
            // Compare edge positions to estimate skew
            if (nextEdges.length >= 2 && edges.length >= 2) {
              const edgeShift = nextEdges[0] - edges[0];
              const angle = Math.atan2(sampleStep, edgeShift * 2) * (180 / Math.PI);
              if (Math.abs(angle) < 45) { // Only consider reasonable angles
                angles.push(angle);
              }
            }
          }
        }
      }
    }
    
    // Return median angle
    if (angles.length === 0) return 0;
    
    angles.sort((a, b) => a - b);
    const medianIndex = Math.floor(angles.length / 2);
    return angles.length % 2 === 0
      ? (angles[medianIndex - 1] + angles[medianIndex]) / 2
      : angles[medianIndex];
  }

  private estimateShadowRatio(imageData: ImageData): number {
    let shadowPixels = 0;
    let totalPixels = 0;

    for (let y = 0; y < imageData.height; y += 20) {
      for (let x = 0; x < imageData.width; x += 20) {
        const pixel = getPixel(imageData, x, y);
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        if (brightness < 80) {
          shadowPixels++;
        }
        totalPixels++;
      }
    }

    return totalPixels > 0 ? shadowPixels / totalPixels : 0;
  }

  private estimateGlareRatio(imageData: ImageData): number {
    let glarePixels = 0;
    let totalPixels = 0;

    for (let y = 0; y < imageData.height; y += 20) {
      for (let x = 0; x < imageData.width; x += 20) {
        const pixel = getPixel(imageData, x, y);
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        if (brightness > 240) {
          glarePixels++;
        }
        totalPixels++;
      }
    }

    return totalPixels > 0 ? glarePixels / totalPixels : 0;
  }

  private estimateBackgroundBrightness(imageData: ImageData): number {
    // Sample edge pixels (likely background)
    let totalBrightness = 0;
    let count = 0;
    const edgeWidth = 10;

    // Top edge
    for (let x = 0; x < imageData.width; x += 5) {
      for (let y = 0; y < edgeWidth; y++) {
        const pixel = getPixel(imageData, x, y);
        totalBrightness += (pixel.r + pixel.g + pixel.b) / 3;
        count++;
      }
    }

    // Bottom edge
    for (let x = 0; x < imageData.width; x += 5) {
      for (let y = imageData.height - edgeWidth; y < imageData.height; y++) {
        const pixel = getPixel(imageData, x, y);
        totalBrightness += (pixel.r + pixel.g + pixel.b) / 3;
        count++;
      }
    }

    return count > 0 ? totalBrightness / count : 255;
  }

  private estimateTextClarity(imageData: ImageData): number {
    // Estimate text clarity by looking at edge density in mid-brightness regions
    let edgeDensity = 0;
    let midBrightnessPixels = 0;

    for (let y = 1; y < imageData.height - 1; y += 5) {
      for (let x = 1; x < imageData.width - 1; x += 5) {
        const pixel = getPixel(imageData, x, y);
        const brightness = (pixel.r + pixel.g + pixel.b) / 3;
        
        if (brightness > 50 && brightness < 200) {
          midBrightnessPixels++;
          const right = getPixel(imageData, x + 1, y);
          const rightBrightness = (right.r + right.g + right.b) / 3;
          const edge = Math.abs(brightness - rightBrightness);
          if (edge > 30) {
            edgeDensity++;
          }
        }
      }
    }

    return midBrightnessPixels > 0 ? edgeDensity / midBrightnessPixels : 0;
  }
}

