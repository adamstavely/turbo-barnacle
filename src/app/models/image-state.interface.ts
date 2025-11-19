import { BoundingBox } from './bounding-box.interface';
import { OcrResult } from './ocr-result.interface';

export interface ImageTransform {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
  sharpen?: number;
  denoise?: number;
  binarization?: boolean;
  rotation?: number;
  scale?: number;
  perspective?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
  lensDistortion?: {
    barrel?: number;
    pincushion?: number;
  };
}

export interface ImageState {
  originalImageData: ImageData | null;
  currentImageData: ImageData | null;
  imageUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  width: number;
  height: number;
  transforms: ImageTransform;
  ocrResults: OcrResult[];
  boundingBoxes: BoundingBox[];
  selectedBoxId: string | null;
}

