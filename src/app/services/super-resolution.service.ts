import { Injectable } from '@angular/core';
import { SuperResolutionAdapter } from '../adapters/super-resolution-adapter.interface';
import { BicubicSrAdapter } from '../adapters/bicubic-sr.adapter';
import { EsrganSrAdapter } from '../adapters/esrgan-sr.adapter';

@Injectable({
  providedIn: 'root'
})
export class SuperResolutionService {
  private adapters = new Map<string, SuperResolutionAdapter>();
  private currentAdapter: SuperResolutionAdapter | null = null;

  constructor() {
    // Register built-in adapters
    this.registerAdapter(new BicubicSrAdapter());
    this.registerAdapter(new EsrganSrAdapter());
  }

  registerAdapter(adapter: SuperResolutionAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAvailableAdapters(): SuperResolutionAdapter[] {
    return Array.from(this.adapters.values());
  }

  async setAdapter(name: string): Promise<void> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Super-resolution adapter ${name} not found`);
    }

    if (adapter.initialize) {
      await adapter.initialize();
    }

    this.currentAdapter = adapter;
  }

  getCurrentAdapter(): SuperResolutionAdapter | null {
    return this.currentAdapter;
  }

  async upscale(imageData: ImageData, scaleFactor: number, adapterName?: string): Promise<ImageData> {
    let adapter = this.currentAdapter;
    
    if (adapterName) {
      adapter = this.adapters.get(adapterName) || null;
    }

    if (!adapter) {
      // Default to bicubic if no adapter selected
      adapter = this.adapters.get('Bicubic') || null;
      if (!adapter) {
        throw new Error('No super-resolution adapter available');
      }
    }

    return await adapter.upscale(imageData, scaleFactor);
  }

  async registerEsrganAdapter(config: { endpoint: string }): Promise<void> {
    const adapter = new EsrganSrAdapter(config);
    this.registerAdapter(adapter);
  }
}

