import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-canvas-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas
            [width]="canvasWidth"
            [height]="canvasHeight"
            [style.width.px]="displayWidth"
            [style.height.px]="displayHeight">
    </canvas>
  `,
  styles: [`
    canvas {
      display: block;
      max-width: 100%;
      height: auto;
    }
  `]
})
export class CanvasImageComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() imageData: ImageData | null = null;
  @Input() imageUrl: string | null = null;
  @Input() maxDisplayWidth: number = 800;
  @Input() maxDisplayHeight: number = 600;

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  canvasWidth = 0;
  canvasHeight = 0;
  displayWidth = 0;
  displayHeight = 0;

  ngOnInit(): void {
    this.updateCanvas();
  }

  ngAfterViewInit(): void {
    this.updateCanvas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageData'] || changes['imageUrl']) {
      this.updateCanvas();
    }
  }

  private updateCanvas(): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    if (this.imageData) {
      // Use ImageData directly
      this.canvasWidth = this.imageData.width;
      this.canvasHeight = this.imageData.height;
      canvas.width = this.imageData.width;
      canvas.height = this.imageData.height;
      ctx.putImageData(this.imageData, 0, 0);
    } else if (this.imageUrl) {
      // Load from URL
      const img = new Image();
      img.onload = () => {
        this.canvasWidth = img.width;
        this.canvasHeight = img.height;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        this.calculateDisplaySize();
      };
      img.src = this.imageUrl;
      return;
    } else {
      return;
    }

    this.calculateDisplaySize();
  }

  private calculateDisplaySize(): void {
    const scale = Math.min(
      this.maxDisplayWidth / this.canvasWidth,
      this.maxDisplayHeight / this.canvasHeight,
      1 // Don't scale up
    );

    this.displayWidth = this.canvasWidth * scale;
    this.displayHeight = this.canvasHeight * scale;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasRef?.nativeElement || null;
  }

  getImageData(): ImageData | null {
    const canvas = this.getCanvas();
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}

