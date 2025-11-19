import { BoundingBox } from './bounding-box.interface';

export interface Signature {
  id: string;
  boundingBox: BoundingBox;
  confidence: number;
}

