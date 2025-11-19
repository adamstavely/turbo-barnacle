import { Injectable } from '@angular/core';
import { SignatureDetectionAdapter } from '../adapters/signature-detection-adapter.interface';
import { SignatureDetectionMlAdapter } from '../adapters/signature-detection-ml.adapter';
import { Signature } from '../models/signature.interface';

@Injectable({
  providedIn: 'root'
})
export class SignatureDetectionService {
  private adapters = new Map<string, SignatureDetectionAdapter>();
  private currentAdapter: SignatureDetectionAdapter | null = null;

  constructor() {
    // Register built-in adapter
    this.registerAdapter(new SignatureDetectionMlAdapter());
  }

  registerAdapter(adapter: SignatureDetectionAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAvailableAdapters(): SignatureDetectionAdapter[] {
    return Array.from(this.adapters.values());
  }

  async setAdapter(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Signature detection adapter ${name} not found`);
    }

    if (adapter.initialize) {
      await adapter.initialize();
    }

    this.currentAdapter = adapter;
  }

  getCurrentAdapter(): SignatureDetectionAdapter | null {
    return this.currentAdapter;
  }

  async detectSignatures(imageData: ImageData, adapterName?: string): Promise<Signature[]> {
    let adapter = this.currentAdapter;
    
    if (adapterName) {
      adapter = this.adapters.get(adapterName) || null;
    }

    if (!adapter) {
      // Default to ML adapter if no adapter selected
      adapter = this.adapters.get('ML Signature Detection') || null;
      if (!adapter) {
        throw new Error('No signature detection adapter available');
      }
    }

    return await adapter.detectSignatures(imageData);
  }

  async extractSignature(imageData: ImageData, signature: Signature): Promise<ImageData> {
    // Crop the signature region
    const x = Math.max(0, Math.floor(signature.boundingBox.x));
    const y = Math.max(0, Math.floor(signature.boundingBox.y));
    const width = Math.min(imageData.width - x, Math.floor(signature.boundingBox.width));
    const height = Math.min(imageData.height - y, Math.floor(signature.boundingBox.height));
    
    const cropped = new ImageData(width, height);
    
    for (let cy = 0; cy < height; cy++) {
      for (let cx = 0; cx < width; cx++) {
        const srcX = x + cx;
        const srcY = y + cy;
        const srcIdx = (srcY * imageData.width + srcX) * 4;
        const dstIdx = (cy * width + cx) * 4;
        
        cropped.data[dstIdx] = imageData.data[srcIdx];
        cropped.data[dstIdx + 1] = imageData.data[srcIdx + 1];
        cropped.data[dstIdx + 2] = imageData.data[srcIdx + 2];
        cropped.data[dstIdx + 3] = imageData.data[srcIdx + 3];
      }
    }
    
    return cropped;
  }

  async exportSignatureAsPng(imageData: ImageData, signature: Signature): Promise<Blob> {
    const cropped = await this.extractSignature(imageData, signature);
    const canvas = document.createElement('canvas');
    canvas.width = cropped.width;
    canvas.height = cropped.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    ctx.putImageData(cropped, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export signature'));
      }, 'image/png');
    });
  }
}

