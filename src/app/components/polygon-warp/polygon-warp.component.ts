import { Component, Inject, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-polygon-warp',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="polygon-warp-dialog">
      <h2 mat-dialog-title>Local Region Warping</h2>
      <mat-dialog-content>
        <div class="instructions">
          <p>Click on the image to create a polygon region. Click the first point again to close the polygon.</p>
          <p>Then drag the corner points to warp the selected region.</p>
        </div>
        <div class="canvas-container" style="position: relative;">
          <canvas #canvas
                  [width]="canvasWidth"
                  [height]="canvasHeight"
                  (mousedown)="onMouseDown($event)"
                  (mousemove)="onMouseMove($event)"
                  (mouseup)="onMouseUp($event)"
                  (click)="onClick($event)">
          </canvas>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button (click)="onClear()">Clear</button>
        <button mat-button (click)="onReset()">Reset</button>
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onApply()" [disabled]="!hasPolygon()">Apply</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .polygon-warp-dialog {
      width: 100%;
      height: 100%;
    }
    .instructions {
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .instructions p {
      margin: 4px 0;
      font-size: 14px;
      color: #666;
    }
    .canvas-container {
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid #e0e0e0;
      background: #fff;
    }
    canvas {
      cursor: crosshair;
      max-width: 100%;
      max-height: 70vh;
    }
    mat-dialog-actions {
      justify-content: flex-end;
    }
  `]
})
export class PolygonWarpComponent implements AfterViewInit, OnChanges {
  imageData: ImageData | null = null;
  imageUrl: string | null = null;
  canvasWidth: number = 800;
  canvasHeight: number = 600;

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;

  private points: Point[] = [];
  private isDrawing = false;
  private isDragging = false;
  private draggedPointIndex: number | null = null;
  private dragOffset = { x: 0, y: 0 };
  private scaleX = 1;
  private scaleY = 1;

  constructor(
    public dialogRef: MatDialogRef<PolygonWarpComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      imageData: ImageData | null;
      imageUrl: string | null;
      canvasWidth: number;
      canvasHeight: number;
    }
  ) {
    this.imageData = data.imageData || null;
    this.imageUrl = data.imageUrl || null;
    this.canvasWidth = data.canvasWidth || 800;
    this.canvasHeight = data.canvasHeight || 600;
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Changes handled via data injection
  }

  private calculateScale(): void {
    if (this.imageData) {
      this.scaleX = this.canvasWidth / this.imageData.width;
      this.scaleY = this.canvasHeight / this.imageData.height;
    }
  }

  onClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    // Check if clicking near the first point to close polygon
    if (this.points.length >= 3) {
      const firstPoint = this.points[0];
      const dist = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
      if (dist < 10) {
        this.isDrawing = false;
        this.draw();
        return;
      }
    }

    // Add new point
    this.points.push({ x, y });
    this.isDrawing = true;
    this.draw();
  }

  onMouseDown(event: MouseEvent): void {
    if (this.points.length === 0) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    // Check if clicking on a point
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
      if (dist < 8) {
        this.isDragging = true;
        this.draggedPointIndex = i;
        this.dragOffset = { x: x - point.x, y: y - point.y };
        return;
      }
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.draggedPointIndex === null) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    this.points[this.draggedPointIndex] = {
      x: x - this.dragOffset.x,
      y: y - this.dragOffset.y
    };

    this.draw();
  }

  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.draggedPointIndex = null;
  }

  onClear(): void {
    this.points = [];
    this.isDrawing = false;
    this.draw();
  }

  onReset(): void {
    // Reset points to original positions (would need to store originals)
    this.draw();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    if (this.points.length < 3) return;

    // Return the polygon points (source and target are the same for now)
    // In a full implementation, target points would be the warped positions
    const sourcePoints = [...this.points];
    const targetPoints = [...this.points];
    this.dialogRef.close({ sourcePoints, targetPoints });
  }

  hasPolygon(): boolean {
    return this.points.length >= 3;
  }

  private draw(): void {
    if (!this.ctx) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    if (this.imageData) {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCanvas.width = this.imageData.width;
        tempCanvas.height = this.imageData.height;
        tempCtx.putImageData(this.imageData, 0, 0);
        this.ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      }
    } else if (this.imageUrl) {
      const img = new Image();
      img.onload = () => {
        this.ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.drawPolygon();
      };
      img.src = this.imageUrl;
      return;
    }

    this.drawPolygon();
  }

  private drawPolygon(): void {
    if (!this.ctx || this.points.length === 0) return;

    const canvas = this.canvasRef.nativeElement;

    // Draw polygon outline
    if (this.points.length > 1) {
      this.ctx.strokeStyle = '#2196F3';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.points[0].x * this.scaleX, this.points[0].y * this.scaleY);
      for (let i = 1; i < this.points.length; i++) {
        this.ctx.lineTo(this.points[i].x * this.scaleX, this.points[i].y * this.scaleY);
      }
      if (this.points.length >= 3) {
        this.ctx.closePath();
      }
      this.ctx.stroke();

      // Fill polygon with semi-transparent color
      if (this.points.length >= 3) {
        this.ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
        this.ctx.fill();
      }
    }

    // Draw points
    this.ctx.fillStyle = '#2196F3';
    this.points.forEach((point, index) => {
      this.ctx!.beginPath();
      this.ctx!.arc(point.x * this.scaleX, point.y * this.scaleY, 6, 0, 2 * Math.PI);
      this.ctx!.fill();

      // Highlight first point if polygon can be closed
      if (index === 0 && this.points.length >= 3) {
        this.ctx!.strokeStyle = '#4CAF50';
        this.ctx!.lineWidth = 3;
        this.ctx!.stroke();
      }
    });
  }
}

