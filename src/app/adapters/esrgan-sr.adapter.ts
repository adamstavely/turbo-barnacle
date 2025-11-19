import { SuperResolutionAdapter } from './super-resolution-adapter.interface';

export class EsrganSrAdapter implements SuperResolutionAdapter {
  name = 'ESRGAN';
  private endpoint?: string;

  constructor(config?: { endpoint?: string }) {
    this.endpoint = config?.endpoint;
  }

  async initialize(): Promise<void> {
    // For now, this is a placeholder for future ML model loading
    // In production, this could load TensorFlow.js models or connect to a backend API
    if (!this.endpoint) {
      console.warn('ESRGAN adapter: No endpoint configured. Falling back to bicubic.');
    }
  }

  async upscale(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
    // If endpoint is provided, use backend API
    if (this.endpoint) {
      return this.upscaleViaApi(imageData, scaleFactor);
    }

    // Otherwise, fallback to bicubic (or could load TensorFlow.js model here)
    console.warn('ESRGAN not available, falling back to bicubic interpolation');
    const { BicubicSrAdapter } = await import('./bicubic-sr.adapter');
    const bicubic = new BicubicSrAdapter();
    return bicubic.upscale(imageData, scaleFactor);
  }

  private async upscaleViaApi(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
    // Convert ImageData to blob
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to convert canvas to blob'));
      }, 'image/png');
    });

    // Send to API
    const formData = new FormData();
    formData.append('image', blob);
    formData.append('scale', scaleFactor.toString());

    const response = await fetch(this.endpoint!, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`ESRGAN API error: ${response.statusText}`);
    }

    const resultBlob = await response.blob();
    const img = await this.blobToImageData(resultBlob);
    return img;
  }

  private async blobToImageData(blob: Blob): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }
}

