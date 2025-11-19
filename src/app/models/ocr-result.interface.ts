import { BoundingBox } from './bounding-box.interface';

export interface OcrResult {
  text: string;
  boundingBoxes: BoundingBox[];
  confidence?: number;
  engine: string;
  processingTime?: number;
  metadata?: Record<string, any>;
}

