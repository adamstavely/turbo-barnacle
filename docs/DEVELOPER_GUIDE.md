# Developer Guide

## Extending the Application

This guide explains how to extend the OCR application with custom adapters, services, and components.

---

## Architecture Overview

The application uses an **adapter pattern** for extensibility:

- **OCR Engines:** Pluggable OCR engine adapters
- **Super Resolution:** Pluggable upscaling adapters
- **Signature Detection:** Pluggable detection adapters

All adapters follow a consistent interface pattern for easy integration.

---

## Creating Custom Adapters

### Super Resolution Adapter

Create a custom super-resolution adapter by implementing the `SuperResolutionAdapter` interface:

```typescript
import { SuperResolutionAdapter } from '../adapters/super-resolution-adapter.interface';

export class MyCustomSrAdapter implements SuperResolutionAdapter {
  name = 'My Custom SR';
  
  async initialize(): Promise<void> {
    // Initialize your model or API connection
    // This is called once when the adapter is registered
  }
  
  async upscale(imageData: ImageData, scaleFactor: number): Promise<ImageData> {
    // Implement your upscaling logic
    // Return upscaled ImageData
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width * scaleFactor;
    canvas.height = imageData.height * scaleFactor;
    const ctx = canvas.getContext('2d');
    
    // Your upscaling implementation here
    // ...
    
    return ctx!.getImageData(0, 0, canvas.width, canvas.height);
  }
}
```

**Register your adapter:**

```typescript
import { SuperResolutionService } from './services/super-resolution.service';
import { MyCustomSrAdapter } from './adapters/my-custom-sr.adapter';

constructor(private superResolution: SuperResolutionService) {
  // Register your adapter
  this.superResolution.registerAdapter(new MyCustomSrAdapter());
  
  // Optionally set it as default
  this.superResolution.setAdapter('My Custom SR');
}
```

---

### Signature Detection Adapter

Create a custom signature detection adapter:

```typescript
import { SignatureDetectionAdapter } from '../adapters/signature-detection-adapter.interface';
import { Signature } from '../models/signature.interface';

export class MySignatureAdapter implements SignatureDetectionAdapter {
  name = 'My Signature Detection';
  
  async initialize(): Promise<void> {
    // Initialize your model or API connection
  }
  
  async detectSignatures(imageData: ImageData): Promise<Signature[]> {
    // Implement your detection logic
    // Return array of detected signatures
    
    const signatures: Signature[] = [];
    
    // Your detection implementation here
    // ...
    
    return signatures;
  }
}
```

**Register your adapter:**

```typescript
import { SignatureDetectionService } from './services/signature-detection.service';
import { MySignatureAdapter } from './adapters/my-signature.adapter';

constructor(private signatureDetection: SignatureDetectionService) {
  this.signatureDetection.registerAdapter(new MySignatureAdapter());
  this.signatureDetection.setAdapter('My Signature Detection');
}
```

---

### OCR Engine Adapter

Create a custom OCR engine adapter:

```typescript
import { OcrEngineAdapter } from '../adapters/ocr-engine-adapter.interface';
import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';

export class MyOcrAdapter implements OcrEngineAdapter {
  name = 'My OCR Engine';
  
  async initialize(): Promise<void> {
    // Initialize your OCR engine
  }
  
  async recognize(image: Blob, options?: OcrOptions): Promise<OcrResult> {
    // Implement your OCR logic
    // Return OCR result
    
    const result: OcrResult = {
      text: 'Detected text...',
      boundingBoxes: [],
      confidence: 0.95,
      engine: this.name,
      processingTime: 1000
    };
    
    return result;
  }
}
```

**Register your adapter:**

```typescript
import { OcrEngineService } from './services/ocr-engine.service';
import { MyOcrAdapter } from './adapters/my-ocr.adapter';

constructor(private ocrEngine: OcrEngineService) {
  this.ocrEngine.registerAdapter(new MyOcrAdapter());
  this.ocrEngine.setAdapter('My OCR Engine');
}
```

---

## Creating Custom Services

### Example: Custom Image Processing Service

Extend the image processing capabilities:

```typescript
import { Injectable } from '@angular/core';
import { ImageProcessingService } from './image-processing.service';

@Injectable({
  providedIn: 'root'
})
export class CustomImageProcessingService extends ImageProcessingService {
  
  customEnhancement(imageData: ImageData, param: number): ImageData {
    // Your custom enhancement logic
    const result = new ImageData(imageData.width, imageData.height);
    // ... processing ...
    return result;
  }
}
```

---

## Creating Custom Components

### Example: Custom Enhancement Panel

Create a custom enhancement tool panel:

```typescript
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-custom-enhancement',
  standalone: true,
  imports: [CommonModule, MatSliderModule],
  template: `
    <div class="custom-enhancement-panel">
      <h3>Custom Enhancement</h3>
      <mat-slider
        [min]="0"
        [max]="100"
        [value]="value"
        (valueChange)="onValueChange($event)">
      </mat-slider>
    </div>
  `
})
export class CustomEnhancementComponent {
  @Output() transformChange = new EventEmitter<any>();
  value = 0;
  
  onValueChange(value: number): void {
    this.value = value;
    this.transformChange.emit({
      customEnhancement: value
    });
  }
}
```

**Integrate into main component:**

```typescript
import { CustomEnhancementComponent } from './components/custom-enhancement/custom-enhancement.component';

@Component({
  // ...
  imports: [
    // ...
    CustomEnhancementComponent
  ],
  template: `
    <!-- ... -->
    <app-custom-enhancement
      (transformChange)="onCustomEnhancement($event)">
    </app-custom-enhancement>
    <!-- ... -->
  `
})
export class OcrAppRootComponent {
  onCustomEnhancement(transform: any): void {
    // Apply custom enhancement
    if (transform.customEnhancement !== undefined) {
      // Your processing logic
    }
  }
}
```

---

## Web Workers

### Creating Custom Web Workers

For CPU-intensive operations, create Web Workers:

**Worker file:** `src/app/workers/custom-processor.worker.ts`

```typescript
self.onmessage = function(e: MessageEvent) {
  const { imageData, params } = e.data;
  
  // Process imageData
  const result = processImageData(imageData, params);
  
  // Send result back
  self.postMessage({ result });
};

function processImageData(imageData: ImageData, params: any): ImageData {
  // Your processing logic
  const result = new ImageData(imageData.width, imageData.height);
  // ... processing ...
  return result;
}
```

**Use in service:**

```typescript
import { WorkerManagerService } from './worker-manager.service';

async processAsync(imageData: ImageData, params: any): Promise<ImageData> {
  const worker = this.workerManager.getCustomWorker();
  
  return new Promise((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      resolve(e.data.result);
    };
    
    worker.onerror = reject;
    
    worker.postMessage({ imageData, params });
  });
}
```

---

## State Management

### Extending State Store

Add custom state properties:

```typescript
// In state-store.service.ts
interface CustomImageState extends ImageState {
  customProperty?: string;
  customData?: any;
}

// Update state
this.stateStore.updateState({
  customProperty: 'value',
  customData: { /* ... */ }
});

// Access state
const state = this.stateStore.getState();
const customValue = state().customProperty;
```

---

## Audit Logging

### Creating Custom Audit Log Plugins

Create plugins to extend audit logging:

```typescript
import { AuditLogPlugin, AuditLogEntry } from '../models/audit-log.interface';

export class CustomAuditPlugin implements AuditLogPlugin {
  name = 'Custom Plugin';
  
  onLogEntry(entry: AuditLogEntry): void {
    // Send to external service
    fetch('https://api.example.com/logs', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
    
    // Or store in custom storage
    localStorage.setItem(`audit-${entry.id}`, JSON.stringify(entry));
  }
}
```

**Register plugin:**

```typescript
import { AuditLogService } from './services/audit-log.service';
import { CustomAuditPlugin } from './plugins/custom-audit.plugin';

constructor(private auditLog: AuditLogService) {
  this.auditLog.registerPlugin(new CustomAuditPlugin());
}
```

---

## API Integration

### Integrating External APIs

Example: Custom OCR API integration

```typescript
export class CustomApiOcrAdapter implements OcrEngineAdapter {
  name = 'Custom API';
  private apiKey: string;
  private endpoint: string;
  
  constructor(config: { apiKey: string; endpoint: string }) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
  }
  
  async recognize(image: Blob, options?: OcrOptions): Promise<OcrResult> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('language', options?.language || 'eng');
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      text: data.text,
      boundingBoxes: data.boxes.map((box: any) => ({
        id: box.id,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        text: box.text,
        confidence: box.confidence
      })),
      confidence: data.confidence,
      engine: this.name,
      processingTime: data.processingTime
    };
  }
}
```

---

## Testing

### Unit Testing Adapters

```typescript
import { TestBed } from '@angular/core/testing';
import { MyCustomSrAdapter } from './my-custom-sr.adapter';

describe('MyCustomSrAdapter', () => {
  let adapter: MyCustomSrAdapter;
  
  beforeEach(() => {
    adapter = new MyCustomSrAdapter();
  });
  
  it('should upscale image', async () => {
    const imageData = new ImageData(100, 100);
    const result = await adapter.upscale(imageData, 2);
    
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });
});
```

### Integration Testing

```typescript
import { SuperResolutionService } from './services/super-resolution.service';
import { MyCustomSrAdapter } from './adapters/my-custom-sr.adapter';

describe('SuperResolutionService', () => {
  let service: SuperResolutionService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuperResolutionService);
    service.registerAdapter(new MyCustomSrAdapter());
  });
  
  it('should use custom adapter', async () => {
    await service.setAdapter('My Custom SR');
    const adapter = service.getCurrentAdapter();
    expect(adapter?.name).toBe('My Custom SR');
  });
});
```

---

## Best Practices

### Adapter Design

1. **Error Handling:** Always handle errors gracefully
2. **Async Operations:** Use async/await for all async operations
3. **Resource Cleanup:** Clean up resources in destroy/cleanup methods
4. **Type Safety:** Use TypeScript interfaces strictly
5. **Documentation:** Document all public methods

### Performance

1. **Web Workers:** Use workers for CPU-intensive operations
2. **Debouncing:** Debounce real-time operations
3. **Caching:** Cache expensive computations
4. **Lazy Loading:** Load adapters on demand

### Code Organization

```
src/app/
├── adapters/
│   ├── my-custom-sr.adapter.ts
│   └── my-signature.adapter.ts
├── services/
│   └── my-custom.service.ts
├── components/
│   └── my-custom-component/
│       └── my-custom-component.ts
└── workers/
    └── my-custom.worker.ts
```

---

## Examples

### Complete Example: Custom Super Resolution Adapter

See `src/app/adapters/esrgan-sr.adapter.ts` for a complete example with:
- TensorFlow.js integration structure
- API endpoint fallback
- Bicubic interpolation fallback
- Error handling

### Complete Example: Custom Signature Detection

See `src/app/adapters/signature-detection-ml.adapter.ts` for a complete example with:
- Heuristic detection algorithm
- API endpoint integration
- Pattern matching
- Overlap merging

---

## Troubleshooting

### Adapter Not Loading

- Check that adapter implements the correct interface
- Verify adapter is registered before use
- Check browser console for errors

### Performance Issues

- Use Web Workers for heavy processing
- Implement debouncing for real-time features
- Cache expensive operations

### Type Errors

- Ensure all interfaces are properly imported
- Check TypeScript configuration
- Verify model types match interfaces

---

## Resources

- **API Documentation:** See `docs/API.md`
- **User Guide:** See `docs/USER_GUIDE.md`
- **Angular Documentation:** https://angular.dev
- **TypeScript Documentation:** https://www.typescriptlang.org/docs/

---

## Contributing

When contributing adapters or features:

1. Follow the existing code style
2. Write unit tests
3. Update documentation
4. Add examples if applicable
5. Ensure backward compatibility

