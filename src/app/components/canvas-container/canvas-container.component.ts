import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasImageComponent } from '../canvas-image/canvas-image.component';
import { MagnifierLensComponent } from '../magnifier-lens/magnifier-lens.component';

@Component({
  selector: 'app-canvas-container',
  standalone: true,
  imports: [CommonModule, CanvasImageComponent, MagnifierLensComponent],
  template: `
    <div class="canvas-container">
      <app-canvas-image
        #canvasImage
        [imageData]="imageData"
        [imageUrl]="imageUrl"
        [maxDisplayWidth]="800"
        [maxDisplayHeight]="600">
      </app-canvas-image>
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
  
  @ViewChild('canvasImage') canvasImageComponent!: CanvasImageComponent;

  getSourceCanvas(): HTMLCanvasElement | null {
    return this.canvasImageComponent?.getCanvas() || null;
  }
}

