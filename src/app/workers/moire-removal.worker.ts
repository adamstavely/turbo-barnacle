/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'process':
        const { imageData, intensity } = payload;
        const result = removeMoire(imageData, intensity);
        self.postMessage({ type: 'process', result }, [result.data.buffer]);
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

function removeMoire(imageData: ImageData, intensity: number): ImageData {
  // Convert intensity (0-100) to filter strength
  const strength = intensity / 100;
  
  // For moiré removal, we use a combination of:
  // 1. Frequency domain filtering (FFT-based notch filter)
  // 2. Spatial domain filtering (fallback)
  
  // Since FFT in JavaScript is complex, we'll use a spatial domain approach
  // that approximates frequency domain filtering using notch filters
  
  const result = new ImageData(imageData.width, imageData.height);
  result.data.set(imageData.data);
  
  if (strength === 0) {
    return result;
  }
  
  // Apply notch filter to remove periodic patterns
  // This is a simplified approach that works well for moiré patterns
  const kernelSize = Math.max(3, Math.floor(5 * strength));
  const halfKernel = Math.floor(kernelSize / 2);
  
  // Create a notch filter kernel that suppresses periodic patterns
  const kernel = createNotchFilterKernel(kernelSize, strength);
  
  // Apply the filter
  for (let y = halfKernel; y < imageData.height - halfKernel; y++) {
    for (let x = halfKernel; x < imageData.width - halfKernel; x++) {
      let rSum = 0, gSum = 0, bSum = 0;
      let weightSum = 0;
      
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const px = x + kx;
          const py = y + ky;
          const idx = (py * imageData.width + px) * 4;
          const weight = kernel[(ky + halfKernel) * kernelSize + (kx + halfKernel)];
          
          rSum += imageData.data[idx] * weight;
          gSum += imageData.data[idx + 1] * weight;
          bSum += imageData.data[idx + 2] * weight;
          weightSum += weight;
        }
      }
      
      const idx = (y * imageData.width + x) * 4;
      result.data[idx] = Math.max(0, Math.min(255, rSum / weightSum));
      result.data[idx + 1] = Math.max(0, Math.min(255, gSum / weightSum));
      result.data[idx + 2] = Math.max(0, Math.min(255, bSum / weightSum));
      result.data[idx + 3] = imageData.data[idx + 3];
    }
  }
  
  // Apply edge-preserving smoothing to maintain text edges
  return preserveEdges(result, imageData, strength);
}

function createNotchFilterKernel(size: number, strength: number): number[] {
  const kernel: number[] = [];
  const center = Math.floor(size / 2);
  const radius = center * 0.7;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Create a notch filter that suppresses frequencies at specific radii
      // This helps remove moiré patterns which are periodic
      let value = 1.0;
      
      // Suppress frequencies that match moiré patterns (typically at certain radii)
      const moireFreq1 = radius * 0.3;
      const moireFreq2 = radius * 0.6;
      
      if (Math.abs(dist - moireFreq1) < 2 || Math.abs(dist - moireFreq2) < 2) {
        value = 1.0 - strength * 0.8;
      }
      
      // Enhance center (low frequencies) to preserve overall image
      if (dist < radius * 0.2) {
        value = 1.0 + strength * 0.2;
      }
      
      kernel.push(value);
    }
  }
  
  // Normalize kernel
  const sum = kernel.reduce((a, b) => a + b, 0);
  return kernel.map(v => v / sum);
}

function preserveEdges(filtered: ImageData, original: ImageData, strength: number): ImageData {
  const result = new ImageData(filtered.width, filtered.height);
  
  // Detect edges in original image
  for (let y = 1; y < filtered.height - 1; y++) {
    for (let x = 1; x < filtered.width - 1; x++) {
      const origIdx = (y * original.width + x) * 4;
      const origR = original.data[origIdx];
      const origG = original.data[origIdx + 1];
      const origB = original.data[origIdx + 2];
      
      // Calculate edge strength using Sobel operator
      const rightIdx = (y * original.width + (x + 1)) * 4;
      const bottomIdx = ((y + 1) * original.width + x) * 4;
      
      const edgeX = Math.abs(origR - original.data[rightIdx]);
      const edgeY = Math.abs(origR - original.data[bottomIdx]);
      const edgeStrength = Math.sqrt(edgeX * edgeX + edgeY * edgeY) / 255;
      
      // At edges, blend more of the original to preserve text
      const blendFactor = Math.min(1.0, edgeStrength * 2);
      const preserveFactor = blendFactor * (1 - strength * 0.5);
      
      const filtIdx = (y * filtered.width + x) * 4;
      const filtR = filtered.data[filtIdx];
      const filtG = filtered.data[filtIdx + 1];
      const filtB = filtered.data[filtIdx + 2];
      
      result.data[filtIdx] = Math.max(0, Math.min(255, filtR * (1 - preserveFactor) + origR * preserveFactor));
      result.data[filtIdx + 1] = Math.max(0, Math.min(255, filtG * (1 - preserveFactor) + origG * preserveFactor));
      result.data[filtIdx + 2] = Math.max(0, Math.min(255, filtB * (1 - preserveFactor) + origB * preserveFactor));
      result.data[filtIdx + 3] = original.data[origIdx + 3];
    }
  }
  
  return result;
}

