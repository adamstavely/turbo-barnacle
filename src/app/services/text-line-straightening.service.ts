import { Injectable } from '@angular/core';
import { getPixel, setPixel, interpolateBilinear } from '../utils/math-helpers';
import { BoundingBox } from '../models/bounding-box.interface';

export interface TextLine {
  id: string;
  points: { x: number; y: number }[];
  baseline: { start: { x: number; y: number }; end: { x: number; y: number } };
}

@Injectable({
  providedIn: 'root'
})
export class TextLineStraighteningService {
  
  /**
   * Detect text lines from bounding boxes
   */
  detectTextLines(boundingBoxes: BoundingBox[]): TextLine[] {
    const lines: TextLine[] = [];
    const processed = new Set<string>();

    // Group bounding boxes by approximate y-position (same line)
    const yGroups = new Map<number, BoundingBox[]>();
    
    boundingBoxes.forEach(box => {
      const centerY = box.y + box.height / 2;
      const roundedY = Math.round(centerY / 10) * 10; // Group by 10px intervals
      
      if (!yGroups.has(roundedY)) {
        yGroups.set(roundedY, []);
      }
      yGroups.get(roundedY)!.push(box);
    });

    // Create text lines from groups
    yGroups.forEach((boxes, y) => {
      // Sort boxes by x position
      boxes.sort((a, b) => a.x - b.x);
      
      // Create baseline from first to last box
      const firstBox = boxes[0];
      const lastBox = boxes[boxes.length - 1];
      
      const baseline = {
        start: { x: firstBox.x, y: firstBox.y + firstBox.height / 2 },
        end: { x: lastBox.x + lastBox.width, y: lastBox.y + lastBox.height / 2 }
      };

      // Collect all points along the line
      const points: { x: number; y: number }[] = [];
      boxes.forEach(box => {
        points.push(
          { x: box.x, y: box.y + box.height / 2 },
          { x: box.x + box.width, y: box.y + box.height / 2 }
        );
      });

      lines.push({
        id: `line-${y}`,
        points,
        baseline
      });
    });

    return lines;
  }

  /**
   * Straighten a curved text line
   */
  straightenTextLine(
    imageData: ImageData,
    line: TextLine,
    targetHeight: number = 50
  ): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);

    // Calculate the baseline curve
    const baselinePoints = this.calculateBaselineCurve(line);
    
    // Find bounding box of the line region
    const minY = Math.min(...line.points.map(p => p.y)) - targetHeight / 2;
    const maxY = Math.max(...line.points.map(p => p.y)) + targetHeight / 2;
    const minX = Math.min(...line.points.map(p => p.x));
    const maxX = Math.max(...line.points.map(p => p.x));

    // For each pixel in the line region, map to straightened position
    for (let y = Math.max(0, Math.floor(minY)); y < Math.min(imageData.height, Math.ceil(maxY)); y++) {
      for (let x = Math.max(0, Math.floor(minX)); x < Math.min(imageData.width, Math.ceil(maxX)); x++) {
        // Calculate distance from baseline
        const baselineY = this.getBaselineYAt(baselinePoints, x);
        const distanceFromBaseline = y - baselineY;
        
        // Map to straightened position (straight horizontal line)
        const targetBaselineY = minY + targetHeight / 2;
        const srcY = targetBaselineY + distanceFromBaseline;
        
        // Sample from original image
        const pixel = interpolateBilinear(imageData, x, srcY);
        setPixel(result, x, y, pixel.r, pixel.g, pixel.b, pixel.a);
      }
    }

    return result;
  }

  /**
   * Calculate baseline curve using spline interpolation
   */
  private calculateBaselineCurve(line: TextLine): { x: number; y: number }[] {
    const points = line.points;
    if (points.length < 2) {
      return [line.baseline.start, line.baseline.end];
    }

    // Sort points by x
    const sorted = [...points].sort((a, b) => a.x - b.x);
    
    // Use simple linear interpolation for now
    // In production, use cubic spline or Bezier curves
    const curve: { x: number; y: number }[] = [];
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x;
    
    for (let x = minX; x <= maxX; x += 1) {
      const y = this.interpolateY(sorted, x);
      curve.push({ x, y });
    }

    return curve;
  }

  /**
   * Interpolate Y value for given X using linear interpolation
   */
  private interpolateY(points: { x: number; y: number }[], x: number): number {
    if (x <= points[0].x) return points[0].y;
    if (x >= points[points.length - 1].x) return points[points.length - 1].y;

    for (let i = 0; i < points.length - 1; i++) {
      if (x >= points[i].x && x <= points[i + 1].x) {
        const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
        return points[i].y + t * (points[i + 1].y - points[i].y);
      }
    }

    return points[0].y;
  }

  /**
   * Get baseline Y value at given X
   */
  private getBaselineYAt(baselinePoints: { x: number; y: number }[], x: number): number {
    if (baselinePoints.length === 0) return 0;
    if (x <= baselinePoints[0].x) return baselinePoints[0].y;
    if (x >= baselinePoints[baselinePoints.length - 1].x) {
      return baselinePoints[baselinePoints.length - 1].y;
    }

    for (let i = 0; i < baselinePoints.length - 1; i++) {
      if (x >= baselinePoints[i].x && x <= baselinePoints[i + 1].x) {
        const t = (x - baselinePoints[i].x) / (baselinePoints[i + 1].x - baselinePoints[i].x);
        return baselinePoints[i].y + t * (baselinePoints[i + 1].y - baselinePoints[i].y);
      }
    }

    return baselinePoints[0].y;
  }

  /**
   * Apply text line straightening to entire image
   */
  straightenAllTextLines(imageData: ImageData, boundingBoxes: BoundingBox[]): ImageData {
    const lines = this.detectTextLines(boundingBoxes);
    let result = imageData;

    // Process each line
    lines.forEach(line => {
      result = this.straightenTextLine(result, line);
    });

    return result;
  }
}

