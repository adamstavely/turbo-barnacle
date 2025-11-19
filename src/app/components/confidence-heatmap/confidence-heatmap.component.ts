import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoundingBox } from '../../models/bounding-box.interface';

@Component({
  selector: 'app-confidence-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas 
      #heatmapCanvas
      [width]="canvasWidth"
      [height]="canvasHeight"
      [style.width.px]="displayWidth"
      [style.height.px]="displayHeight"
      class="heatmap-canvas">
    </canvas>
  `,
  styles: [`
    .heatmap-canvas {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 5;
    }
  `]
})
export class ConfidenceHeatmapComponent implements AfterViewInit, OnChanges {
  @Input() boundingBoxes: BoundingBox[] = [];
  @Input() canvasWidth = 0;
  @Input() canvasHeight = 0;
  @Input() displayWidth = 0;
  @Input() displayHeight = 0;
  @Input() scaleX = 1;
  @Input() scaleY = 1;
  @Input() enabled = false;

  @ViewChild('heatmapCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.draw();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['boundingBoxes'] || changes['enabled'] || changes['canvasWidth'] || changes['canvasHeight']) {
      this.draw();
    }
  }

  private draw(): void {
    if (!this.ctx || !this.enabled) {
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
      return;
    }

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.boundingBoxes.forEach(box => {
      const confidence = box.confidence ?? 0;
      const color = this.getConfidenceColor(confidence);
      
      // Draw semi-transparent overlay
      this.ctx!.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
      this.ctx!.fillRect(box.x, box.y, box.width, box.height);
      
      // Draw border
      this.ctx!.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.ctx!.lineWidth = 2;
      this.ctx!.strokeRect(box.x, box.y, box.width, box.height);
    });
  }

  private getConfidenceColor(confidence: number): { r: number; g: number; b: number } {
    // Green (≥90%): rgb(76, 175, 80)
    // Yellow (70-90%): rgb(255, 193, 7)
    // Red (<70%): rgb(244, 67, 54)
    
    if (confidence >= 0.9) {
      return { r: 76, g: 175, b: 80 }; // Green
    } else if (confidence >= 0.7) {
      // Interpolate between yellow and green
      const factor = (confidence - 0.7) / 0.2;
      return {
        r: Math.round(76 + (255 - 76) * (1 - factor)),
        g: Math.round(175 + (193 - 175) * (1 - factor)),
        b: Math.round(80 + (7 - 80) * (1 - factor))
      };
    } else {
      // Interpolate between red and yellow
      const factor = confidence / 0.7;
      return {
        r: Math.round(244 + (255 - 244) * factor),
        g: Math.round(67 + (193 - 67) * factor),
        b: Math.round(54 + (7 - 54) * factor)
      };
    }
  }
}

