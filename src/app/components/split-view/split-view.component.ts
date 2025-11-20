import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CanvasImageComponent } from '../canvas-image/canvas-image.component';

@Component({
  selector: 'app-split-view',
  standalone: true,
  imports: [
    CommonModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    CanvasImageComponent
  ],
  template: `
    <div class="split-view-container">
      <div class="split-view-header">
        <h3>Split View</h3>
        <button mat-icon-button (click)="toggleSplitView()">
          <mat-icon>{{ enabled ? 'close' : 'compare' }}</mat-icon>
        </button>
      </div>

      @if (enabled) {
        <div class="split-view-content">
          <div class="split-panel left-panel" [style.width.%]="splitPosition()">
            <div class="panel-label">Original</div>
            <app-canvas-image
              [imageData]="originalImageData"
              [imageUrl]="originalImageUrl"
              [maxDisplayWidth]="400"
              [maxDisplayHeight]="400">
            </app-canvas-image>
          </div>

          <div class="split-divider" (mousedown)="startDrag($event)">
            <div class="divider-handle"></div>
          </div>

          <div class="split-panel right-panel" [style.width.%]="100 - splitPosition()">
            <div class="panel-label">Enhanced</div>
            <app-canvas-image
              [imageData]="enhancedImageData"
              [imageUrl]="enhancedImageUrl"
              [maxDisplayWidth]="400"
              [maxDisplayHeight]="400">
            </app-canvas-image>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .split-view-container {
      padding: 16px;
    }

    .split-view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .split-view-header h3 {
      margin: 0;
    }

    .split-view-content {
      display: flex;
      position: relative;
      width: 100%;
      height: 500px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .split-panel {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #f5f5f5;
    }

    .panel-label {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10;
    }

    .split-divider {
      width: 4px;
      background: #2196F3;
      cursor: col-resize;
      position: relative;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .split-divider:hover {
      background: #1976D2;
    }

    .divider-handle {
      width: 20px;
      height: 40px;
      background: #2196F3;
      border-radius: 2px;
      position: absolute;
    }

    .split-divider:hover .divider-handle {
      background: #1976D2;
    }

    app-canvas-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class SplitViewComponent {
  @Input() originalImageData: ImageData | null = null;
  @Input() originalImageUrl: string | null = null;
  @Input() enhancedImageData: ImageData | null = null;
  @Input() enhancedImageUrl: string | null = null;
  @Input() enabled: boolean = false;
  @Output() splitViewToggled = new EventEmitter<boolean>();

  splitPosition = signal(50);
  isDragging = signal(false);

  toggleSplitView(): void {
    // Emit event to parent - parent controls the enabled state
    this.splitViewToggled.emit(!this.enabled);
  }

  startDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
    
    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging()) return;
      
      const container = (e.target as HTMLElement).closest('.split-view-content');
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        this.splitPosition.set(Math.max(10, Math.min(90, percentage)));
      }
    };

    const onMouseUp = () => {
      this.isDragging.set(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}

