import { Injectable, signal } from '@angular/core';
import { OcrEngineAdapter } from '../adapters/ocr-engine-adapter.interface';
import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';
import { MockOcrAdapter } from '../adapters/ocr.adapter.mock';
import { TesseractOcrAdapter } from '../adapters/ocr.adapter.tesseract';

@Injectable({
  providedIn: 'root'
})
export class OcrEngineService {
  private adapters = new Map<string, OcrEngineAdapter>();
  private currentAdapter = signal<OcrEngineAdapter | null>(null);
  private currentAdapterName = signal<string>('');

  constructor() {
    // Register built-in adapters
    this.registerAdapter(new MockOcrAdapter());
    this.registerAdapter(new TesseractOcrAdapter());
  }

  registerAdapter(adapter: OcrEngineAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAvailableAdapters(): OcrEngineAdapter[] {
    return Array.from(this.adapters.values());
  }

  async setAdapter(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter ${name} not found`);
    }

    // Initialize adapter if needed
    if (adapter.initialize) {
      await adapter.initialize();
    }

    this.currentAdapter.set(adapter);
    this.currentAdapterName.set(name);
  }

  getCurrentAdapter(): OcrEngineAdapter | null {
    return this.currentAdapter();
  }

  getCurrentAdapterName(): string {
    return this.currentAdapterName();
  }

  async performOCR(imageBlob: Blob, options?: OcrOptions): Promise<OcrResult> {
    const adapter = this.currentAdapter();
    if (!adapter) {
      throw new Error('No OCR adapter selected');
    }

    return await adapter.performOCR(imageBlob, options);
  }

  async registerRestAdapter(config: { name: string; endpoint: string; apiKey?: string; headers?: Record<string, string> }): Promise<void> {
    const { RestOcrAdapter } = await import('../adapters/ocr.adapter.rest');
    const adapter = new RestOcrAdapter({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      headers: config.headers
    });
    adapter.name = config.name;
    this.registerAdapter(adapter);
  }
}

