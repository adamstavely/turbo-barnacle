/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'detect':
        const { imageData } = payload;
        const angle = detectDeskewAngle(imageData);
        self.postMessage({ type: 'detect', angle });
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

function detectDeskewAngle(imageData: ImageData): number {
  // Simplified deskew detection using edge detection and line analysis
  const gray = toGrayscale(imageData);
  const edges = detectEdges(gray);
  
  // Analyze edge directions
  const angles: number[] = [];
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < edges.height - 1; y++) {
    for (let x = 1; x < edges.width - 1; x++) {
      const pixel = getPixelDeskew(edges, x, y);
      if (pixel.r > 128) {
        let gx = 0, gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const p = getPixelDeskew(edges, x + kx, y + ky);
            const idx = (ky + 1) * 3 + (kx + 1);
            gx += p.r * sobelX[idx];
            gy += p.r * sobelY[idx];
          }
        }

        if (Math.abs(gx) > 10 || Math.abs(gy) > 10) {
          const angle = Math.atan2(gy, gx) * 180 / Math.PI;
          angles.push(angle);
        }
      }
    }
  }

  if (angles.length === 0) return 0;

  // Find dominant angle
  const angleCounts = new Map<number, number>();
  angles.forEach(angle => {
    const rounded = Math.round(angle / 5) * 5;
    angleCounts.set(rounded, (angleCounts.get(rounded) || 0) + 1);
  });

  let maxCount = 0;
  let dominantAngle = 0;
  angleCounts.forEach((count, angle) => {
    if (count > maxCount) {
      maxCount = count;
      dominantAngle = angle;
    }
  });

  return dominantAngle;
}

function toGrayscale(imageData: ImageData): ImageData {
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

function detectEdges(imageData: ImageData): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < imageData.height - 1; y++) {
    for (let x = 1; x < imageData.width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * imageData.width + (x + kx)) * 4;
          const pixelValue = imageData.data[idx];
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += pixelValue * sobelX[kernelIdx];
          gy += pixelValue * sobelY[kernelIdx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const value = Math.min(255, magnitude);
      const idx = (y * imageData.width + x) * 4;
      result.data[idx] = value;
      result.data[idx + 1] = value;
      result.data[idx + 2] = value;
      result.data[idx + 3] = 255;
    }
  }

  return result;
}

function getPixelDeskew(img: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const index = (y * img.width + x) * 4;
  return {
    r: img.data[index],
    g: img.data[index + 1],
    b: img.data[index + 2],
    a: img.data[index + 3]
  };
}

