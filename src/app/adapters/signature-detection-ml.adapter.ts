import { SignatureDetectionAdapter } from './signature-detection-adapter.interface';
import { Signature } from '../models/signature.interface';

export class SignatureDetectionMlAdapter implements SignatureDetectionAdapter {
  name = 'ML Signature Detection';
  private endpoint?: string;

  constructor(config?: { endpoint?: string }) {
    this.endpoint = config?.endpoint;
  }

  async initialize(): Promise<void> {
    // Placeholder for ML model loading
    // In production, this could load TensorFlow.js models or connect to a backend API
    if (!this.endpoint) {
      console.warn('Signature detection adapter: No endpoint configured. Using heuristic detection.');
    }
  }

  async detectSignatures(imageData: ImageData): Promise<Signature[]> {
    // If endpoint is provided, use backend API
    if (this.endpoint) {
      return this.detectViaApi(imageData);
    }

    // Otherwise, use heuristic detection (look for regions with high stroke density and low text)
    return this.detectHeuristic(imageData);
  }

  private async detectViaApi(imageData: ImageData): Promise<Signature[]> {
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

    const response = await fetch(this.endpoint!, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Signature detection API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.signatures || [];
  }

  private async detectHeuristic(imageData: ImageData): Promise<Signature[]> {
    // Heuristic detection: look for regions with:
    // 1. High edge density (signatures have many strokes)
    // 2. Low text density (signatures are not regular text)
    // 3. Specific aspect ratios (signatures are usually wider than tall)
    
    const signatures: Signature[] = [];
    const gray = this.toGrayscale(imageData);
    const edges = this.detectEdges(gray);
    
    // Divide image into regions and analyze
    const regionSize = 100;
    const threshold = 0.3; // Edge density threshold
    
    for (let y = 0; y < imageData.height - regionSize; y += regionSize / 2) {
      for (let x = 0; x < imageData.width - regionSize; x += regionSize / 2) {
        const edgeDensity = this.calculateEdgeDensity(edges, x, y, regionSize, regionSize);
        const textDensity = this.estimateTextDensity(imageData, x, y, regionSize, regionSize);
        
        // Signature-like regions have high edge density but low text density
        if (edgeDensity > threshold && textDensity < 0.2) {
          // Check aspect ratio (signatures are usually wider)
          const aspectRatio = regionSize / regionSize;
          if (aspectRatio >= 0.5 && aspectRatio <= 2.0) {
            signatures.push({
              id: `signature-${Date.now()}-${x}-${y}`,
              boundingBox: {
                id: `sig-${Date.now()}-${x}-${y}`,
                x,
                y,
                width: regionSize,
                height: regionSize,
                text: '',
                confidence: edgeDensity
              },
              confidence: edgeDensity
            });
          }
        }
      }
    }
    
    // Merge overlapping detections
    return this.mergeOverlappingSignatures(signatures);
  }

  private toGrayscale(imageData: ImageData): ImageData {
    const result = new ImageData(imageData.width, imageData.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
      result.data[i] = gray;
      result.data[i + 1] = gray;
      result.data[i + 2] = gray;
      result.data[i + 3] = imageData.data[i + 3];
    }
    return result;
  }

  private detectEdges(gray: ImageData): ImageData {
    const result = new ImageData(gray.width, gray.height);
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < gray.height - 1; y++) {
      for (let x = 1; x < gray.width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * gray.width + (x + kx)) * 4;
            const pixel = gray.data[idx];
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += pixel * sobelX[kernelIdx];
            gy += pixel * sobelY[kernelIdx];
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const value = Math.min(255, magnitude);
        const idx = (y * gray.width + x) * 4;
        result.data[idx] = value;
        result.data[idx + 1] = value;
        result.data[idx + 2] = value;
        result.data[idx + 3] = 255;
      }
    }
    
    return result;
  }

  private calculateEdgeDensity(edges: ImageData, x: number, y: number, width: number, height: number): number {
    let edgePixels = 0;
    let totalPixels = 0;
    
    for (let py = y; py < Math.min(y + height, edges.height); py++) {
      for (let px = x; px < Math.min(x + width, edges.width); px++) {
        const idx = (py * edges.width + px) * 4;
        if (edges.data[idx] > 128) {
          edgePixels++;
        }
        totalPixels++;
      }
    }
    
    return totalPixels > 0 ? edgePixels / totalPixels : 0;
  }

  private estimateTextDensity(imageData: ImageData, x: number, y: number, width: number, height: number): number {
    // Simple heuristic: text regions have more uniform patterns
    // Signatures have more irregular patterns
    // This is a simplified approach
    return 0.1; // Placeholder
  }

  private mergeOverlappingSignatures(signatures: Signature[]): Signature[] {
    const merged: Signature[] = [];
    const used = new Set<string>();
    
    for (const sig of signatures) {
      if (used.has(sig.id)) continue;
      
      const overlapping = signatures.filter(s => 
        s.id !== sig.id &&
        !used.has(s.id) &&
        this.isOverlapping(sig.boundingBox, s.boundingBox)
      );
      
      if (overlapping.length > 0) {
        // Merge overlapping signatures
        const all = [sig, ...overlapping];
        const minX = Math.min(...all.map(s => s.boundingBox.x));
        const minY = Math.min(...all.map(s => s.boundingBox.y));
        const maxX = Math.max(...all.map(s => s.boundingBox.x + s.boundingBox.width));
        const maxY = Math.max(...all.map(s => s.boundingBox.y + s.boundingBox.height));
        
        merged.push({
          id: sig.id,
          boundingBox: {
            id: sig.boundingBox.id,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            text: '',
            confidence: all.reduce((sum, s) => sum + s.confidence, 0) / all.length
          },
          confidence: all.reduce((sum, s) => sum + s.confidence, 0) / all.length
        });
        
        all.forEach(s => used.add(s.id));
      } else {
        merged.push(sig);
        used.add(sig.id);
      }
    }
    
    return merged;
  }

  private isOverlapping(box1: { x: number; y: number; width: number; height: number }, 
                       box2: { x: number; y: number; width: number; height: number }): boolean {
    return !(box1.x + box1.width < box2.x || 
             box2.x + box2.width < box1.x ||
             box1.y + box1.height < box2.y ||
             box2.y + box2.height < box1.y);
  }
}

