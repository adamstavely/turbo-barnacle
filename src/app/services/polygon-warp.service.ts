import { Injectable } from '@angular/core';
import { getPixel, setPixel, interpolateBilinear } from '../utils/math-helpers';

export interface Point {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root'
})
export class PolygonWarpService {
  
  /**
   * Apply local region warping using Thin Plate Spline (TPS) transformation
   */
  applyLocalWarp(
    imageData: ImageData,
    sourcePoints: Point[],
    targetPoints: Point[]
  ): ImageData {
    if (sourcePoints.length !== targetPoints.length || sourcePoints.length < 3) {
      throw new Error('Source and target points must have the same length (minimum 3 points)');
    }

    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);

    // Calculate TPS transformation matrix
    const tpsMatrix = this.calculateTPSMatrix(sourcePoints, targetPoints);

    // Create bounding box for the polygon region
    const bounds = this.getPolygonBounds(sourcePoints);
    
    // Apply transformation only within the polygon region
    for (let y = Math.max(0, Math.floor(bounds.minY)); y < Math.min(imageData.height, Math.ceil(bounds.maxY)); y++) {
      for (let x = Math.max(0, Math.floor(bounds.minX)); x < Math.min(imageData.width, Math.ceil(bounds.maxX)); x++) {
        // Check if point is inside the polygon
        if (this.isPointInPolygon({ x, y }, sourcePoints)) {
          // Transform point using TPS
          const transformed = this.applyTPSTransform({ x, y }, sourcePoints, tpsMatrix);
          
          // Sample from original image using bilinear interpolation
          const pixel = interpolateBilinear(imageData, transformed.x, transformed.y);
          setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
        }
      }
    }

    return result;
  }

  /**
   * Calculate Thin Plate Spline transformation matrix
   */
  private calculateTPSMatrix(sourcePoints: Point[], targetPoints: Point[]): number[][] {
    const n = sourcePoints.length;
    const K: number[][] = [];
    const P: number[][] = [];
    const Y: number[][] = [];

    // Build K matrix (radial basis function)
    for (let i = 0; i < n; i++) {
      K[i] = [];
      for (let j = 0; j < n; j++) {
        const dx = sourcePoints[i].x - sourcePoints[j].x;
        const dy = sourcePoints[i].y - sourcePoints[j].y;
        const r2 = dx * dx + dy * dy;
        if (r2 === 0) {
          K[i][j] = 0;
        } else {
          K[i][j] = r2 * Math.log(r2);
        }
      }
    }

    // Build P matrix (affine part)
    for (let i = 0; i < n; i++) {
      P[i] = [1, sourcePoints[i].x, sourcePoints[i].y];
    }

    // Build Y matrix (target points)
    for (let i = 0; i < n; i++) {
      Y[i] = [targetPoints[i].x, targetPoints[i].y];
    }

    // Solve for transformation coefficients
    // Simplified: In production, use proper matrix solver (SVD, etc.)
    return this.solveTPS(K, P, Y);
  }

  private solveTPS(K: number[][], P: number[][], Y: number[][]): number[][] {
    // Simplified TPS solver - in production use proper numerical methods
    // This is a placeholder that returns identity-like transformation
    const n = K.length;
    const result: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      result[i] = [Y[i][0], Y[i][1]];
    }
    
    return result;
  }

  /**
   * Apply TPS transformation to a point
   */
  private applyTPSTransform(point: Point, controlPoints: Point[], tpsMatrix: number[][]): Point {
    // Simplified TPS application
    // In production, this would use the full TPS formula
    
    // For now, use barycentric interpolation as a simpler alternative
    return this.barycentricInterpolate(point, controlPoints, tpsMatrix);
  }

  private barycentricInterpolate(point: Point, controlPoints: Point[], targetPoints: number[][]): Point {
    // Find the three nearest control points
    const distances = controlPoints.map((cp, i) => ({
      index: i,
      distance: Math.sqrt(Math.pow(point.x - cp.x, 2) + Math.pow(point.y - cp.y, 2))
    })).sort((a, b) => a.distance - b.distance);

    const nearest = distances.slice(0, 3);
    const totalDist = nearest.reduce((sum, n) => sum + 1 / (n.distance + 0.001), 0);

    let x = 0, y = 0;
    nearest.forEach(n => {
      const weight = (1 / (n.distance + 0.001)) / totalDist;
      x += targetPoints[n.index][0] * weight;
      y += targetPoints[n.index][1] * weight;
    });

    return { x, y };
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Get bounding box of a polygon
   */
  private getPolygonBounds(polygon: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    polygon.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
    
    return { minX, minY, maxX, maxY };
  }
}

