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

    // Calculate TPS transformation coefficients
    const tpsCoeffs = this.calculateTPSMatrix(sourcePoints, targetPoints);

    // Create bounding box for the polygon region
    const bounds = this.getPolygonBounds(sourcePoints);
    
    // Apply transformation only within the polygon region
    for (let y = Math.max(0, Math.floor(bounds.minY)); y < Math.min(imageData.height, Math.ceil(bounds.maxY)); y++) {
      for (let x = Math.max(0, Math.floor(bounds.minX)); x < Math.min(imageData.width, Math.ceil(bounds.maxX)); x++) {
        // Check if point is inside the polygon
        if (this.isPointInPolygon({ x, y }, sourcePoints)) {
          // Transform point using TPS
          const transformed = this.applyTPSTransform({ x, y }, sourcePoints, tpsCoeffs);
          
          // Sample from original image using bilinear interpolation
          const pixel = interpolateBilinear(imageData, transformed.x, transformed.y);
          setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
        }
      }
    }

    return result;
  }

  /**
   * Calculate Thin Plate Spline transformation coefficients
   */
  private calculateTPSMatrix(sourcePoints: Point[], targetPoints: Point[]): { weights: number[][], affine: number[][] } {
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

    // Solve for transformation coefficients using proper TPS solver
    return this.solveTPS(K, P, Y);
  }

  private solveTPS(K: number[][], P: number[][], Y: number[][]): { weights: number[][], affine: number[][] } {
    // Proper TPS solver using full system matrix
    // TPS system: L * [w, a] = [Y, 0]
    // Where L = [[K, P], [P^T, 0]]
    const n = K.length;
    
    // Build full system matrix L (n+3 x n+3)
    const L: number[][] = [];
    
    // Top-left: K matrix (n x n)
    for (let i = 0; i < n; i++) {
      L[i] = [];
      for (let j = 0; j < n; j++) {
        L[i][j] = K[i][j];
      }
      // Top-right: P matrix (n x 3)
      for (let j = 0; j < 3; j++) {
        L[i][n + j] = P[i][j];
      }
    }
    
    // Bottom-left: P^T matrix (3 x n)
    for (let i = 0; i < 3; i++) {
      L[n + i] = [];
      for (let j = 0; j < n; j++) {
        L[n + i][j] = P[j][i];
      }
      // Bottom-right: zeros (3 x 3)
      for (let j = 0; j < 3; j++) {
        L[n + i][n + j] = 0;
      }
    }
    
    // Build target vector for X coordinates: [Y_x, 0, 0, 0]
    const Yx: number[] = [];
    for (let i = 0; i < n; i++) {
      Yx[i] = Y[i][0];
    }
    Yx[n] = 0;
    Yx[n + 1] = 0;
    Yx[n + 2] = 0;
    
    // Build target vector for Y coordinates: [Y_y, 0, 0, 0]
    const Yy: number[] = [];
    for (let i = 0; i < n; i++) {
      Yy[i] = Y[i][1];
    }
    Yy[n] = 0;
    Yy[n + 1] = 0;
    Yy[n + 2] = 0;
    
    // Solve linear systems: L * coeffs_x = Yx and L * coeffs_y = Yy
    const coeffsX = this.solveLinearSystem(L, Yx);
    const coeffsY = this.solveLinearSystem(L, Yy);
    
    // Extract weights (first n coefficients) and affine part (last 3 coefficients)
    const weights: number[][] = [];
    for (let i = 0; i < n; i++) {
      weights[i] = [coeffsX[i], coeffsY[i]];
    }
    
    const affine: number[][] = [
      [coeffsX[n], coeffsY[n]],     // a1
      [coeffsX[n + 1], coeffsY[n + 1]], // ax
      [coeffsX[n + 2], coeffsY[n + 2]]  // ay
    ];
    
    return { weights, affine };
  }

  /**
   * Solve linear system Ax = b using Gaussian elimination with partial pivoting
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    // Create augmented matrix [A | b]
    const augmented: number[][] = [];
    for (let i = 0; i < n; i++) {
      augmented[i] = [...A[i], b[i]];
    }
    
    // Forward elimination with partial pivoting
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Check for singular matrix
      if (Math.abs(augmented[i][i]) < 1e-10) {
        // Use small epsilon instead of zero to handle near-singular cases
        augmented[i][i] = 1e-10;
      }
      
      // Eliminate
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < n + 1; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Back substitution
    const x: number[] = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }
    
    return x;
  }

  /**
   * Apply TPS transformation to a point using full TPS formula
   */
  private applyTPSTransform(point: Point, controlPoints: Point[], tpsCoeffs: { weights: number[][], affine: number[][] }): Point {
    // TPS formula: f(x,y) = a1 + ax*x + ay*y + sum(wi * U(||pi - (x,y)||))
    // Where U(r) = r^2 * log(r^2) is the radial basis function
    
    const { weights, affine } = tpsCoeffs;
    const [a1, ax, ay] = affine;
    
    // Affine part
    let fx = a1[0] + ax[0] * point.x + ay[0] * point.y;
    let fy = a1[1] + ax[1] * point.x + ay[1] * point.y;
    
    // Non-rigid part: sum of weighted radial basis functions
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      const dx = point.x - cp.x;
      const dy = point.y - cp.y;
      const r2 = dx * dx + dy * dy;
      
      if (r2 > 1e-10) {
        // U(r) = r^2 * log(r^2)
        const U = r2 * Math.log(r2);
        fx += weights[i][0] * U;
        fy += weights[i][1] * U;
      }
      // If r2 is very small (point is at control point), U = 0, so skip
    }
    
    return { x: fx, y: fy };
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

