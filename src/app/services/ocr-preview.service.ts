import { Injectable } from '@angular/core';
import { OcrEngineService } from './ocr-engine.service';
import { OcrResult } from '../models/ocr-result.interface';
import { imageDataToBlob } from '../utils/image-helpers';

@Injectable({
  providedIn: 'root'
})
export class OcrPreviewService {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceDelay = 300;

  constructor(private ocrEngine: OcrEngineService) {}

  async previewRegion(
    imageData: ImageData,
    x: number,
    y: number,
    width: number,
    height: number,
    debounce: boolean = true
  ): Promise<OcrResult | null> {
    // Clear existing timer if debouncing
    if (debounce && this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    return new Promise((resolve) => {
      const performOcr = async () => {
        try {
          // Crop the region
          const cropped = this.cropImageData(imageData, x, y, width, height);
          
          // Perform OCR on cropped region
          const blob = await imageDataToBlob(cropped);
          const result = await this.ocrEngine.performOCR(blob);
          
          // Adjust bounding box coordinates to original image space
          result.boundingBoxes = result.boundingBoxes.map(box => ({
            ...box,
            x: box.x + x,
            y: box.y + y
          }));

          resolve(result);
        } catch (error) {
          console.error('OCR preview failed:', error);
          resolve(null);
        }
      };

      if (debounce) {
        this.debounceTimer = setTimeout(performOcr, this.debounceDelay);
      } else {
        performOcr();
      }
    });
  }

  private cropImageData(imageData: ImageData, x: number, y: number, width: number, height: number): ImageData {
    const cropped = new ImageData(width, height);
    
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(imageData.width, Math.floor(x + width));
    const endY = Math.min(imageData.height, Math.floor(y + height));
    const cropWidth = endX - startX;
    const cropHeight = endY - startY;

    for (let cy = 0; cy < cropHeight; cy++) {
      for (let cx = 0; cx < cropWidth; cx++) {
        const srcX = startX + cx;
        const srcY = startY + cy;
        const srcIdx = (srcY * imageData.width + srcX) * 4;
        const dstIdx = (cy * cropWidth + cx) * 4;

        cropped.data[dstIdx] = imageData.data[srcIdx];
        cropped.data[dstIdx + 1] = imageData.data[srcIdx + 1];
        cropped.data[dstIdx + 2] = imageData.data[srcIdx + 2];
        cropped.data[dstIdx + 3] = imageData.data[srcIdx + 3];
      }
    }

    return cropped;
  }

  cancelPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

