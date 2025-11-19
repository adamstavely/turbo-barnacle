# OCR App

A powerful, browser-based Optical Character Recognition (OCR) application built with Angular. This application provides advanced image preprocessing capabilities, multiple OCR engine support, and an intuitive interface for extracting and editing text from images and PDFs.

## Features

### 🖼️ Image Processing & Enhancement
- **Brightness, Contrast, Saturation, Gamma** adjustments
- **Sharpening & Denoising** (Gaussian and Bilateral)
- **Edge Enhancement** for better text clarity
- **Binarization** methods (Otsu, Niblack, Sauvola)
- **CLAHE** (Contrast Limited Adaptive Histogram Equalization)
- **Shadow & Glare Removal**
- **Background Whitening**
- **Auto Lighting Correction**
- **Super Resolution** upscaling

### 🔄 Geometric Transformations
- **Rotation** with manual or automatic deskew detection
- **Scaling** (X and Y axis)
- **Perspective Correction** (trapezoidal correction)
- **Lens Distortion** correction (barrel/pincushion)
- **Polygon Warp** for local deformations
- **Mesh Warp** for advanced image warping
- **Curvature Flattening** for curved documents
- **Text Line Straightening** based on detected text

### 🔍 OCR Capabilities
- **Multiple OCR Engines** support:
  - Tesseract.js (client-side)
  - REST API adapters (configurable)
  - Mock adapter for testing
- **Multi-Engine Comparison** to compare results across different engines
- **Bounding Box Visualization** with interactive editing
- **Confidence Scores** for each detected text region

### 📦 Bounding Box Management
- **Create, Edit, Delete** bounding boxes
- **Merge & Split** operations
- **Visual Selection** with hover highlighting
- **Drag & Resize** functionality
- **Table Detection** and highlighting

### 🤖 Smart Features
- **Auto-Clean** recommendations based on image analysis
- **Undo/Redo** support for all operations
- **Multi-page PDF** support
- **Export** functionality for results

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + Enter` - Run OCR
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` - Redo
- `Ctrl/Cmd + N` - Clear/New
- `Delete/Backspace` - Delete selected bounding box
- `Escape` - Deselect bounding box

## Technology Stack

- **Framework**: Angular 20.3
- **UI Components**: Angular Material
- **OCR Engine**: Tesseract.js 6.0.1
- **PDF Support**: pdfjs-dist 5.4.394
- **Image Processing**: Custom Web Workers for performance
- **Language**: TypeScript 5.9

## Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd turbo-barnacle
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or
ng serve
```

4. Open your browser and navigate to `http://localhost:4200/`

## Usage

### Basic Workflow

1. **Load an Image**: Click the image loader area to upload an image or PDF file
2. **Preprocess** (optional): Use the enhancement tools in the left panel to improve image quality
3. **Apply Geometric Transforms** (optional): Correct perspective, rotation, or apply warping
4. **Run OCR**: Click the "Run OCR" button or press `Ctrl/Cmd + Enter`
5. **Review Results**: View detected text in the right panel with bounding boxes overlaid on the image
6. **Edit Bounding Boxes**: Select, move, resize, merge, or split bounding boxes as needed
7. **Export**: Export your results when ready

### Image Enhancement Tips

- Use **Auto-Clean** for automatic enhancement recommendations
- Apply **Binarization** for scanned documents with poor contrast
- Use **Deskew** to correct rotated documents
- **Perspective Correction** works well for photos of documents
- **Shadow Removal** and **Background Whitening** improve OCR accuracy on photographed documents

### OCR Engine Configuration

The application supports multiple OCR engines through an adapter pattern:

- **Tesseract.js**: Runs entirely in the browser (default)
- **REST API**: Configure custom REST endpoints for cloud OCR services

To add a REST API adapter programmatically:
```typescript
await ocrEngineService.registerRestAdapter({
  name: 'My OCR Service',
  endpoint: 'https://api.example.com/ocr',
  apiKey: 'your-api-key',
  headers: { 'Custom-Header': 'value' }
});
```

## Project Structure

```
src/
├── app/
│   ├── adapters/          # OCR engine adapters
│   │   ├── ocr-engine-adapter.interface.ts
│   │   ├── ocr.adapter.tesseract.ts
│   │   ├── ocr.adapter.rest.ts
│   │   └── ocr.adapter.mock.ts
│   ├── components/        # UI components
│   │   ├── ocr-app-root/  # Main application component
│   │   ├── image-loader/
│   │   ├── canvas-container/
│   │   ├── enhancement-tools-panel/
│   │   ├── warp-tools-panel/
│   │   ├── bounding-box-editor/
│   │   ├── results-panel/
│   │   └── ...
│   ├── services/          # Business logic services
│   │   ├── ocr-engine.service.ts
│   │   ├── image-processing.service.ts
│   │   ├── geometric-transform.service.ts
│   │   ├── state-store.service.ts
│   │   └── ...
│   ├── models/            # TypeScript interfaces
│   ├── workers/           # Web Workers for heavy processing
│   └── utils/             # Utility functions
```

## Development

### Build

Build the project for production:
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Watch Mode

Build and watch for changes:
```bash
npm run watch
```

### Running Tests

Run unit tests:
```bash
npm test
```

### Code Generation

Generate new components, services, etc.:
```bash
ng generate component component-name
ng generate service service-name
```

For a complete list of available schematics:
```bash
ng generate --help
```

## Architecture Highlights

### State Management
- Uses Angular signals for reactive state management
- Centralized state store service
- Undo/redo functionality with state snapshots

### Performance Optimization
- Web Workers for CPU-intensive operations (image filtering, deskew, warping)
- Efficient canvas rendering
- Lazy loading of OCR engines

### Extensibility
- Adapter pattern for OCR engines
- Modular component architecture
- Service-based design for easy testing and extension

## Browser Support

This application uses modern web APIs and requires:
- Canvas API
- Web Workers
- File API
- Blob API

Recommended browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

[Add your license information here]

## Contributing

[Add contribution guidelines if applicable]

## Acknowledgments

- [Tesseract.js](https://github.com/naptha/tesseract.js) for client-side OCR
- [pdf.js](https://mozilla.github.io/pdf.js/) for PDF rendering
- Angular team for the excellent framework
