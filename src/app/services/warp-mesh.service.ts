import { Injectable } from '@angular/core';
import { getPixel, setPixel, interpolateBilinear } from '../utils/math-helpers';

export interface MeshPoint {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  isPinned?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WarpMeshService {
  
  /**
   * Apply mesh warping using bilinear interpolation within each mesh cell
   */
  applyMeshWarp(imageData: ImageData, mesh: MeshPoint[][]): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    
    // For each pixel, find which mesh cell it belongs to and apply transformation
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const transformed = this.transformPoint({ x, y }, mesh);
        const pixel = interpolateBilinear(imageData, transformed.x, transformed.y);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }

  /**
   * Transform a point using mesh warping
   */
  private transformPoint(point: { x: number; y: number }, mesh: MeshPoint[][]): { x: number; y: number } {
    // Find the mesh cell containing this point
    for (let row = 0; row < mesh.length - 1; row++) {
      for (let col = 0; col < mesh[row].length - 1; col++) {
        const topLeft = mesh[row][col];
        const topRight = mesh[row][col + 1];
        const bottomLeft = mesh[row + 1][col];
        const bottomRight = mesh[row + 1][col + 1];

        // Check if point is in this cell (using original positions)
        if (point.x >= topLeft.originalX && point.x <= topRight.originalX &&
            point.y >= topLeft.originalY && point.y <= bottomLeft.originalY) {
          
          // Calculate relative position in original cell
          const cellWidth = topRight.originalX - topLeft.originalX;
          const cellHeight = bottomLeft.originalY - topLeft.originalY;
          const u = (point.x - topLeft.originalX) / cellWidth;
          const v = (point.y - topLeft.originalY) / cellHeight;

          // Apply bilinear interpolation to get transformed position
          const newX = (1 - u) * (1 - v) * topLeft.x +
                      u * (1 - v) * topRight.x +
                      (1 - u) * v * bottomLeft.x +
                      u * v * bottomRight.x;

          const newY = (1 - u) * (1 - v) * topLeft.y +
                      u * (1 - v) * topRight.y +
                      (1 - u) * v * bottomLeft.y +
                      u * v * bottomRight.y;

          return { x: newX, y: newY };
        }
      }
    }

    // If point is outside mesh, return original position
    return point;
  }

  /**
   * Apply curvature flattening for book de-warping
   */
  applyCurvatureFlattening(imageData: ImageData, curvature: number): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        // Calculate distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

        // Apply curvature correction
        const normalizedDist = distance / maxDistance;
        const correction = 1 - curvature * normalizedDist * normalizedDist;

        const srcX = centerX + dx * correction;
        const srcY = centerY + dy * correction;

        const pixel = interpolateBilinear(imageData, srcX, srcY);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }
}

