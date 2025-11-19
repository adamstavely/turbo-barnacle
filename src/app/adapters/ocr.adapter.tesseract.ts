import { OcrEngineAdapter } from './ocr-engine-adapter.interface';
import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';
import { BoundingBox } from '../models/bounding-box.interface';
import { createWorker, Worker } from 'tesseract.js';

export class TesseractOcrAdapter implements OcrEngineAdapter {
  name = 'Tesseract.js';
  private worker: Worker | null = null;
  private initialized = false;

  async initialize(config?: any): Promise<void> {
    if (this.initialized && this.worker) {
      return;
    }

    this.worker = await createWorker(config?.language || 'eng', 1, {
      logger: config?.logger || (() => {})
    });
    this.initialized = true;
  }

  async performOCR(imageBlob: Blob, options?: OcrOptions): Promise<OcrResult> {
    if (!this.worker) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    const startTime = Date.now();

    // Set PSM if provided
    if (options?.psm !== undefined) {
      await this.worker.setParameters({
        tessedit_pageseg_mode: options.psm as any
      });
    }

    const { data } = await this.worker.recognize(imageBlob);
    const processingTime = Date.now() - startTime;

    // Convert Tesseract blocks/words to bounding boxes
    const boundingBoxes: BoundingBox[] = [];
    let wordIndex = 0;

    // Extract words from blocks
    if (data.blocks) {
      for (const block of data.blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.lines) {
              for (const line of paragraph.lines) {
                if (line.words) {
                  for (const word of line.words) {
                    if (word.bbox) {
                      boundingBoxes.push({
                        id: `tesseract-${wordIndex++}`,
                        x: word.bbox.x0,
                        y: word.bbox.y0,
                        width: word.bbox.x1 - word.bbox.x0,
                        height: word.bbox.y1 - word.bbox.y0,
                        text: word.text || '',
                        confidence: (word.confidence || 0) / 100 // Tesseract returns 0-100, we use 0-1
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return {
      text: data.text || '',
      boundingBoxes,
      confidence: (data.confidence || 0) / 100,
      engine: this.name,
      processingTime,
      metadata: {
        blocks: data.blocks?.length || 0,
        words: boundingBoxes.length
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.worker) {
        await this.initialize();
      }
      return this.worker !== null;
    } catch {
      return false;
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}

