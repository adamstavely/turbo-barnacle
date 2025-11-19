import { Component, Input, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-magnifier-lens',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isEnabled()) {
      <div 
        class="magnifier-lens"
        [style.left.px]="position().x"
        [style.top.px]="position().y"
        [style.width.px]="lensSize"
        [style.height.px]="lensSize">
        <canvas 
          #magnifierCanvas
          [width]="lensSize"
          [height]="lensSize"
          class="magnifier-canvas">
        </canvas>
        <div class="magnifier-controls">
          <button (click)="cycleZoom()" class="zoom-button">
            {{ zoomLevel() }}×
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .magnifier-lens {
      position: fixed;
      pointer-events: none;
      z-index: 1000;
      border: 2px solid #2196F3;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      background: white;
      overflow: hidden;
      transform: translate(-50%, -50%);
    }

    .magnifier-canvas {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }

    .magnifier-controls {
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: auto;
    }

    .zoom-button {
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      pointer-events: auto;
    }

    .zoom-button:hover {
      background: #1976D2;
    }
  `]
})
export class MagnifierLensComponent {
  @Input() sourceCanvas: HTMLCanvasElement | null = null;
  @Input() lensSize = 200;
  
  isEnabled = signal(false);
  position = signal({ x: 0, y: 0 });
  zoomLevel = signal(2);
  private zoomLevels = [2, 4, 8];
  private currentZoomIndex = 0;

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isEnabled()) return;
    
    this.position.set({ x: event.clientX, y: event.clientY });
    this.updateMagnifier();
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isEnabled()) return;
    
    this.position.set({ x: event.clientX, y: event.clientY });
    this.updateMagnifier();
  }

  toggle(): void {
    this.isEnabled.set(!this.isEnabled());
    if (this.isEnabled()) {
      this.updateMagnifier();
    }
  }

  cycleZoom(): void {
    this.currentZoomIndex = (this.currentZoomIndex + 1) % this.zoomLevels.length;
    this.zoomLevel.set(this.zoomLevels[this.currentZoomIndex]);
    this.updateMagnifier();
  }

  setZoom(level: number): void {
    const index = this.zoomLevels.indexOf(level);
    if (index !== -1) {
      this.currentZoomIndex = index;
      this.zoomLevel.set(level);
      this.updateMagnifier();
    }
  }

  private updateMagnifier(): void {
    if (!this.sourceCanvas || !this.isEnabled()) return;

    const canvas = document.querySelector('.magnifier-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zoom = this.zoomLevel();
    const sourceRect = this.sourceCanvas.getBoundingClientRect();
    
    // Calculate source coordinates
    const sourceX = (this.position().x - sourceRect.left) * (this.sourceCanvas.width / sourceRect.width);
    const sourceY = (this.position().y - sourceRect.top) * (this.sourceCanvas.height / sourceRect.height);
    
    const halfSize = this.lensSize / 2;
    const sourceSize = this.lensSize / zoom;
    
    // Clear and draw magnified region
    ctx.clearRect(0, 0, this.lensSize, this.lensSize);
    
    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(halfSize, halfSize, halfSize, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw the magnified region
    ctx.drawImage(
      this.sourceCanvas,
      sourceX - sourceSize / 2,
      sourceY - sourceSize / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      this.lensSize,
      this.lensSize
    );
    
    ctx.restore();
  }
}

