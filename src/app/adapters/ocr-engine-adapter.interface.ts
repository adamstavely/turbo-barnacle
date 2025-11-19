import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';

export interface OcrEngineAdapter {
  name: string;
  initialize?(config?: any): Promise<void>;
  performOCR(imageBlob: Blob, options?: OcrOptions): Promise<OcrResult>;
  isAvailable?(): boolean | Promise<boolean>;
}

