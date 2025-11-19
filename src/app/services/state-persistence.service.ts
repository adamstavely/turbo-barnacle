import { Injectable } from '@angular/core';
import { ImageState } from '../models/image-state.interface';
import { imageDataToBlob } from '../utils/image-helpers';

export interface PersistedState {
  version: string;
  timestamp: number;
  imageUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  width: number;
  height: number;
  imageDataBase64?: string;
  originalImageDataBase64?: string;
  boundingBoxes: any[];
  ocrResults: any[];
  selectedBoxId?: string | null;
  transforms?: any;
}

@Injectable({
  providedIn: 'root'
})
export class StatePersistenceService {
  private readonly CURRENT_VERSION = '1.0.0';

  /**
   * Serialize application state to JSON
   */
  async serializeState(state: ImageState): Promise<string> {
    const persisted: PersistedState = {
      version: this.CURRENT_VERSION,
      timestamp: Date.now(),
      fileName: state.fileName,
      fileType: state.fileType,
      width: state.width,
      height: state.height,
      boundingBoxes: state.boundingBoxes || [],
      ocrResults: state.ocrResults || [],
      selectedBoxId: state.selectedBoxId || null
    };

    // Convert ImageData to base64
    if (state.currentImageData) {
      const blob = await imageDataToBlob(state.currentImageData);
      persisted.imageDataBase64 = await this.blobToBase64(blob);
    }

    if (state.originalImageData) {
      const blob = await imageDataToBlob(state.originalImageData);
      persisted.originalImageDataBase64 = await this.blobToBase64(blob);
    }

    // Store image URL if it's a blob URL (we'll need to recreate it)
    if (state.imageUrl && state.imageUrl.startsWith('blob:')) {
      // For blob URLs, we'll use the base64 data instead
      persisted.imageUrl = undefined;
    } else {
      persisted.imageUrl = state.imageUrl;
    }

    return JSON.stringify(persisted, null, 2);
  }

  /**
   * Deserialize JSON to application state
   */
  async deserializeState(json: string): Promise<ImageState> {
    const persisted: PersistedState = JSON.parse(json);

    // Validate version
    if (persisted.version !== this.CURRENT_VERSION) {
      console.warn(`State version mismatch. Expected ${this.CURRENT_VERSION}, got ${persisted.version}`);
    }

    // Convert base64 to ImageData
    let currentImageData: ImageData | null = null;
    let originalImageData: ImageData | null = null;
    let imageUrl: string | null = null;

    if (persisted.imageDataBase64) {
      currentImageData = await this.base64ToImageData(persisted.imageDataBase64);
    }

    if (persisted.originalImageDataBase64) {
      originalImageData = await this.base64ToImageData(persisted.originalImageDataBase64);
    } else {
      // If no original, use current as original
      originalImageData = currentImageData;
    }

    // Recreate image URL from base64 if needed
    if (persisted.imageDataBase64) {
      const blob = await this.base64ToBlob(persisted.imageDataBase64);
      imageUrl = URL.createObjectURL(blob);
    } else if (persisted.imageUrl) {
      imageUrl = persisted.imageUrl;
    }

    return {
      imageUrl,
      fileName: persisted.fileName || null,
      fileType: persisted.fileType || null,
      width: persisted.width,
      height: persisted.height,
      currentImageData,
      originalImageData,
      boundingBoxes: persisted.boundingBoxes || [],
      ocrResults: persisted.ocrResults || [],
      selectedBoxId: persisted.selectedBoxId || null,
      transforms: persisted.transforms || {}
    };
  }

  /**
   * Save state to file
   */
  async saveStateToFile(state: ImageState, filename: string = 'ocr-state.json'): Promise<void> {
    const json = await this.serializeState(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Load state from file
   */
  async loadStateFromFile(file: File): Promise<ImageState> {
    const text = await file.text();
    return await this.deserializeState(text);
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private base64ToBlob(base64: string, mimeType: string = 'image/png'): Promise<Blob> {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return Promise.resolve(new Blob([byteArray], { type: mimeType }));
  }

  private async base64ToImageData(base64: string): Promise<ImageData> {
    const blob = await this.base64ToBlob(base64);
    const imageUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(imageUrl);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }
}

