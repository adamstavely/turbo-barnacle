import { Component, Inject, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PerspectivePoints } from '../../services/geometric-transform.service';

export interface TrapezoidalDialogData {
  imageData: ImageData | null;
  imageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

@Component({
  selector: 'app-trapezoidal-correction',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="trapezoidal-correction">
      <div class="controls">
        <button mat-stroked-button (click)="onAutoDetect()">
          <mat-icon>auto_fix_high</mat-icon>
          Auto Detect Corners
        </button>
        <button mat-stroked-button (click)="onReset()">
          <mat-icon>refresh</mat-icon>
          Reset
        </button>
        <button mat-raised-button color="primary" (click)="onApply()">
          <mat-icon>check</mat-icon>
          Apply Correction
        </button>
        <button mat-button (click)="onCancel()">
          Cancel
        </button>
      </div>
      
      <div class="canvas-wrapper" #wrapper>
        <canvas #canvas
                [width]="canvasWidth"
                [height]="canvasHeight"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseLeave()">
        </canvas>
      </div>
    </div>
  `,
  styles: [`
    .trapezoidal-correction {
      padding: 16px;
    }

    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .controls button {
      flex: 1;
      min-width: 120px;
    }

    .canvas-wrapper {
      position: relative;
      border: 1px solid #ddd;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
      overflow: auto;
    }

    canvas {
      max-width: 100%;
      max-height: 500px;
      cursor: crosshair;
    }
  `]
})
export class TrapezoidalCorrectionComponent implements AfterViewInit, OnChanges {
  imageData: ImageData | null = null;
  imageUrl: string | null = null;
  canvasWidth = 800;
  canvasHeight = 600;

  constructor(
    public dialogRef: MatDialogRef<TrapezoidalCorrectionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TrapezoidalDialogData
  ) {
    this.imageData = data.imageData;
    this.imageUrl = data.imageUrl;
    this.canvasWidth = data.canvasWidth;
    this.canvasHeight = data.canvasHeight;
  }

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrapper', { static: false }) wrapperRef!: ElementRef<HTMLDivElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private points: PerspectivePoints = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
    bottomLeft: { x: 0, y: 0 }
  };
  private isDragging = false;
  private dragHandle: keyof PerspectivePoints | null = null;
  private handleSize = 12;
  private scaleX = 1;
  private scaleY = 1;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.initializePoints();
      this.draw();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageData'] || changes['imageUrl'] || changes['canvasWidth'] || changes['canvasHeight']) {
      this.initializePoints();
      this.draw();
    }
  }

  private initializePoints(): void {
    const width = this.canvasWidth;
    const height = this.canvasHeight;
    const margin = Math.min(width, height) * 0.1;

    this.points = {
      topLeft: { x: margin, y: margin },
      topRight: { x: width - margin, y: margin },
      bottomRight: { x: width - margin, y: height - margin },
      bottomLeft: { x: margin, y: height - margin }
    };
  }

  private draw(): void {
    if (!this.ctx) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image if available
    if (this.imageUrl) {
      const img = new Image();
      img.onload = () => {
        this.calculateScale(img.width, img.height);
        this.ctx!.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
        this.drawOverlay();
      };
      img.src = this.imageUrl;
    } else if (this.imageData) {
      this.calculateScale(this.imageData.width, this.imageData.height);
      this.ctx.putImageData(this.imageData, 0, 0);
      this.drawOverlay();
    } else {
      this.drawOverlay();
    }
  }

  private calculateScale(imgWidth: number, imgHeight: number): void {
    this.scaleX = this.canvasWidth / imgWidth;
    this.scaleY = this.canvasHeight / imgHeight;
  }

  private drawOverlay(): void {
    if (!this.ctx) return;

    // Draw quadrilateral
    this.ctx.strokeStyle = '#2196F3';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.points.topLeft.x, this.points.topLeft.y);
    this.ctx.lineTo(this.points.topRight.x, this.points.topRight.y);
    this.ctx.lineTo(this.points.bottomRight.x, this.points.bottomRight.y);
    this.ctx.lineTo(this.points.bottomLeft.x, this.points.bottomLeft.y);
    this.ctx.closePath();
    this.ctx.stroke();

    // Draw corner handles
    const handles: Array<{ point: { x: number; y: number }; key: keyof PerspectivePoints }> = [
      { point: this.points.topLeft, key: 'topLeft' },
      { point: this.points.topRight, key: 'topRight' },
      { point: this.points.bottomRight, key: 'bottomRight' },
      { point: this.points.bottomLeft, key: 'bottomLeft' }
    ];

    this.ctx.fillStyle = '#2196F3';
    handles.forEach(({ point }) => {
      this.ctx!.fillRect(
        point.x - this.handleSize / 2,
        point.y - this.handleSize / 2,
        this.handleSize,
        this.handleSize
      );
    });

    // Draw labels
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '10px Arial';
    this.ctx.fillText('TL', this.points.topLeft.x - 8, this.points.topLeft.y - 8);
    this.ctx.fillText('TR', this.points.topRight.x + 4, this.points.topRight.y - 8);
    this.ctx.fillText('BR', this.points.bottomRight.x + 4, this.points.bottomRight.y + 16);
    this.ctx.fillText('BL', this.points.bottomLeft.x - 8, this.points.bottomLeft.y + 16);
  }

  onMouseDown(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const handle = this.getHandleAt(x, y);
    if (handle) {
      this.isDragging = true;
      this.dragHandle = handle;
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.dragHandle) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Constrain to canvas bounds
    const constrainedX = Math.max(0, Math.min(this.canvasWidth, x));
    const constrainedY = Math.max(0, Math.min(this.canvasHeight, y));

    this.points[this.dragHandle] = { x: constrainedX, y: constrainedY };
    this.draw();
  }

  onMouseUp(): void {
    this.isDragging = false;
    this.dragHandle = null;
  }

  onMouseLeave(): void {
    this.isDragging = false;
    this.dragHandle = null;
  }

  private getHandleAt(x: number, y: number): keyof PerspectivePoints | null {
    const handles: Array<{ point: { x: number; y: number }; key: keyof PerspectivePoints }> = [
      { point: this.points.topLeft, key: 'topLeft' },
      { point: this.points.topRight, key: 'topRight' },
      { point: this.points.bottomRight, key: 'bottomRight' },
      { point: this.points.bottomLeft, key: 'bottomLeft' }
    ];

    for (const { point, key } of handles) {
      const dx = x - point.x;
      const dy = y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= this.handleSize) {
        return key;
      }
    }

    return null;
  }

  onAutoDetect(): void {
    // This would use the geometric transform service to detect corners
    // For now, reset to default corners
    this.initializePoints();
    this.draw();
  }

  onReset(): void {
    this.initializePoints();
    this.draw();
  }

  onApply(): void {
    // Return points when dialog closes
    this.dialogRef.close({ ...this.points });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getPoints(): PerspectivePoints {
    return { ...this.points };
  }
}

