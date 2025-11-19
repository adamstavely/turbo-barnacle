import { Injectable } from '@angular/core';
import { applyMatrix3x3, getPixel, setPixel, interpolateBilinear, InterpolationMethod } from '../utils/math-helpers';

export interface PerspectivePoints {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

@Injectable({
  providedIn: 'root'
})
export class GeometricTransformService {
  
  rotate(imageData: ImageData, angle: number, method: InterpolationMethod = 'bilinear'): ImageData {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;

    // Calculate new dimensions
    const corners = [
      { x: -centerX, y: -centerY },
      { x: imageData.width - centerX, y: -centerY },
      { x: -centerX, y: imageData.height - centerY },
      { x: imageData.width - centerX, y: imageData.height - centerY }
    ];

    const rotatedCorners = corners.map(c => ({
      x: c.x * cos - c.y * sin,
      y: c.x * sin + c.y * cos
    }));

    const minX = Math.min(...rotatedCorners.map(c => c.x));
    const maxX = Math.max(...rotatedCorners.map(c => c.x));
    const minY = Math.min(...rotatedCorners.map(c => c.y));
    const maxY = Math.max(...rotatedCorners.map(c => c.y));

    const newWidth = Math.ceil(maxX - minX);
    const newHeight = Math.ceil(maxY - minY);
    const result = new ImageData(newWidth, newHeight);

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = (x - newWidth / 2) * cos + (y - newHeight / 2) * sin + centerX;
        const srcY = -(x - newWidth / 2) * sin + (y - newHeight / 2) * cos + centerY;

        const pixel = this.interpolate(imageData, srcX, srcY, method);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }

  scale(imageData: ImageData, scaleX: number, scaleY: number, method: InterpolationMethod = 'bilinear'): ImageData {
    const newWidth = Math.floor(imageData.width * scaleX);
    const newHeight = Math.floor(imageData.height * scaleY);
    const result = new ImageData(newWidth, newHeight);

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = x / scaleX;
        const srcY = y / scaleY;

        const pixel = this.interpolate(imageData, srcX, srcY, method);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }

  applyPerspectiveCorrection(imageData: ImageData, points: PerspectivePoints, method: InterpolationMethod = 'bilinear'): ImageData {
    // Calculate homography matrix using direct linear transform
    const srcPoints = [
      [points.topLeft.x, points.topLeft.y, 1],
      [points.topRight.x, points.topRight.y, 1],
      [points.bottomRight.x, points.bottomRight.y, 1],
      [points.bottomLeft.x, points.bottomLeft.y, 1]
    ];

    const dstPoints = [
      [0, 0],
      [imageData.width, 0],
      [imageData.width, imageData.height],
      [0, imageData.height]
    ];

    const matrix = this.calculateHomographyDLT(srcPoints, dstPoints);
    return this.applyHomography(imageData, matrix, method);
  }

  detectQuadrilateral(imageData: ImageData): PerspectivePoints | null {
    // Simplified quadrilateral detection
    // Full implementation would use contour detection and corner detection
    const width = imageData.width;
    const height = imageData.height;
    
    // Return default corners (can be improved with actual CV detection)
    return {
      topLeft: { x: width * 0.1, y: height * 0.1 },
      topRight: { x: width * 0.9, y: height * 0.1 },
      bottomRight: { x: width * 0.9, y: height * 0.9 },
      bottomLeft: { x: width * 0.1, y: height * 0.9 }
    };
  }

  private calculateHomographyDLT(src: number[][], dst: number[][]): number[][] {
    // Direct Linear Transform for homography calculation
    const A: number[][] = [];
    
    for (let i = 0; i < 4; i++) {
      const [x, y, w] = src[i];
      const [u, v] = dst[i];
      
      A.push([0, 0, 0, -w * u, -w * v, -w, y * u, y * v, y]);
      A.push([w * u, w * v, w, 0, 0, 0, -x * u, -x * v, -x]);
    }

    // Solve using SVD or least squares (simplified here)
    // For production, use a proper matrix solver
    const h = this.solveHomography(A);
    
    return [
      [h[0], h[1], h[2]],
      [h[3], h[4], h[5]],
      [h[6], h[7], h[8]]
    ];
  }

  private solveHomography(A: number[][]): number[] {
    // Simplified solver - in production use proper SVD
    // Returns identity for now
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  autoDeskew(imageData: ImageData): number {
    // Simplified deskew detection using edge detection and line detection
    // This is a basic implementation - full Hough transform would be more accurate
    const gray = this.toGrayscale(imageData);
    const edges = this.detectEdges(gray);
    
    // Find dominant angle from edges
    const angles: number[] = [];
    for (let y = 1; y < edges.height - 1; y++) {
      for (let x = 1; x < edges.width - 1; x++) {
        const pixel = getPixel(edges, x, y);
        if (pixel.r > 128) {
          // Check gradient direction
          const gx = getPixel(edges, x + 1, y).r - getPixel(edges, x - 1, y).r;
          const gy = getPixel(edges, y + 1, x).r - getPixel(edges, y - 1, x).r;
          if (Math.abs(gx) > 10 || Math.abs(gy) > 10) {
            const angle = Math.atan2(gy, gx) * 180 / Math.PI;
            angles.push(angle);
          }
        }
      }
    }

    // Find most common angle (simplified)
    if (angles.length === 0) return 0;
    
    const angleCounts = new Map<number, number>();
    angles.forEach(angle => {
      const rounded = Math.round(angle / 5) * 5;
      angleCounts.set(rounded, (angleCounts.get(rounded) || 0) + 1);
    });

    let maxCount = 0;
    let dominantAngle = 0;
    angleCounts.forEach((count, angle) => {
      if (count > maxCount) {
        maxCount = count;
        dominantAngle = angle;
      }
    });

    return dominantAngle;
  }

  applyLensDistortion(imageData: ImageData, barrel: number, pincushion: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const r = Math.sqrt(dx * dx + dy * dy) / maxRadius;

        // Apply distortion
        const distortion = barrel * r * r + pincushion * r * r * r * r;
        const newR = r * (1 + distortion);
        const newDx = dx * (newR / (r || 1));
        const newDy = dy * (newR / (r || 1));

        const srcX = centerX + newDx;
        const srcY = centerY + newDy;

        const pixel = interpolateBilinear(imageData, srcX, srcY);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }


  private applyHomography(imageData: ImageData, matrix: number[][], method: InterpolationMethod): ImageData {
    return applyMatrix3x3(imageData, matrix);
  }

  private interpolate(img: ImageData, x: number, y: number, method: InterpolationMethod) {
    switch (method) {
      case 'bilinear':
        return interpolateBilinear(img, x, y);
      case 'nearest':
      default:
        const px = Math.round(x);
        const py = Math.round(y);
        return getPixel(img, px, py);
    }
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

  private detectEdges(imageData: ImageData): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < imageData.width - 1; x++) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = getPixel(imageData, x + kx, y + ky);
            const idx = (ky + 1) * 3 + (kx + 1);
            gx += pixel.r * sobelX[idx];
            gy += pixel.r * sobelY[idx];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const value = Math.min(255, magnitude);
        setPixel(result, x, y, value, value, value, 255);
      }
    }

    return result;
  }
}

