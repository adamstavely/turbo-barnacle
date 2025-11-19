import { Injectable, signal } from '@angular/core';
import { MaskRegion } from '../models/mask-region.interface';

@Injectable({
  providedIn: 'root'
})
export class MaskService {
  private maskRegions = signal<MaskRegion[]>([]);

  getMaskRegions(): MaskRegion[] {
    return this.maskRegions();
  }

  addMaskRegion(region: MaskRegion): void {
    this.maskRegions.update(regions => [...regions, region]);
  }

  removeMaskRegion(id: string): void {
    this.maskRegions.update(regions => regions.filter(r => r.id !== id));
  }

  clearMaskRegions(): void {
    this.maskRegions.set([]);
  }

  applyMaskToImageData(imageData: ImageData, regions: MaskRegion[]): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    result.data.set(imageData.data);

    for (const region of regions) {
      const startX = Math.max(0, Math.floor(region.x));
      const startY = Math.max(0, Math.floor(region.y));
      const endX = Math.min(imageData.width, Math.floor(region.x + region.width));
      const endY = Math.min(imageData.height, Math.floor(region.y + region.height));

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * imageData.width + x) * 4;
          // Set to black
          result.data[idx] = 0;     // R
          result.data[idx + 1] = 0; // G
          result.data[idx + 2] = 0; // B
          result.data[idx + 3] = 255; // A (keep alpha)
        }
      }
    }

    return result;
  }

  isPointMasked(x: number, y: number, regions: MaskRegion[]): boolean {
    return regions.some(region => {
      return x >= region.x && x < region.x + region.width &&
             y >= region.y && y < region.y + region.height;
    });
  }
}

