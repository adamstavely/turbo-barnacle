export interface OcrOptions {
  language?: string;
  psm?: number; // Page segmentation mode (for Tesseract)
  oem?: number; // OCR engine mode
  customParams?: Record<string, any>;
}

