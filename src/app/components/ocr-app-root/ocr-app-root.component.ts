import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { ImageLoaderComponent } from '../image-loader/image-loader.component';
import { CanvasContainerComponent } from '../canvas-container/canvas-container.component';
import { CanvasOverlayBoundingBoxesComponent } from '../canvas-overlay-bounding-boxes/canvas-overlay-bounding-boxes.component';
import { EnhancementToolsPanelComponent } from '../enhancement-tools-panel/enhancement-tools-panel.component';
import { WarpToolsPanelComponent } from '../warp-tools-panel/warp-tools-panel.component';
import { BoundingBoxEditorComponent } from '../bounding-box-editor/bounding-box-editor.component';
import { ResultsPanelComponent } from '../results-panel/results-panel.component';
import { TableDetectionComponent } from '../table-detection/table-detection.component';
import { AutoCleanComponent } from '../auto-clean/auto-clean.component';
import { AutoCleanService, AutoCleanRecommendations } from '../../services/auto-clean.service';
import { OcrOptionsPanelComponent } from '../ocr-options-panel/ocr-options-panel.component';
import { OcrOptions } from '../../models/ocr-options.interface';
import { RestApiConfigComponent } from '../rest-api-config/rest-api-config.component';
import { StatePersistenceService } from '../../services/state-persistence.service';
import { TrapezoidalCorrectionComponent } from '../trapezoidal-correction/trapezoidal-correction.component';
import { PolygonWarpComponent } from '../polygon-warp/polygon-warp.component';
import { MultiEngineComparisonComponent } from '../multi-engine-comparison/multi-engine-comparison.component';
import { MeshWarpEditorComponent } from '../mesh-warp-editor/mesh-warp-editor.component';
import { MatDialog } from '@angular/material/dialog';
import { PolygonWarpService } from '../../services/polygon-warp.service';
import { WarpMeshService } from '../../services/warp-mesh.service';
import { TextLineStraighteningService } from '../../services/text-line-straightening.service';
import { StateStoreService } from '../../services/state-store.service';
import { PerspectivePoints } from '../../services/geometric-transform.service';
import { UndoRedoService } from '../../services/undo-redo.service';
import { OcrEngineService } from '../../services/ocr-engine.service';
import { ImageProcessingService } from '../../services/image-processing.service';
import { GeometricTransformService } from '../../services/geometric-transform.service';
import { PdfRasterizerService } from '../../services/pdf-rasterizer.service';
import { imageDataToBlob } from '../../utils/image-helpers';
import { BoundingBox } from '../../models/bounding-box.interface';
import { OcrResult } from '../../models/ocr-result.interface';

@Component({
  selector: 'app-ocr-app-root',
  standalone: true,
  imports: [
    CommonModule,
    ToolbarComponent,
    ImageLoaderComponent,
    CanvasContainerComponent,
    CanvasOverlayBoundingBoxesComponent,
    EnhancementToolsPanelComponent,
    WarpToolsPanelComponent,
    BoundingBoxEditorComponent,
    ResultsPanelComponent,
    TableDetectionComponent,
    AutoCleanComponent,
    OcrOptionsPanelComponent
  ],
  template: `
    <div class="app-container">
      <app-toolbar
        [canRunOcr]="hasImage()"
        [isProcessing]="isProcessing()"
        [canUndo]="canUndo()"
        [canRedo]="canRedo()"
        [canClear]="hasImage()"
        (runOcr)="onRunOcr()"
        (undo)="onUndo()"
        (redo)="onRedo()"
        (clear)="onClear()"
        (compareEngines)="onCompareEngines()"
        (configureRestApi)="onConfigureRestApi()"
        (saveState)="onSaveState()"
        (loadState)="onLoadState()">
      </app-toolbar>

      <div class="main-content">
        @if (!hasImage()) {
          <div class="loader-container">
            <app-image-loader (imageLoaded)="onImageLoaded($event)"></app-image-loader>
          </div>
        } @else {
          <div class="three-panel-layout">
            <div class="left-panel">
              <app-ocr-options-panel (optionsChange)="onOcrOptionsChange($event)"></app-ocr-options-panel>
              <app-enhancement-tools-panel (transformChange)="onEnhancementChange($event)"></app-enhancement-tools-panel>
              <app-warp-tools-panel (transformChange)="onWarpChange($event)"></app-warp-tools-panel>
              <app-bounding-box-editor
                [boundingBoxes]="state().boundingBoxes"
                [selectedBoxId]="state().selectedBoxId"
                (boxSelected)="onBoxSelected($event)"
                (boxUpdated)="onBoxUpdated($event)"
                (boxDeleted)="onBoxDeleted($event)"
                (boxesMerged)="onBoxesMerged($event)"
                (boxSplit)="onBoxSplit($event)">
              </app-bounding-box-editor>
              <app-table-detection
                [boundingBoxes]="state().boundingBoxes"
                (tableHighlighted)="onTableHighlighted($event)">
              </app-table-detection>
              <app-auto-clean
                [imageData]="processedImageData()"
                (recommendationsApplied)="onAutoCleanApplied($event)">
              </app-auto-clean>
            </div>

            <div class="center-panel">
              <div class="canvas-wrapper" style="position: relative;">
                <app-canvas-container
                  [imageData]="processedImageData()"
                  [imageUrl]="state().imageUrl">
                </app-canvas-container>
                @if (hasImage()) {
                  <app-canvas-overlay-bounding-boxes
                    [boundingBoxes]="state().boundingBoxes"
                    [selectedBoxId]="state().selectedBoxId"
                    [canvasWidth]="state().width"
                    [canvasHeight]="state().height"
                    [displayWidth]="800"
                    [displayHeight]="600"
                    [scaleX]="1"
                    [scaleY]="1"
                    (boxSelected)="onBoxSelected($event)"
                    (boxMoved)="onBoxMoved($event)"
                    (boxResized)="onBoxResized($event)"
                    (boxDeleted)="onBoxDeleted($event)"
                    (boxCreated)="onBoxCreated($event)">
                  </app-canvas-overlay-bounding-boxes>
                }
              </div>
            </div>

            <div class="right-panel">
              <app-results-panel
                [ocrResults]="state().ocrResults"
                [hoveredBoxId]="hoveredBoxId()"
                [imageData]="processedImageData()"
                [boundingBoxes]="state().boundingBoxes"
                (boxHover)="onBoxHover($event)">
              </app-results-panel>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .main-content {
      flex: 1;
      overflow: hidden;
    }

    .loader-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      padding: 40px;
    }

    .three-panel-layout {
      display: flex;
      height: 100%;
      overflow: hidden;
    }

    .left-panel {
      width: 350px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      background: #fafafa;
    }

    .center-panel {
      flex: 1;
      overflow: auto;
      background: #f5f5f5;
    }

    .right-panel {
      width: 350px;
      border-left: 1px solid #e0e0e0;
      overflow-y: auto;
      background: #fafafa;
    }

    .canvas-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
      padding: 20px;
    }
  `]
})
export class OcrAppRootComponent implements OnInit {
  isProcessing = signal(false);
  hoveredBoxId = signal<string | null>(null);
  processedImageData = signal<ImageData | null>(null);
  currentOcrOptions = signal<OcrOptions | undefined>(undefined);

  state = computed(() => this.stateStore.getState()());
  
  hasImage = computed(() => {
    const s = this.state();
    return !!s.imageUrl && !!s.currentImageData;
  });

  canUndo = computed(() => this.undoRedo.canUndo());
  canRedo = computed(() => this.undoRedo.canRedo());

  constructor(
    private stateStore: StateStoreService,
    private undoRedo: UndoRedoService,
    private ocrEngine: OcrEngineService,
    private imageProcessing: ImageProcessingService,
    private geometricTransform: GeometricTransformService,
    private polygonWarp: PolygonWarpService,
    private warpMesh: WarpMeshService,
    private textLineStraightening: TextLineStraighteningService,
    private autoClean: AutoCleanService,
    private statePersistence: StatePersistenceService,
    private pdfRasterizer: PdfRasterizerService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Initialize default OCR engine
    const adapters = this.ocrEngine.getAvailableAdapters();
    if (adapters.length > 0) {
      this.ocrEngine.setAdapter(adapters[0].name);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl/Cmd + Z: Undo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (this.canUndo()) {
        this.onUndo();
      }
      return;
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
    if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key === 'z' || event.key === 'y')) {
      event.preventDefault();
      if (this.canRedo()) {
        this.onRedo();
      }
      return;
    }

    // Delete/Backspace: Delete selected bounding box
    const selectedBoxId = this.state().selectedBoxId;
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedBoxId) {
      event.preventDefault();
      this.onBoxDeleted(selectedBoxId);
      return;
    }

    // Escape: Deselect bounding box
    if (event.key === 'Escape' && this.state().selectedBoxId) {
      event.preventDefault();
      this.stateStore.setSelectedBox(null);
      return;
    }

    // Ctrl/Cmd + Enter: Run OCR
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.hasImage() && !this.isProcessing()) {
        this.onRunOcr();
      }
      return;
    }

    // Ctrl/Cmd + N: Clear/New
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      if (this.hasImage()) {
        this.onClear();
      }
      return;
    }
  }

  onImageLoaded(event: {
    imageData: ImageData;
    imageUrl: string;
    fileName: string;
    fileType: string;
    width: number;
    height: number;
    batchPages?: number[];
    batchFile?: File;
  }): void {
    // Handle batch processing
    if (event.batchPages && event.batchFile) {
      this.processBatchPdf(event.batchFile, event.batchPages);
      return;
    }

    this.stateStore.setImage(
      event.imageUrl,
      event.fileName,
      event.fileType,
      event.width,
      event.height,
      event.imageData
    );
    this.processedImageData.set(event.imageData);
    this.undoRedo.saveState(this.stateStore.getState()());
  }

  async processBatchPdf(file: File, pageNumbers: number[]): Promise<void> {
    // Process multiple PDF pages
    this.isProcessing.set(true);
    const results: OcrResult[] = [];

    try {
      for (const pageNum of pageNumbers) {
        const { imageData, width, height } = await this.pdfRasterizer.rasterizePdf(file, pageNum, 2.0);
        const blob = await imageDataToBlob(imageData);
        const options = this.currentOcrOptions();
        const result = await this.ocrEngine.performOCR(blob, options);
        
        // Add page number to result metadata
        result.metadata = {
          ...result.metadata,
          pageNumber: pageNum,
          fileName: `${file.name} (Page ${pageNum})`
        };
        
        results.push(result);
      }

      // Combine results
      const combinedText = results.map(r => r.text).join('\n\n--- Page Break ---\n\n');
      const combinedBoxes = results.flatMap((r, idx) => 
        r.boundingBoxes.map(box => ({ ...box, id: `${box.id}-page${idx + 1}` }))
      );
      
      const combinedResult: OcrResult = {
        text: combinedText,
        boundingBoxes: combinedBoxes,
        confidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length,
        engine: results[0]?.engine || 'Unknown',
        processingTime: results.reduce((sum, r) => sum + (r.processingTime || 0), 0),
        metadata: {
          batchProcessed: true,
          pageCount: pageNumbers.length,
          pages: pageNumbers
        }
      };

      // Load first page as the displayed image
      const { imageData, width, height } = await this.pdfRasterizer.rasterizePdf(file, pageNumbers[0], 2.0);
      this.stateStore.setImage(
        URL.createObjectURL(file),
        `${file.name} (Batch: ${pageNumbers.length} pages)`,
        file.type,
        width,
        height,
        imageData
      );
      this.processedImageData.set(imageData);
      
      // Add combined OCR result
      this.stateStore.addOcrResult(combinedResult);
      this.undoRedo.saveState(this.stateStore.getState()());
    } catch (error) {
      console.error('Batch processing failed:', error);
      alert('Failed to process batch PDF. Please try again.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onEnhancementChange(transform: any): void {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    let processed = currentState.currentImageData;

    if (transform.reset) {
      processed = currentState.originalImageData || processed;
    } else {
      if (transform.brightness !== undefined) {
        processed = this.imageProcessing.applyBrightness(processed, transform.brightness);
      }
      if (transform.contrast !== undefined) {
        processed = this.imageProcessing.applyContrast(processed, transform.contrast);
      }
      if (transform.saturation !== undefined) {
        processed = this.imageProcessing.applySaturation(processed, transform.saturation);
      }
      if (transform.gamma !== undefined) {
        processed = this.imageProcessing.applyGamma(processed, transform.gamma);
      }
      if (transform.sharpen !== undefined && transform.sharpen > 0) {
        processed = this.imageProcessing.applySharpen(processed, transform.sharpen);
      }
      if (transform.denoise !== undefined && transform.denoise > 0) {
        processed = this.imageProcessing.applyDenoiseGaussian(processed, transform.denoise);
      }
      if (transform.bilateralDenoise !== undefined && transform.bilateralDenoise > 0) {
        processed = this.imageProcessing.applyDenoiseBilateral(processed, transform.bilateralDenoise, 50);
      }
      if (transform.binarization) {
        if (transform.binarizationMethod === 'niblack') {
          processed = this.imageProcessing.applyBinarizationNiblack(processed);
        } else if (transform.binarizationMethod === 'sauvola') {
          processed = this.imageProcessing.applyBinarizationSauvola(processed);
        } else {
          processed = this.imageProcessing.applyBinarizationOtsu(processed);
        }
      }
      if (transform.edgeEnhancement !== undefined && transform.edgeEnhancement > 0) {
        processed = this.imageProcessing.applyEdgeEnhancement(processed, transform.edgeEnhancement);
      }
      if (transform.clahe) {
        processed = this.imageProcessing.applyCLAHE(processed);
      }
      if (transform.removeShadows) {
        processed = this.imageProcessing.removeShadows(processed);
      }
      if (transform.removeGlare) {
        processed = this.imageProcessing.removeGlare(processed);
      }
          if (transform.whitenBackground) {
            processed = this.imageProcessing.whitenBackground(processed);
          }
          if (transform.autoLighting) {
            processed = this.imageProcessing.autoLightingCorrection(processed);
          }
          if (transform.superResolution !== undefined && transform.superResolution > 1) {
            processed = this.imageProcessing.applySuperResolution(processed, transform.superResolution);
            // Update dimensions after super-resolution
            this.stateStore.updateState({
              width: processed.width,
              height: processed.height
            });
          }
        }

    this.processedImageData.set(processed);
    this.stateStore.updateImageData(processed);
  }

  onWarpChange(transform: any): void {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

      if (transform.openTrapezoidal) {
        this.openTrapezoidalDialog();
        return;
      }

      if (transform.openPolygonWarp) {
        this.openPolygonWarpDialog();
        return;
      }

      if (transform.openMeshWarp) {
        this.openMeshWarpDialog();
        return;
      }

    let processed = currentState.currentImageData;

      if (transform.curvatureFlattening !== undefined) {
        processed = this.warpMesh.applyCurvatureFlattening(processed, transform.curvatureFlattening);
      }

      if (transform.straightenTextLines) {
        // Use bounding boxes from OCR results if available
        const boundingBoxes = currentState.boundingBoxes;
        if (boundingBoxes.length > 0) {
          processed = this.textLineStraightening.straightenAllTextLines(processed, boundingBoxes);
        } else {
          alert('No text detected. Please run OCR first to detect text lines.');
          return;
        }
      }

    if (transform.reset) {
      processed = currentState.originalImageData || processed;
    } else {
      if (transform.rotation !== undefined) {
        processed = this.geometricTransform.rotate(processed, transform.rotation);
      }
      if (transform.scaleX !== undefined && transform.scaleY !== undefined) {
        processed = this.geometricTransform.scale(processed, transform.scaleX, transform.scaleY);
      }
      if (transform.barrel !== undefined || transform.pincushion !== undefined) {
        processed = this.geometricTransform.applyLensDistortion(
          processed,
          transform.barrel || 0,
          transform.pincushion || 0
        );
      }
      if (transform.autoDeskew) {
        // Use async deskew detection with worker
        this.geometricTransform.autoDeskewAsync(processed).then(angle => {
          const corrected = this.geometricTransform.rotate(processed, -angle);
          this.processedImageData.set(corrected);
          this.stateStore.updateImageData(corrected);
        }).catch(() => {
          // Fallback to synchronous
          const angle = this.geometricTransform.autoDeskew(processed);
          const corrected = this.geometricTransform.rotate(processed, -angle);
          this.processedImageData.set(corrected);
          this.stateStore.updateImageData(corrected);
        });
        return; // Don't update synchronously for async operation
      }
      if (transform.perspective) {
        processed = this.geometricTransform.applyPerspectiveCorrection(processed, transform.perspective);
      }
    }

    this.processedImageData.set(processed);
    this.stateStore.updateImageData(processed);
  }

  openTrapezoidalDialog(): void {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    const dialogRef = this.dialog.open(TrapezoidalCorrectionComponent, {
      width: '90%',
      maxWidth: '1200px',
      height: '90%',
      maxHeight: '800px',
      data: {
        imageData: currentState.currentImageData,
        imageUrl: currentState.imageUrl,
        canvasWidth: Math.min(currentState.width, 800),
        canvasHeight: Math.min(currentState.height, 600)
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && currentState.currentImageData) {
        const points = result as PerspectivePoints;
        const processed = this.geometricTransform.applyPerspectiveCorrection(
          currentState.currentImageData,
          points
        );
        this.processedImageData.set(processed);
        this.stateStore.updateImageData(processed);
      }
    });
  }

  onCompareEngines(): void {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    const dialogRef = this.dialog.open(MultiEngineComparisonComponent, {
      width: '90%',
      maxWidth: '1400px',
      height: '90%',
      maxHeight: '900px',
      data: {
        imageData: currentState.currentImageData
      }
    });

    dialogRef.afterClosed().subscribe((result: OcrResult | null) => {
      if (result) {
        this.stateStore.addOcrResult(result);
      }
    });
  }

  onConfigureRestApi(): void {
    const dialogRef = this.dialog.open(RestApiConfigComponent, {
      width: '600px',
      maxWidth: '90%',
      data: null
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.success) {
        // Refresh engine selector to show new adapter
        // The engine selector will automatically update via its effect
      }
    });
  }

  async onSaveState(): Promise<void> {
    const currentState = this.state();
    try {
      await this.statePersistence.saveStateToFile(currentState);
    } catch (error) {
      console.error('Failed to save state:', error);
      alert('Failed to save state. Please try again.');
    }
  }

  async onLoadState(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const loadedState = await this.statePersistence.loadStateFromFile(file);
        this.stateStore.setState(loadedState);
        this.processedImageData.set(loadedState.currentImageData);
        // Clear undo/redo history when loading new state
        this.undoRedo.clear();
        this.undoRedo.saveState(loadedState);
      } catch (error) {
        console.error('Failed to load state:', error);
        alert('Failed to load state. Please ensure the file is a valid OCR state file.');
      }
    };
    input.click();
  }

  openMeshWarpDialog(): void {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    const dialogRef = this.dialog.open(MeshWarpEditorComponent, {
      width: '90%',
      maxWidth: '1200px',
      height: '90%',
      maxHeight: '800px',
      data: {
        imageData: currentState.currentImageData,
        imageUrl: currentState.imageUrl,
        canvasWidth: Math.min(currentState.width, 800),
        canvasHeight: Math.min(currentState.height, 600)
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.mesh && currentState.currentImageData) {
        try {
          const processed = this.warpMesh.applyMeshWarp(
            currentState.currentImageData,
            result.mesh
          );
          this.processedImageData.set(processed);
          this.stateStore.updateImageData(processed);
        } catch (error) {
          console.error('Mesh warp failed:', error);
          alert('Failed to apply mesh warp. Please try again.');
        }
      }
    });
  }

  openPolygonWarpDialog(): void {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    const dialogRef = this.dialog.open(PolygonWarpComponent, {
      width: '90%',
      maxWidth: '1200px',
      height: '90%',
      maxHeight: '800px',
      data: {
        imageData: currentState.currentImageData,
        imageUrl: currentState.imageUrl,
        canvasWidth: Math.min(currentState.width, 800),
        canvasHeight: Math.min(currentState.height, 600)
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && currentState.currentImageData) {
        const warp = result as { sourcePoints: any[]; targetPoints: any[] };
        try {
          const processed = this.polygonWarp.applyLocalWarp(
            currentState.currentImageData,
            warp.sourcePoints,
            warp.targetPoints
          );
          this.processedImageData.set(processed);
          this.stateStore.updateImageData(processed);
        } catch (error) {
          console.error('Polygon warp failed:', error);
          alert('Failed to apply polygon warp. Please try again.');
        }
      }
    });
  }

  onOcrOptionsChange(options: OcrOptions): void {
    this.currentOcrOptions.set(options);
  }

  async onRunOcr(): Promise<void> {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    this.isProcessing.set(true);

    try {
      const blob = await imageDataToBlob(currentState.currentImageData);
      const options = this.currentOcrOptions();
      const result = await this.ocrEngine.performOCR(blob, options);
      
      this.stateStore.addOcrResult(result);
    } catch (error) {
      console.error('OCR failed:', error);
      alert('OCR processing failed. Please try again.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onBoxSelected(boxId: string): void {
    this.stateStore.setSelectedBox(boxId);
  }

  onBoxMoved(event: { id: string; x: number; y: number }): void {
    this.stateStore.updateBoundingBox(event.id, { x: event.x, y: event.y });
  }

  onBoxResized(event: { id: string; x: number; y: number; width: number; height: number }): void {
    this.stateStore.updateBoundingBox(event.id, {
      x: event.x,
      y: event.y,
      width: event.width,
      height: event.height
    });
  }

  onBoxUpdated(box: BoundingBox): void {
    this.stateStore.updateBoundingBox(box.id, box);
  }

  onBoxDeleted(boxId: string): void {
    this.stateStore.removeBoundingBox(boxId);
  }

  onBoxCreated(event: { x: number; y: number; width: number; height: number }): void {
    const newBox: BoundingBox = {
      id: `box-${Date.now()}`,
      x: event.x,
      y: event.y,
      width: event.width,
      height: event.height,
      text: '',
      confidence: 0
    };
    this.stateStore.addBoundingBox(newBox);
    this.stateStore.setSelectedBox(newBox.id);
  }

  onBoxesMerged(boxIds: string[]): void {
    this.stateStore.mergeBoundingBoxes(boxIds);
  }

  onBoxSplit(event: { boxId: string; direction: 'horizontal' | 'vertical' }): void {
    this.stateStore.splitBoundingBox(event.boxId, event.direction);
  }

  onBoxHover(boxId: string | null): void {
    this.hoveredBoxId.set(boxId);
  }

  onTableHighlighted(table: any): void {
    // Highlight table bounding box
    if (table.boundingBox) {
      this.stateStore.setSelectedBox(table.boundingBox.id);
    }
  }

  onAutoCleanApplied(recommendations: AutoCleanRecommendations): void {
    // Apply all recommended enhancements
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    let processed = currentState.currentImageData;

    // Apply recommendations in optimal order
    if (recommendations.removeShadows) {
      processed = this.imageProcessing.removeShadows(processed);
    }
    if (recommendations.removeGlare) {
      processed = this.imageProcessing.removeGlare(processed);
    }
    if (recommendations.whitenBackground) {
      processed = this.imageProcessing.whitenBackground(processed);
    }
    if (recommendations.brightness !== undefined) {
      processed = this.imageProcessing.applyBrightness(processed, recommendations.brightness);
    }
    if (recommendations.contrast !== undefined) {
      processed = this.imageProcessing.applyContrast(processed, recommendations.contrast);
    }
    if (recommendations.denoise !== undefined && recommendations.denoise > 0) {
      processed = this.imageProcessing.applyDenoiseGaussian(processed, recommendations.denoise);
    }
    if (recommendations.sharpen !== undefined && recommendations.sharpen > 0) {
      processed = this.imageProcessing.applySharpen(processed, recommendations.sharpen);
    }
    if (recommendations.binarization) {
      if (recommendations.binarizationMethod === 'niblack') {
        processed = this.imageProcessing.applyBinarizationNiblack(processed);
      } else if (recommendations.binarizationMethod === 'sauvola') {
        processed = this.imageProcessing.applyBinarizationSauvola(processed);
      } else {
        processed = this.imageProcessing.applyBinarizationOtsu(processed);
      }
    }
    if (recommendations.clahe) {
      processed = this.imageProcessing.applyCLAHE(processed);
    }
    if (recommendations.autoDeskew) {
      this.geometricTransform.autoDeskewAsync(processed).then(angle => {
        const corrected = this.geometricTransform.rotate(processed, -angle);
        this.processedImageData.set(corrected);
        this.stateStore.updateImageData(corrected);
      }).catch(() => {
        const angle = this.geometricTransform.autoDeskew(processed);
        const corrected = this.geometricTransform.rotate(processed, -angle);
        this.processedImageData.set(corrected);
        this.stateStore.updateImageData(corrected);
      });
      return; // Don't update synchronously for async operation
    }

    this.processedImageData.set(processed);
    this.stateStore.updateImageData(processed);
  }

  onUndo(): void {
    const previousState = this.undoRedo.undo(this.stateStore.getState()());
    if (previousState) {
      this.stateStore.updateState(previousState);
      this.processedImageData.set(previousState.currentImageData);
    }
  }

  onRedo(): void {
    const nextState = this.undoRedo.redo(this.stateStore.getState()());
    if (nextState) {
      this.stateStore.updateState(nextState);
      this.processedImageData.set(nextState.currentImageData);
    }
  }

  onClear(): void {
    if (confirm('Clear all data and start over?')) {
      this.stateStore.clearState();
      this.processedImageData.set(null);
      this.undoRedo.clear();
    }
  }
}

