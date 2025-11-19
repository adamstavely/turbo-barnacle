import { OcrEngineAdapter } from './ocr-engine-adapter.interface';
import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';
import { BoundingBox } from '../models/bounding-box.interface';

export class MockOcrAdapter implements OcrEngineAdapter {
  name = 'Mock OCR';

  async performOCR(imageBlob: Blob, options?: OcrOptions): Promise<OcrResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock bounding boxes
    const mockBoxes: BoundingBox[] = [
      {
        id: '1',
        x: 50,
        y: 50,
        width: 200,
        height: 30,
        text: 'Sample Text Line 1',
        confidence: 0.95
      },
      {
        id: '2',
        x: 50,
        y: 100,
        width: 200,
        height: 30,
        text: 'Sample Text Line 2',
        confidence: 0.92
      }
    ];

    return {
      text: 'Sample Text Line 1\nSample Text Line 2',
      boundingBoxes: mockBoxes,
      confidence: 0.93,
      engine: this.name,
      processingTime: 500,
      metadata: { mock: true }
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

