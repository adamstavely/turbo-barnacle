import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { ImageLoaderComponent } from '../image-loader/image-loader.component';
import { CanvasContainerComponent } from '../canvas-container/canvas-container.component';
import { CanvasOverlayBoundingBoxesComponent } from '../canvas-overlay-bounding-boxes/canvas-overlay-bounding-boxes.component';
import { EnhancementToolsPanelComponent } from '../enhancement-tools-panel/enhancement-tools-panel.component';
import { WarpToolsPanelComponent } from '../warp-tools-panel/warp-tools-panel.component';
import { BoundingBoxEditorComponent } from '../bounding-box-editor/bounding-box-editor.component';
import { ResultsPanelComponent } from '../results-panel/results-panel.component';
import { TrapezoidalCorrectionComponent } from '../trapezoidal-correction/trapezoidal-correction.component';
import { MatDialog } from '@angular/material/dialog';
import { StateStoreService } from '../../services/state-store.service';
import { PerspectivePoints } from '../../services/geometric-transform.service';
import { UndoRedoService } from '../../services/undo-redo.service';
import { OcrEngineService } from '../../services/ocr-engine.service';
import { ImageProcessingService } from '../../services/image-processing.service';
import { GeometricTransformService } from '../../services/geometric-transform.service';
import { imageDataToBlob } from '../../utils/image-helpers';
import { BoundingBox } from '../../models/bounding-box.interface';

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
    ResultsPanelComponent
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
        (clear)="onClear()">
      </app-toolbar>

      <div class="main-content">
        @if (!hasImage()) {
          <div class="loader-container">
            <app-image-loader (imageLoaded)="onImageLoaded($event)"></app-image-loader>
          </div>
        } @else {
          <div class="three-panel-layout">
            <div class="left-panel">
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
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Initialize default OCR engine
    const adapters = this.ocrEngine.getAvailableAdapters();
    if (adapters.length > 0) {
      this.ocrEngine.setAdapter(adapters[0].name);
    }
  }

  onImageLoaded(event: {
    imageData: ImageData;
    imageUrl: string;
    fileName: string;
    fileType: string;
    width: number;
    height: number;
  }): void {
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

    let processed = currentState.currentImageData;

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

  async onRunOcr(): Promise<void> {
    const currentState = this.state();
    if (!currentState.currentImageData) return;

    this.isProcessing.set(true);

    try {
      const blob = await imageDataToBlob(currentState.currentImageData);
      const result = await this.ocrEngine.performOCR(blob);
      
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

