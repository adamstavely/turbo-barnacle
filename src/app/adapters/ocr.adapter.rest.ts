import { OcrEngineAdapter } from './ocr-engine-adapter.interface';
import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';
import { BoundingBox } from '../models/bounding-box.interface';

export interface RestAdapterConfig {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  responseMapper?: (response: any) => OcrResult;
}

export class RestOcrAdapter implements OcrEngineAdapter {
  name = 'REST API';
  private config: RestAdapterConfig;

  constructor(config: RestAdapterConfig) {
    this.config = config;
  }

  async performOCR(imageBlob: Blob, options?: OcrOptions): Promise<OcrResult> {
    const formData = new FormData();
    formData.append('image', imageBlob);

    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const headers: HeadersInit = {
      ...this.config.headers
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const startTime = Date.now();
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.statusText}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Use custom mapper if provided, otherwise use default mapping
    if (this.config.responseMapper) {
      return this.config.responseMapper(data);
    }

    // Default mapping assumes standard OCR API response format
    return {
      text: data.text || '',
      boundingBoxes: (data.boundingBoxes || []).map((box: any, index: number) => ({
        id: box.id || `rest-${index}`,
        x: box.x || 0,
        y: box.y || 0,
        width: box.width || 0,
        height: box.height || 0,
        text: box.text || '',
        confidence: box.confidence || 0,
        label: box.label
      })) as BoundingBox[],
      confidence: data.confidence || 0,
      engine: this.name,
      processingTime,
      metadata: data.metadata || {}
    };
  }

  isAvailable(): boolean {
    return !!this.config.endpoint;
  }
}

