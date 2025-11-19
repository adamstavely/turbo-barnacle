import { SuperResolutionAdapter } from './super-resolution-adapter.interface';

export class EsrganSrAdapter implements SuperResolutionAdapter {
  name = 'ESRGAN';
  private endpoint?: string;
  private model?: any; // TensorFlow.js model
  private modelLoaded = false;

  constructor(config?: { endpoint?: string; modelPath?: string }) {
    this.endpoint = config?.endpoint;
    // In production, modelPath could be used to load TensorFlow.js models
  }

  async initialize(): Promise<void> {
    // Try to load TensorFlow.js model if available
    try {
      // Check if TensorFlow.js is available
      if (typeof window !== 'undefined' && (window as any).tf) {
        await this.loadTensorFlowModel();
      } else if (this.endpoint) {
        // Test endpoint connectivity
        console.log('ESRGAN adapter: Using API endpoint for super-resolution');
      } else {
        console.warn('ESRGAN adapter: No endpoint or TensorFlow.js available. Will fallback to bicubic.');
      }
    } catch (error) {
      console.warn('ESRGAN adapter initialization failed:', error);
      if (!this.endpoint) {
        console.warn('ESRGAN adapter: Falling back to bicubic interpolation');
      }
    }
  }

  private async loadTensorFlowModel(): Promise<void> {
    // Placeholder for TensorFlow.js model loading
    // Example structure:
    // const tf = (window as any).tf;
    // this.model = await tf.loadLayersModel('/models/esrgan/model.json');
    // this.modelLoaded = true;
    // console.log('ESRGAN TensorFlow.js model loaded');
    
    // For now, mark as not loaded since we don't have the model
    this.modelLoaded = false;
  }

  async upscale(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
    // Priority: TensorFlow.js model > API endpoint > Bicubic fallback
    
    if (this.modelLoaded && this.model) {
      return this.upscaleViaTensorFlow(imageData, scaleFactor);
    }
    
    if (this.endpoint) {
      try {
        return await this.upscaleViaApi(imageData, scaleFactor);
      } catch (error) {
        console.warn('ESRGAN API failed, falling back to bicubic:', error);
        return this.fallbackToBicubic(imageData, scaleFactor);
      }
    }

    // Fallback to bicubic
    return this.fallbackToBicubic(imageData, scaleFactor);
  }

  private async upscaleViaTensorFlow(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
    // TensorFlow.js implementation
    // This would use the loaded model to perform super-resolution
    // Example structure:
    // const tf = (window as any).tf;
    // const tensor = tf.browser.fromPixels(imageData);
    // const upscaled = this.model.predict(tensor);
    // const upscaledData = await upscaled.data();
    // return this.tensorToImageData(upscaled, imageData.width * scaleFactor, imageData.height * scaleFactor);
    
    // For now, fallback since model isn't loaded
    return this.fallbackToBicubic(imageData, scaleFactor);
  }
  
  private async fallbackToBicubic(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
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

