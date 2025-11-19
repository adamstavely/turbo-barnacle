export interface SuperResolutionAdapter {
  name: string;
  upscale(imageData: ImageData, scaleFactor: number): Promise<ImageData>;
  initialize?(): Promise<void>;
}

