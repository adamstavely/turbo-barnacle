import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasImageComponent } from '../canvas-image/canvas-image.component';
import { MagnifierLensComponent } from '../magnifier-lens/magnifier-lens.component';
import { CanvasOverlayBoundingBoxesComponent } from '../canvas-overlay-bounding-boxes/canvas-overlay-bounding-boxes.component';
import { BoundingBox } from '../../models/bounding-box.interface';
import { MaskRegion } from '../../models/mask-region.interface';

@Component({
  selector: 'app-canvas-container',
  standalone: true,
  imports: [CommonModule, CanvasImageComponent, MagnifierLensComponent, CanvasOverlayBoundingBoxesComponent],
  template: `
    <div class="canvas-container" style="position: relative;">
      <app-canvas-image
        #canvasImage
        [imageData]="imageData"
        [imageUrl]="imageUrl"
        [maxDisplayWidth]="800"
        [maxDisplayHeight]="600"
        (dimensionsChanged)="onDimensionsChanged($event)">
      </app-canvas-image>
      @if (hasImage && showOverlay) {
        <app-canvas-overlay-bounding-boxes
          [boundingBoxes]="boundingBoxes"
          [selectedBoxId]="selectedBoxId"
          [canvasWidth]="canvasWidth"
          [canvasHeight]="canvasHeight"
          [displayWidth]="displayWidth"
          [displayHeight]="displayHeight"
          [scaleX]="scaleX"
          [scaleY]="scaleY"
          [maskRegions]="maskRegions"
          [isMaskMode]="isMaskMode"
          (boxSelected)="boxSelected.emit($event)"
          (boxMoved)="boxMoved.emit($event)"
          (boxResized)="boxResized.emit($event)"
          (boxDeleted)="boxDeleted.emit($event)"
          (boxCreated)="boxCreated.emit($event)"
          (maskCreated)="maskCreated.emit($event)">
        </app-canvas-overlay-bounding-boxes>
      }
      @if (magnifierEnabled) {
        <app-magnifier-lens
          [sourceCanvas]="getSourceCanvas()"
          [lensSize]="200">
        </app-magnifier-lens>
      }
    </div>
  `,
  styles: [`
    .canvas-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: #f5f5f5;
      min-height: 400px;
      overflow: auto;
    }
  `]
})
export class CanvasContainerComponent {
  @Input() imageData: ImageData | null = null;
  @Input() imageUrl: string | null = null;
  @Input() magnifierEnabled = false;
  @Input() hasImage = false;
  @Input() showOverlay = true;
  @Input() boundingBoxes: BoundingBox[] = [];
  @Input() selectedBoxId: string | null = null;
  @Input() canvasWidth = 0;
  @Input() canvasHeight = 0;
  @Input() displayWidth = 0;
  @Input() displayHeight = 0;
  @Input() scaleX = 1;
  @Input() scaleY = 1;
  @Input() maskRegions: MaskRegion[] = [];
  @Input() isMaskMode = false;
  
  @Output() dimensionsChanged = new EventEmitter<{
    canvasWidth: number;
    canvasHeight: number;
    displayWidth: number;
    displayHeight: number;
  }>();
  @Output() boxSelected = new EventEmitter<string>();
  @Output() boxMoved = new EventEmitter<{ id: string; x: number; y: number }>();
  @Output() boxResized = new EventEmitter<{ id: string; x: number; y: number; width: number; height: number }>();
  @Output() boxDeleted = new EventEmitter<string>();
  @Output() boxCreated = new EventEmitter<{ x: number; y: number; width: number; height: number }>();
  @Output() maskCreated = new EventEmitter<MaskRegion>();
  
  @ViewChild('canvasImage') canvasImageComponent!: CanvasImageComponent;

  getSourceCanvas(): HTMLCanvasElement | null {
    return this.canvasImageComponent?.getCanvas() || null;
  }

  onDimensionsChanged(dimensions: {
    canvasWidth: number;
    canvasHeight: number;
    displayWidth: number;
    displayHeight: number;
  }): void {
    this.dimensionsChanged.emit(dimensions);
  }

  getCanvasDimensions(): {
    canvasWidth: number;
    canvasHeight: number;
    displayWidth: number;
    displayHeight: number;
  } | null {
    if (!this.canvasImageComponent) return null;
    return {
      canvasWidth: this.canvasImageComponent.canvasWidth,
      canvasHeight: this.canvasImageComponent.canvasHeight,
      displayWidth: this.canvasImageComponent.displayWidth,
      displayHeight: this.canvasImageComponent.displayHeight
    };
  }
}

