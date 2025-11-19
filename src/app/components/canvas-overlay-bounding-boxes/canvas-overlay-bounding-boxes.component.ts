import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoundingBox } from '../../models/bounding-box.interface';

@Component({
  selector: 'app-canvas-overlay-bounding-boxes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #overlayCanvas
            [width]="canvasWidth"
            [height]="canvasHeight"
            [style.width.px]="displayWidth"
            [style.height.px]="displayHeight"
            (mousedown)="onMouseDown($event)"
            (mousemove)="onMouseMove($event)"
            (mouseup)="onMouseUp($event)"
            (mouseleave)="onMouseLeave()">
    </canvas>
  `,
  styles: [`
    canvas {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: auto;
      cursor: crosshair;
    }
  `]
})
export class CanvasOverlayBoundingBoxesComponent implements AfterViewInit, OnChanges {
  @Input() boundingBoxes: BoundingBox[] = [];
  @Input() selectedBoxId: string | null = null;
  @Input() canvasWidth = 0;
  @Input() canvasHeight = 0;
  @Input() displayWidth = 0;
  @Input() displayHeight = 0;
  @Input() scaleX = 1;
  @Input() scaleY = 1;

  @Output() boxSelected = new EventEmitter<string>();
  @Output() boxMoved = new EventEmitter<{ id: string; x: number; y: number }>();
  @Output() boxResized = new EventEmitter<{ id: string; x: number; y: number; width: number; height: number }>();
  @Output() boxDeleted = new EventEmitter<string>();
  @Output() boxCreated = new EventEmitter<{ x: number; y: number; width: number; height: number }>();

  @ViewChild('overlayCanvas', { static: false }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private isDragging = false;
  private isResizing = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private selectedBox: BoundingBox | null = null;
  private resizeHandle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null = null;
  private isCreating = false;
  private createStartX = 0;
  private createStartY = 0;

  ngAfterViewInit(): void {
    const canvas = this.overlayCanvasRef?.nativeElement;
    if (canvas) {
      this.ctx = canvas.getContext('2d');
      this.draw();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['boundingBoxes'] || changes['selectedBoxId'] || changes['canvasWidth'] || changes['canvasHeight']) {
      this.draw();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.selectedBoxId) return;

    const selectedBox = this.boundingBoxes.find(b => b.id === this.selectedBoxId);
    if (!selectedBox) return;

    const step = event.shiftKey ? 10 : 1;
    let newX = selectedBox.x;
    let newY = selectedBox.y;

    switch (event.key) {
      case 'ArrowLeft':
        newX -= step;
        break;
      case 'ArrowRight':
        newX += step;
        break;
      case 'ArrowUp':
        newY -= step;
        break;
      case 'ArrowDown':
        newY += step;
        break;
      case 'Delete':
      case 'Backspace':
        this.boxDeleted.emit(this.selectedBoxId);
        return;
    }

    if (newX !== selectedBox.x || newY !== selectedBox.y) {
      this.boxMoved.emit({ id: this.selectedBoxId, x: newX, y: newY });
    }
  }

  onMouseDown(event: MouseEvent): void {
    const rect = this.overlayCanvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    // Check if clicking on a resize handle
    const handle = this.getResizeHandle(x, y);
    if (handle && this.selectedBoxId) {
      this.isResizing = true;
      this.resizeHandle = handle;
      this.selectedBox = this.boundingBoxes.find(b => b.id === this.selectedBoxId) || null;
      this.dragStartX = x;
      this.dragStartY = y;
      return;
    }

    // Check if clicking on an existing box
    const clickedBox = this.getBoxAt(x, y);
    if (clickedBox) {
      this.isDragging = true;
      this.selectedBox = clickedBox;
      this.dragStartX = x;
      this.dragStartY = y;
      this.boxSelected.emit(clickedBox.id);
      return;
    }

    // Start creating new box
    this.isCreating = true;
    this.createStartX = x;
    this.createStartY = y;
  }

  onMouseMove(event: MouseEvent): void {
    const rect = this.overlayCanvasRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scaleX;
    const y = (event.clientY - rect.top) / this.scaleY;

    if (this.isResizing && this.selectedBox && this.resizeHandle) {
      this.handleResize(x, y);
      this.draw();
    } else if (this.isDragging && this.selectedBox) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      this.boxMoved.emit({
        id: this.selectedBox.id,
        x: this.selectedBox.x + dx,
        y: this.selectedBox.y + dy
      });
      this.dragStartX = x;
      this.dragStartY = y;
      this.draw();
    } else if (this.isCreating) {
      this.draw();
      // Draw preview box
      if (this.ctx) {
        const width = x - this.createStartX;
        const height = y - this.createStartY;
        this.ctx.strokeStyle = '#2196F3';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(this.createStartX, this.createStartY, width, height);
        this.ctx.setLineDash([]);
      }
    } else {
      // Update cursor
      const handle = this.getResizeHandle(x, y);
      if (handle) {
        this.overlayCanvasRef.nativeElement.style.cursor = this.getCursorForHandle(handle);
      } else if (this.getBoxAt(x, y)) {
        this.overlayCanvasRef.nativeElement.style.cursor = 'move';
      } else {
        this.overlayCanvasRef.nativeElement.style.cursor = 'crosshair';
      }
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this.isCreating) {
      const rect = this.overlayCanvasRef.nativeElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) / this.scaleX;
      const y = (event.clientY - rect.top) / this.scaleY;
      const width = x - this.createStartX;
      const height = y - this.createStartY;

      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        this.boxCreated.emit({
          x: Math.min(this.createStartX, x),
          y: Math.min(this.createStartY, y),
          width: Math.abs(width),
          height: Math.abs(height)
        });
      }
      this.isCreating = false;
      this.draw();
    }

    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  onMouseLeave(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.isCreating = false;
  }

  private draw(): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.boundingBoxes.forEach(box => {
      const isSelected = box.id === this.selectedBoxId;
      
      // Draw box
      this.ctx!.strokeStyle = isSelected ? '#2196F3' : '#4CAF50';
      this.ctx!.lineWidth = isSelected ? 3 : 2;
      this.ctx!.strokeRect(box.x, box.y, box.width, box.height);

      // Draw text
      if (box.text) {
        this.ctx!.fillStyle = isSelected ? '#2196F3' : '#4CAF50';
        this.ctx!.font = '12px Arial';
        this.ctx!.fillText(box.text.substring(0, 20), box.x, box.y - 5);
      }

      // Draw resize handles if selected
      if (isSelected) {
        this.drawResizeHandles(box);
      }
    });
  }

  private drawResizeHandles(box: BoundingBox): void {
    if (!this.ctx) return;

    const handleSize = 8;
    const handles = [
      { x: box.x, y: box.y }, // nw
      { x: box.x + box.width, y: box.y }, // ne
      { x: box.x, y: box.y + box.height }, // sw
      { x: box.x + box.width, y: box.y + box.height }, // se
      { x: box.x + box.width / 2, y: box.y }, // n
      { x: box.x + box.width / 2, y: box.y + box.height }, // s
      { x: box.x, y: box.y + box.height / 2 }, // w
      { x: box.x + box.width, y: box.y + box.height / 2 } // e
    ];

    this.ctx.fillStyle = '#2196F3';
    handles.forEach(handle => {
      this.ctx!.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
  }

  private getBoxAt(x: number, y: number): BoundingBox | null {
    for (let i = this.boundingBoxes.length - 1; i >= 0; i--) {
      const box = this.boundingBoxes[i];
      if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
        return box;
      }
    }
    return null;
  }

  private getResizeHandle(x: number, y: number): 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null {
    if (!this.selectedBoxId) return null;

    const box = this.boundingBoxes.find(b => b.id === this.selectedBoxId);
    if (!box) return null;

    const handleSize = 8;
    const threshold = handleSize / 2;

    // Check corners
    if (Math.abs(x - box.x) < threshold && Math.abs(y - box.y) < threshold) return 'nw';
    if (Math.abs(x - (box.x + box.width)) < threshold && Math.abs(y - box.y) < threshold) return 'ne';
    if (Math.abs(x - box.x) < threshold && Math.abs(y - (box.y + box.height)) < threshold) return 'sw';
    if (Math.abs(x - (box.x + box.width)) < threshold && Math.abs(y - (box.y + box.height)) < threshold) return 'se';

    // Check edges
    if (Math.abs(x - (box.x + box.width / 2)) < threshold && Math.abs(y - box.y) < threshold) return 'n';
    if (Math.abs(x - (box.x + box.width / 2)) < threshold && Math.abs(y - (box.y + box.height)) < threshold) return 's';
    if (Math.abs(x - box.x) < threshold && Math.abs(y - (box.y + box.height / 2)) < threshold) return 'w';
    if (Math.abs(x - (box.x + box.width)) < threshold && Math.abs(y - (box.y + box.height / 2)) < threshold) return 'e';

    return null;
  }

  private getCursorForHandle(handle: string): string {
    const cursors: Record<string, string> = {
      'nw': 'nw-resize',
      'ne': 'ne-resize',
      'sw': 'sw-resize',
      'se': 'se-resize',
      'n': 'n-resize',
      's': 's-resize',
      'e': 'e-resize',
      'w': 'w-resize'
    };
    return cursors[handle] || 'default';
  }

  private handleResize(x: number, y: number): void {
    if (!this.selectedBox || !this.resizeHandle) return;

    let newX = this.selectedBox.x;
    let newY = this.selectedBox.y;
    let newWidth = this.selectedBox.width;
    let newHeight = this.selectedBox.height;

    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;

    switch (this.resizeHandle) {
      case 'nw':
        newX = this.selectedBox.x + dx;
        newY = this.selectedBox.y + dy;
        newWidth = this.selectedBox.width - dx;
        newHeight = this.selectedBox.height - dy;
        break;
      case 'ne':
        newY = this.selectedBox.y + dy;
        newWidth = this.selectedBox.width + dx;
        newHeight = this.selectedBox.height - dy;
        break;
      case 'sw':
        newX = this.selectedBox.x + dx;
        newWidth = this.selectedBox.width - dx;
        newHeight = this.selectedBox.height + dy;
        break;
      case 'se':
        newWidth = this.selectedBox.width + dx;
        newHeight = this.selectedBox.height + dy;
        break;
      case 'n':
        newY = this.selectedBox.y + dy;
        newHeight = this.selectedBox.height - dy;
        break;
      case 's':
        newHeight = this.selectedBox.height + dy;
        break;
      case 'e':
        newWidth = this.selectedBox.width + dx;
        break;
      case 'w':
        newX = this.selectedBox.x + dx;
        newWidth = this.selectedBox.width - dx;
        break;
    }

    // Ensure minimum size
    if (newWidth < 10) newWidth = 10;
    if (newHeight < 10) newHeight = 10;

    this.boxResized.emit({
      id: this.selectedBox.id,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });

    this.dragStartX = x;
    this.dragStartY = y;
  }
}

