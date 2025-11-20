import { SuperResolutionAdapter } from './super-resolution-adapter.interface';
import * as tf from '@tensorflow/tfjs';

export class EsrganSrAdapter implements SuperResolutionAdapter {
  name = 'ESRGAN';
  private endpoint?: string;
  private modelPath?: string;
  private model: tf.LayersModel | null = null;
  private modelLoaded = false;

  constructor(config?: { endpoint?: string; modelPath?: string }) {
    this.endpoint = config?.endpoint;
    this.modelPath = config?.modelPath || '/models/esrgan/model.json';
  }

  async initialize(): Promise<void> {
    // Try to load TensorFlow.js model if available
    try {
      // Check if TensorFlow.js is available
      if (typeof window !== 'undefined' && typeof tf !== 'undefined') {
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
    try {
      // Load TensorFlow.js model
      this.model = await tf.loadLayersModel(this.modelPath!);
      this.modelLoaded = true;
      console.log('ESRGAN TensorFlow.js model loaded successfully');
    } catch (error) {
      console.warn('Failed to load ESRGAN TensorFlow.js model:', error);
      this.modelLoaded = false;
      // Don't throw - allow fallback to API or bicubic
    }
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
    if (!this.model || !this.modelLoaded) {
      throw new Error('TensorFlow.js model not loaded');
    }

    try {
      // Convert ImageData to TensorFlow tensor
      // Create a temporary canvas to convert ImageData
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');
      ctx.putImageData(imageData, 0, 0);

      // Convert canvas to tensor (normalized to [0, 1])
      const tensor = tf.browser.fromPixels(canvas).expandDims(0);
      const normalized = tensor.div(255.0);

      // Run model prediction
      const prediction = this.model.predict(normalized) as tf.Tensor;
      
      // Handle different output shapes - some models output [batch, height, width, channels]
      // Some may need additional processing based on scale factor
      let upscaled = prediction;
      
      // If model doesn't handle the scale factor directly, we may need to interpolate
      // For now, assume model outputs at the desired scale
      if (prediction.shape[1] !== imageData.height * scaleFactor || 
          prediction.shape[2] !== imageData.width * scaleFactor) {
        // Model output doesn't match expected scale - use bicubic fallback
        tensor.dispose();
        normalized.dispose();
        prediction.dispose();
        return this.fallbackToBicubic(imageData, scaleFactor);
      }

      // Denormalize and convert back to ImageData
      const denormalized = upscaled.mul(255.0).clipByValue(0, 255);
      const squeezed = denormalized.squeeze([0]); // Remove batch dimension
      
      const result = await this.tensorToImageData(
        squeezed,
        imageData.width * scaleFactor,
        imageData.height * scaleFactor
      );

      // Clean up tensors
      tensor.dispose();
      normalized.dispose();
      prediction.dispose();
      denormalized.dispose();
      squeezed.dispose();

      return result;
    } catch (error) {
      console.error('TensorFlow.js upscaling failed:', error);
      return this.fallbackToBicubic(imageData, scaleFactor);
    }
  }

  /**
   * Convert TensorFlow tensor to ImageData
   */
  private async tensorToImageData(tensor: tf.Tensor, width: number, height: number): Promise<ImageData> {
    const data = await tensor.data();
    const imageData = new ImageData(width, height);
    
    // Tensor is typically [height, width, channels] with channels in RGB order
    let idx = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x) * 3;
        imageData.data[idx++] = Math.round(data[pixelIdx]);     // R
        imageData.data[idx++] = Math.round(data[pixelIdx + 1]); // G
        imageData.data[idx++] = Math.round(data[pixelIdx + 2]); // B
        imageData.data[idx++] = 255; // Alpha
      }
    }
    
    return imageData;
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

