import { Component, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface MeshPoint {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  isPinned: boolean;
}

@Component({
  selector: 'app-mesh-warp-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <div class="mesh-warp-dialog">
      <h2 mat-dialog-title>Mesh Warp Editor</h2>
      <mat-dialog-content>
        <div class="instructions">
          <p>Click and drag mesh points to warp the image. Right-click to pin/unpin points.</p>
          <div class="controls">
            <mat-form-field appearance="outline">
              <mat-label>Mesh Density</mat-label>
              <input matInput type="number" [(ngModel)]="meshDensity" (ngModelChange)="regenerateMesh()" min="3" max="20">
            </mat-form-field>
            <button mat-stroked-button (click)="togglePinMode()">
              <mat-icon>{{ pinMode ? 'push_pin' : 'push_pin_outlined' }}</mat-icon>
              {{ pinMode ? 'Pin Mode: ON' : 'Pin Mode: OFF' }}
            </button>
          </div>
        </div>
        <div class="canvas-container" style="position: relative;">
          <canvas #canvas
                  [width]="canvasWidth"
                  [height]="canvasHeight"
                  (mousedown)="onMouseDown($event)"
                  (mousemove)="onMouseMove($event)"
                  (mouseup)="onMouseUp($event)"
                  (contextmenu)="onRightClick($event)">
          </canvas>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button (click)="onReset()">Reset</button>
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onApply()">Apply</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .mesh-warp-dialog {
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
    .controls {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-top: 12px;
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
export class MeshWarpEditorComponent implements AfterViewInit {
  imageData: ImageData | null = null;
  imageUrl: string | null = null;
  canvasWidth: number = 800;
  canvasHeight: number = 600;

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;

  private mesh: MeshPoint[][] = [];
  meshDensity = 8;
  private isDragging = false;
  private draggedPoint: { row: number; col: number } | null = null;
  pinMode = false;
  private scaleX = 1;
  private scaleY = 1;

  constructor(
    public dialogRef: MatDialogRef<MeshWarpEditorComponent>,
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
    this.calculateScale();
    this.regenerateMesh();
    this.draw();
  }

  private calculateScale(): void {
    if (this.imageData) {
      this.scaleX = this.canvasWidth / this.imageData.width;
      this.scaleY = this.canvasHeight / this.imageData.height;
    }
  }

  regenerateMesh(): void {
    const width = this.imageData?.width || this.canvasWidth;
    const height = this.imageData?.height || this.canvasHeight;
    
    this.mesh = [];
    const stepX = width / this.meshDensity;
    const stepY = height / this.meshDensity;

    for (let row = 0; row <= this.meshDensity; row++) {
      this.mesh[row] = [];
      for (let col = 0; col <= this.meshDensity; col++) {
        this.mesh[row][col] = {
          x: col * stepX,
          y: row * stepY,
          originalX: col * stepX,
          originalY: row * stepY,
          isPinned: false
        };
      }
    }
    this.draw();
  }

  togglePinMode(): void {
    this.pinMode = !this.pinMode;
  }

  onMouseDown(event: MouseEvent): void {
    const point = this.getPointAt(event);
    if (point) {
      this.isDragging = true;
      this.draggedPoint = point;
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.draggedPoint) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    const point = this.mesh[this.draggedPoint.row][this.draggedPoint.col];
    if (!point.isPinned) {
      point.x = x;
      point.y = y;
      this.draw();
    }
  }

  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.draggedPoint = null;
  }

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    const point = this.getPointAt(event);
    if (point) {
      const meshPoint = this.mesh[point.row][point.col];
      meshPoint.isPinned = !meshPoint.isPinned;
      this.draw();
    }
  }

  private getPointAt(event: MouseEvent): { row: number; col: number } | null {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    const threshold = 10;

    for (let row = 0; row < this.mesh.length; row++) {
      for (let col = 0; col < this.mesh[row].length; col++) {
        const point = this.mesh[row][col];
        const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
        if (dist < threshold) {
          return { row, col };
        }
      }
    }
    return null;
  }

  onReset(): void {
    this.regenerateMesh();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    this.dialogRef.close({ mesh: this.mesh });
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
        this.drawMesh();
      };
      img.src = this.imageUrl;
      return;
    }

    this.drawMesh();
  }

  private drawMesh(): void {
    if (!this.ctx || this.mesh.length === 0) return;

    const canvas = this.canvasRef.nativeElement;

    // Draw mesh lines
    this.ctx.strokeStyle = 'rgba(33, 150, 243, 0.3)';
    this.ctx.lineWidth = 1;

    // Draw horizontal lines
    for (let row = 0; row < this.mesh.length; row++) {
      this.ctx.beginPath();
      for (let col = 0; col < this.mesh[row].length; col++) {
        const point = this.mesh[row][col];
        if (col === 0) {
          this.ctx.moveTo(point.x * this.scaleX, point.y * this.scaleY);
        } else {
          this.ctx.lineTo(point.x * this.scaleX, point.y * this.scaleY);
        }
      }
      this.ctx.stroke();
    }

    // Draw vertical lines
    for (let col = 0; col < this.mesh[0].length; col++) {
      this.ctx.beginPath();
      for (let row = 0; row < this.mesh.length; row++) {
        const point = this.mesh[row][col];
        if (row === 0) {
          this.ctx.moveTo(point.x * this.scaleX, point.y * this.scaleY);
        } else {
          this.ctx.lineTo(point.x * this.scaleX, point.y * this.scaleY);
        }
      }
      this.ctx.stroke();
    }

    // Draw points
    for (let row = 0; row < this.mesh.length; row++) {
      for (let col = 0; col < this.mesh[row].length; col++) {
        const point = this.mesh[row][col];
        this.ctx.fillStyle = point.isPinned ? '#F44336' : '#2196F3';
        this.ctx.beginPath();
        this.ctx.arc(point.x * this.scaleX, point.y * this.scaleY, 4, 0, 2 * Math.PI);
        this.ctx.fill();

        // Draw pin indicator
        if (point.isPinned) {
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      }
    }
  }
}

