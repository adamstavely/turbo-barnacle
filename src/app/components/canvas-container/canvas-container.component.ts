import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasImageComponent } from '../canvas-image/canvas-image.component';

@Component({
  selector: 'app-canvas-container',
  standalone: true,
  imports: [CommonModule, CanvasImageComponent],
  template: `
    <div class="canvas-container">
      <app-canvas-image
        [imageData]="imageData"
        [imageUrl]="imageUrl"
        [maxDisplayWidth]="800"
        [maxDisplayHeight]="600">
      </app-canvas-image>
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
}

