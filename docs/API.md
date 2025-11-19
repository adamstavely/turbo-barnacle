# API Documentation

## Services

### ImageProcessingService

Provides comprehensive image enhancement and processing capabilities.

#### Methods

##### `applyBrightness(imageData: ImageData, value: number): ImageData`
Adjusts image brightness.
- **Parameters:**
  - `imageData`: Source image data
  - `value`: Brightness adjustment (-1 to 1, where 0 is no change)
- **Returns:** Processed ImageData

##### `applyContrast(imageData: ImageData, value: number): ImageData`
Adjusts image contrast.
- **Parameters:**
  - `imageData`: Source image data
  - `value`: Contrast adjustment (-1 to 1)
- **Returns:** Processed ImageData

##### `applySaturation(imageData: ImageData, value: number): ImageData`
Adjusts color saturation.
- **Parameters:**
  - `imageData`: Source image data
  - `value`: Saturation adjustment (-1 to 1)
- **Returns:** Processed ImageData

##### `applyGamma(imageData: ImageData, value: number): ImageData`
Applies gamma correction.
- **Parameters:**
  - `imageData`: Source image data
  - `value`: Gamma value (0.1 to 3.0)
- **Returns:** Processed ImageData

##### `applySharpen(imageData: ImageData, amount: number): ImageData`
Sharpens the image.
- **Parameters:**
  - `imageData`: Source image data
  - `amount`: Sharpening amount (0 to 1)
- **Returns:** Processed ImageData

##### `applyDenoiseGaussian(imageData: ImageData, radius: number): ImageData`
Applies Gaussian denoising.
- **Parameters:**
  - `imageData`: Source image data
  - `radius`: Blur radius
- **Returns:** Processed ImageData

##### `applyDenoiseMedian(imageData: ImageData, radius: number): ImageData`
Applies median filter denoising.
- **Parameters:**
  - `imageData`: Source image data
  - `radius`: Filter radius
- **Returns:** Processed ImageData

##### `applyBinarization(imageData: ImageData, method: 'otsu' | 'niblack' | 'sauvola', params?: any): ImageData`
Converts image to binary (black and white).
- **Parameters:**
  - `imageData`: Source image data
  - `method`: Binarization method
  - `params`: Optional method-specific parameters
- **Returns:** Processed ImageData

##### `applyCLAHE(imageData: ImageData, clipLimit?: number, tileSize?: number): ImageData`
Applies Contrast Limited Adaptive Histogram Equalization.
- **Parameters:**
  - `imageData`: Source image data
  - `clipLimit`: Contrast clipping limit (default: 2.0)
  - `tileSize`: Tile size for adaptive processing (default: 8)
- **Returns:** Processed ImageData

##### `removeShadows(imageData: ImageData, intensity: number): ImageData`
Removes shadows from the image.
- **Parameters:**
  - `imageData`: Source image data
  - `intensity`: Removal intensity (0 to 100)
- **Returns:** Processed ImageData

##### `removeGlare(imageData: ImageData, intensity: number): ImageData`
Removes glare/highlights from the image.
- **Parameters:**
  - `imageData`: Source image data
  - `intensity`: Removal intensity (0 to 100)
- **Returns:** Processed ImageData

##### `whitenBackground(imageData: ImageData, threshold?: number): ImageData`
Whitens the background of the image.
- **Parameters:**
  - `imageData`: Source image data
  - `threshold`: Brightness threshold (default: 200)
- **Returns:** Processed ImageData

##### `removeMoire(imageData: ImageData, intensity: number): ImageData`
Removes Moiré patterns from scanned images.
- **Parameters:**
  - `imageData`: Source image data
  - `intensity`: Removal intensity (0 to 100)
- **Returns:** Processed ImageData

##### `removeMoireAsync(imageData: ImageData, intensity: number): Promise<ImageData>`
Asynchronous Moiré pattern removal using Web Workers.
- **Parameters:**
  - `imageData`: Source image data
  - `intensity`: Removal intensity (0 to 100)
- **Returns:** Promise resolving to processed ImageData

##### `isolateColorChannel(imageData: ImageData, channel: string): ImageData`
Isolates a specific color channel for analysis.
- **Parameters:**
  - `imageData`: Source image data
  - `channel`: Channel to isolate ('red', 'green', 'blue', 'hue', 'saturation', 'value', 'lightness', 'a-channel', 'b-channel', or null)
- **Returns:** Processed ImageData

##### `removeHighlights(imageData: ImageData, intensity: 'soft' | 'medium' | 'aggressive'): ImageData`
Removes highlights/markers from the image.
- **Parameters:**
  - `imageData`: Source image data
  - `intensity`: Removal intensity level
- **Returns:** Processed ImageData

##### `removeHighlightsAsync(imageData: ImageData, intensity: 'soft' | 'medium' | 'aggressive'): Promise<ImageData>`
Asynchronous highlight removal using Web Workers.
- **Parameters:**
  - `imageData`: Source image data
  - `intensity`: Removal intensity level
- **Returns:** Promise resolving to processed ImageData

---

### SuperResolutionService

Manages super-resolution upscaling adapters.

#### Methods

##### `registerAdapter(adapter: SuperResolutionAdapter): void`
Registers a new super-resolution adapter.
- **Parameters:**
  - `adapter`: Adapter implementing SuperResolutionAdapter interface

##### `getAvailableAdapters(): SuperResolutionAdapter[]`
Returns all registered adapters.
- **Returns:** Array of available adapters

##### `async setAdapter(name: string): Promise<void>`
Sets the active super-resolution adapter.
- **Parameters:**
  - `name`: Adapter name
- **Throws:** Error if adapter not found

##### `getCurrentAdapter(): SuperResolutionAdapter | null`
Gets the currently active adapter.
- **Returns:** Active adapter or null

##### `async upscale(imageData: ImageData, scaleFactor: number, adapterName?: string): Promise<ImageData>`
Upscales an image using the specified adapter.
- **Parameters:**
  - `imageData`: Source image data
  - `scaleFactor`: Upscaling factor (e.g., 2 for 2x)
  - `adapterName`: Optional adapter name (uses current if not specified)
- **Returns:** Promise resolving to upscaled ImageData

---

### SignatureDetectionService

Manages signature detection adapters.

#### Methods

##### `registerAdapter(adapter: SignatureDetectionAdapter): void`
Registers a new signature detection adapter.
- **Parameters:**
  - `adapter`: Adapter implementing SignatureDetectionAdapter interface

##### `getAvailableAdapters(): SignatureDetectionAdapter[]`
Returns all registered adapters.
- **Returns:** Array of available adapters

##### `async setAdapter(name: string): Promise<void>`
Sets the active signature detection adapter.
- **Parameters:**
  - `name`: Adapter name
- **Throws:** Error if adapter not found

##### `async detectSignatures(imageData: ImageData): Promise<Signature[]>`
Detects signatures in the image.
- **Parameters:**
  - `imageData`: Source image data
- **Returns:** Promise resolving to array of detected signatures

##### `async exportSignatureAsPng(imageData: ImageData, signature: Signature): Promise<Blob>`
Exports a detected signature as PNG.
- **Parameters:**
  - `imageData`: Source image data
  - `signature`: Signature to export
- **Returns:** Promise resolving to PNG blob

---

### AuditLogService

Provides audit logging functionality with IndexedDB storage.

#### Methods

##### `async initialize(): Promise<void>`
Initializes the IndexedDB database.
- **Returns:** Promise that resolves when initialization is complete

##### `async logEntry(entry: AuditLogEntry): Promise<void>`
Logs an audit entry.
- **Parameters:**
  - `entry`: Audit log entry to store
- **Returns:** Promise that resolves when entry is logged

##### `async getLogs(limit?: number): Promise<AuditLogEntry[]>`
Retrieves audit logs.
- **Parameters:**
  - `limit`: Maximum number of logs to retrieve (default: 100)
- **Returns:** Promise resolving to array of log entries

##### `async clearLogs(): Promise<void>`
Clears all audit logs.
- **Returns:** Promise that resolves when logs are cleared

##### `registerPlugin(plugin: AuditLogPlugin): void`
Registers an audit log plugin.
- **Parameters:**
  - `plugin`: Plugin implementing AuditLogPlugin interface

##### `unregisterPlugin(name: string): void`
Unregisters an audit log plugin.
- **Parameters:**
  - `name`: Plugin name

#### Helper Methods

##### `logOcrOperation(engine: string, metadata?: any): Promise<void>`
Logs an OCR operation.
- **Parameters:**
  - `engine`: OCR engine name
  - `metadata`: Optional metadata

##### `logPreprocessing(steps: string[]): Promise<void>`
Logs preprocessing steps.
- **Parameters:**
  - `steps`: Array of preprocessing step names

##### `logBoundingBoxEdit(boxId: string, change: string): Promise<void>`
Logs a bounding box edit.
- **Parameters:**
  - `boxId`: Bounding box ID
  - `change`: Description of the change

##### `logExport(type: string, format: string): Promise<void>`
Logs an export action.
- **Parameters:**
  - `type`: Export type
  - `format`: Export format

##### `logMaskOperation(regionCount: number): Promise<void>`
Logs a mask operation.
- **Parameters:**
  - `regionCount`: Number of mask regions

---

### MaskService

Manages mask regions for secure image sandboxing.

#### Methods

##### `addMaskRegion(region: MaskRegion): void`
Adds a mask region.
- **Parameters:**
  - `region`: Mask region to add

##### `removeMaskRegion(id: string): void`
Removes a mask region.
- **Parameters:**
  - `id`: Mask region ID

##### `getMaskRegions(): MaskRegion[]`
Gets all mask regions.
- **Returns:** Array of mask regions

##### `clearMaskRegions(): void`
Clears all mask regions.

##### `applyMaskToImageData(imageData: ImageData, regions: MaskRegion[]): ImageData`
Applies mask regions to image data (blacks out masked areas).
- **Parameters:**
  - `imageData`: Source image data
  - `regions`: Mask regions to apply
- **Returns:** Masked ImageData

---

### OcrPreviewService

Provides real-time OCR preview functionality.

#### Methods

##### `async previewRegion(imageData: ImageData, x: number, y: number, width: number, height: number, debounce?: boolean): Promise<OcrResult | null>`
Performs OCR on a specific image region.
- **Parameters:**
  - `imageData`: Source image data
  - `x`: Region X coordinate
  - `y`: Region Y coordinate
  - `width`: Region width
  - `height`: Region height
  - `debounce`: Whether to debounce the request (default: true)
- **Returns:** Promise resolving to OCR result or null

##### `cancelPending(): void`
Cancels any pending OCR preview requests.

---

### AutoCleanService

Provides automatic image enhancement recommendations.

#### Methods

##### `analyzeAndRecommend(imageData: ImageData): AutoCleanRecommendations`
Analyzes an image and provides enhancement recommendations.
- **Parameters:**
  - `imageData`: Source image data
- **Returns:** Recommendations object with suggested enhancements

#### AutoCleanRecommendations Interface

```typescript
interface AutoCleanRecommendations {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
  sharpen?: number;
  denoise?: number;
  binarization?: boolean;
  binarizationMethod?: 'otsu' | 'niblack' | 'sauvola';
  autoDeskew?: boolean;
  curvatureFlattening?: number;
  removeShadows?: boolean;
  removeGlare?: boolean;
  whitenBackground?: boolean;
  clahe?: boolean;
  confidence: number;
  reasoning: string[];
  transformations?: Array<{ name: string; params?: any; timestamp: number }>;
}
```

---

## Adapters

### SuperResolutionAdapter Interface

```typescript
interface SuperResolutionAdapter {
  name: string;
  initialize?(): Promise<void>;
  upscale(imageData: ImageData, scaleFactor: number): Promise<ImageData>;
}
```

#### Built-in Adapters

##### BicubicSrAdapter
Uses bicubic interpolation for upscaling.

##### EsrganSrAdapter
ESRGAN-based super-resolution (requires TensorFlow.js model or API endpoint).

**Configuration:**
```typescript
new EsrganSrAdapter({
  endpoint: 'https://api.example.com/esrgan', // Optional API endpoint
  modelPath: '/models/esrgan' // Optional TensorFlow.js model path
})
```

---

### SignatureDetectionAdapter Interface

```typescript
interface SignatureDetectionAdapter {
  name: string;
  initialize?(): Promise<void>;
  detectSignatures(imageData: ImageData): Promise<Signature[]>;
}
```

#### Built-in Adapters

##### SignatureDetectionMlAdapter
ML-based signature detection with heuristic fallback.

**Configuration:**
```typescript
new SignatureDetectionMlAdapter({
  endpoint: 'https://api.example.com/signature-detection' // Optional API endpoint
})
```

---

## Models

### MaskRegion

```typescript
interface MaskRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Signature

```typescript
interface Signature {
  id: string;
  boundingBox: BoundingBox;
  confidence: number;
}
```

### AuditLogEntry

```typescript
interface AuditLogEntry {
  id?: number;
  timestamp?: number;
  userId?: string;
  action: 'ocr' | 'preprocessing' | 'bounding_box_edit' | 'export' | 'mask' | 'other';
  engine?: string;
  preprocessingSteps?: string[];
  boundingBoxEdits?: Array<{ boxId: string; change: string }>;
  exportAction?: { type: string; format: string };
  maskRegions?: number;
  metadata?: Record<string, any>;
}
```

---

## Web Workers

### Moiré Removal Worker

Located at: `src/app/workers/moire-removal.worker.ts`

Processes Moiré pattern removal asynchronously.

### Highlight Removal Worker

Located at: `src/app/workers/highlight-removal.worker.ts`

Processes highlight/marker removal asynchronously.

---

## Usage Examples

### Using Super Resolution

```typescript
import { SuperResolutionService } from './services/super-resolution.service';

constructor(private superResolution: SuperResolutionService) {}

async upscaleImage(imageData: ImageData) {
  // Set adapter
  await this.superResolution.setAdapter('ESRGAN');
  
  // Upscale 2x
  const upscaled = await this.superResolution.upscale(imageData, 2);
  return upscaled;
}
```

### Using Signature Detection

```typescript
import { SignatureDetectionService } from './services/signature-detection.service';

constructor(private signatureDetection: SignatureDetectionService) {}

async detectSignatures(imageData: ImageData) {
  const signatures = await this.signatureDetection.detectSignatures(imageData);
  console.log(`Found ${signatures.length} signatures`);
  return signatures;
}
```

### Using Audit Logging

```typescript
import { AuditLogService } from './services/audit-log.service';

constructor(private auditLog: AuditLogService) {}

async ngOnInit() {
  await this.auditLog.initialize();
  
  // Log OCR operation
  await this.auditLog.logOcrOperation('Tesseract', {
    language: 'eng',
    psm: 3
  });
  
  // Retrieve logs
  const logs = await this.auditLog.getLogs(50);
  console.log('Recent logs:', logs);
}
```

### Using Mask Service

```typescript
import { MaskService } from './services/mask.service';

constructor(private maskService: MaskService) {}

addMask(x: number, y: number, width: number, height: number) {
  const region: MaskRegion = {
    id: `mask-${Date.now()}`,
    x,
    y,
    width,
    height
  };
  
  this.maskService.addMaskRegion(region);
}

applyMasks(imageData: ImageData): ImageData {
  const regions = this.maskService.getMaskRegions();
  return this.maskService.applyMaskToImageData(imageData, regions);
}
```

