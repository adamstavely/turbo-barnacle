/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'process':
        const { imageData, filter, params } = payload;
        const result = applyFilter(imageData, filter, params);
        self.postMessage({ type: 'process', result }, [result.data.buffer]);
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

function applyFilter(imageData: ImageData, filter: string, params: any): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  
  switch (filter) {
    case 'gaussian':
      result.data.set(applyGaussianBlur(imageData, params.radius || 1));
      break;
    case 'median':
      result.data.set(applyMedianFilter(imageData, params.radius || 1));
      break;
    case 'bilateral':
      result.data.set(applyBilateralFilter(imageData, params.spatialSigma || 5, params.colorSigma || 50));
      break;
    case 'sharpen':
      result.data.set(applySharpen(imageData, params.amount || 0.5));
      break;
    default:
      result.data.set(imageData.data);
  }
  
  return result;
}

function applyGaussianBlur(imageData: ImageData, radius: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(imageData.data);
  const size = Math.ceil(radius * 2) * 2 + 1;
  const kernel = createGaussianKernel(size, radius);
  const half = Math.floor(size / 2);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const px = Math.max(0, Math.min(imageData.width - 1, x + kx - half));
          const py = Math.max(0, Math.min(imageData.height - 1, y + ky - half));
          const idx = (py * imageData.width + px) * 4;
          const weight = kernel[ky * size + kx];

          r += imageData.data[idx] * weight;
          g += imageData.data[idx + 1] * weight;
          b += imageData.data[idx + 2] * weight;
        }
      }

      const idx = (y * imageData.width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = imageData.data[idx + 3];
    }
  }

  return data;
}

function applyMedianFilter(imageData: ImageData, radius: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(imageData.data);
  const r = Math.floor(radius);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const values: number[] = [];

      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
          const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
          const idx = (py * imageData.width + px) * 4;
          const gray = 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          values.push(gray);
        }
      }

      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];

      const idx = (y * imageData.width + x) * 4;
      data[idx] = median;
      data[idx + 1] = median;
      data[idx + 2] = median;
      data[idx + 3] = imageData.data[idx + 3];
    }
  }

  return data;
}

function applyBilateralFilter(imageData: ImageData, spatialSigma: number, colorSigma: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(imageData.data);
  const windowSize = Math.ceil(spatialSigma * 3) * 2 + 1;
  const halfWindow = Math.floor(windowSize / 2);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const centerIdx = (y * imageData.width + x) * 4;
      const centerR = imageData.data[centerIdx];
      const centerG = imageData.data[centerIdx + 1];
      const centerB = imageData.data[centerIdx + 2];

      let weightSum = 0;
      let rSum = 0, gSum = 0, bSum = 0;

      for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
          const px = Math.max(0, Math.min(imageData.width - 1, x + dx));
          const py = Math.max(0, Math.min(imageData.height - 1, y + dy));
          const idx = (py * imageData.width + px) * 4;

          const spatialDist = Math.sqrt(dx * dx + dy * dy);
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * spatialSigma * spatialSigma));

          const colorDist = Math.sqrt(
            Math.pow(imageData.data[idx] - centerR, 2) +
            Math.pow(imageData.data[idx + 1] - centerG, 2) +
            Math.pow(imageData.data[idx + 2] - centerB, 2)
          );
          const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * colorSigma * colorSigma));

          const weight = spatialWeight * colorWeight;
          rSum += imageData.data[idx] * weight;
          gSum += imageData.data[idx + 1] * weight;
          bSum += imageData.data[idx + 2] * weight;
          weightSum += weight;
        }
      }

      data[centerIdx] = rSum / weightSum;
      data[centerIdx + 1] = gSum / weightSum;
      data[centerIdx + 2] = bSum / weightSum;
      data[centerIdx + 3] = imageData.data[centerIdx + 3];
    }
  }

  return data;
}

function applySharpen(imageData: ImageData, amount: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(imageData.data);
  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];

  for (let y = 1; y < imageData.height - 1; y++) {
    for (let x = 1; x < imageData.width - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * imageData.width + (x + kx)) * 4;
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];

          r += imageData.data[idx] * weight;
          g += imageData.data[idx + 1] * weight;
          b += imageData.data[idx + 2] * weight;
        }
      }

      const idx = (y * imageData.width + x) * 4;
      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = imageData.data[idx + 3];
    }
  }

  return data;
}

function createGaussianKernel(size: number, sigma: number): number[] {
  const kernel: number[] = [];
  const center = Math.floor(size / 2);
  let sum = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel.push(value);
      sum += value;
    }
  }

  return kernel.map(v => v / sum);
}

