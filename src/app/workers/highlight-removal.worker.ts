/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'process':
        const { imageData, intensity } = payload;
        const result = removeHighlights(imageData, intensity);
        self.postMessage({ type: 'process', result }, [result.data.buffer]);
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

function removeHighlights(imageData: ImageData, intensity: 'soft' | 'medium' | 'aggressive'): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  result.data.set(imageData.data);

  // Define highlight color ranges in HSV
  // Yellow highlights: H ~50-70, S > 0.3, V > 0.5
  // Pink highlights: H ~330-360 or 0-20, S > 0.3, V > 0.5
  // Green highlights: H ~100-150, S > 0.3, V > 0.5

  // Intensity settings
  const opacityReduction = {
    soft: 0.3,
    medium: 0.6,
    aggressive: 1.0
  };

  const reduction = opacityReduction[intensity];

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i] / 255;
    const g = imageData.data[i + 1] / 255;
    const b = imageData.data[i + 2] / 255;
    const a = imageData.data[i + 3];

    // Convert RGB to HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
      h /= 6;
    }

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    // Check if pixel is in highlight color range
    let isHighlight = false;
    
    // Yellow: H ~0.14-0.19 (50-70 degrees)
    if (h >= 0.14 && h <= 0.19 && s > 0.3 && v > 0.5) {
      isHighlight = true;
    }
    // Pink: H ~0.92-1.0 or 0.0-0.06 (330-360 or 0-20 degrees)
    else if ((h >= 0.92 || h <= 0.06) && s > 0.3 && v > 0.5) {
      isHighlight = true;
    }
    // Green: H ~0.28-0.42 (100-150 degrees)
    else if (h >= 0.28 && h <= 0.42 && s > 0.3 && v > 0.5) {
      isHighlight = true;
    }

    if (isHighlight) {
      if (reduction >= 1.0) {
        // Full removal: use inpainting (average of neighbors)
        const neighbors = getNeighborAverage(imageData, Math.floor((i / 4) % imageData.width), Math.floor((i / 4) / imageData.width), 3);
        result.data[i] = neighbors.r;
        result.data[i + 1] = neighbors.g;
        result.data[i + 2] = neighbors.b;
        result.data[i + 3] = a;
      } else {
        // Partial removal: blend with background
        // Estimate background as average of surrounding pixels
        const neighbors = getNeighborAverage(imageData, Math.floor((i / 4) % imageData.width), Math.floor((i / 4) / imageData.width), 5);
        result.data[i] = Math.round(imageData.data[i] * (1 - reduction) + neighbors.r * reduction);
        result.data[i + 1] = Math.round(imageData.data[i + 1] * (1 - reduction) + neighbors.g * reduction);
        result.data[i + 2] = Math.round(imageData.data[i + 2] * (1 - reduction) + neighbors.b * reduction);
        result.data[i + 3] = a;
      }
    }
  }

  return result;
}

function getNeighborAverage(imageData: ImageData, x: number, y: number, radius: number): { r: number; g: number; b: number } {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
        const idx = (py * imageData.width + px) * 4;
        rSum += imageData.data[idx];
        gSum += imageData.data[idx + 1];
        bSum += imageData.data[idx + 2];
        count++;
      }
    }
  }

  return {
    r: count > 0 ? rSum / count : 0,
    g: count > 0 ? gSum / count : 0,
    b: count > 0 ? bSum / count : 0
  };
}

