import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
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
export class CanvasImageComponent implements OnInit, OnChanges, AfterViewInit, AfterViewChecked {
  @Input() imageData: ImageData | null = null;
  @Input() imageUrl: string | null = null;
  @Input() maxDisplayWidth: number = 800;
  @Input() maxDisplayHeight: number = 600;

  @Output() dimensionsChanged = new EventEmitter<{
    canvasWidth: number;
    canvasHeight: number;
    displayWidth: number;
    displayHeight: number;
  }>();

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  canvasWidth = 0;
  canvasHeight = 0;
  displayWidth = 0;
  displayHeight = 0;

  private canvasReady = false;
  private pendingImageData: ImageData | null = null;
  private pendingImageUrl: string | null = null;
  private maxRetries = 50; // Maximum number of retries (500ms total)
  private retryCount = 0;
  private isUpdating = false; // Flag to prevent re-entry during update
  private lastRenderedImageData: ImageData | null = null; // Track the last rendered ImageData
  private lastRenderedImageUrl: string | null = null; // Track the last rendered image URL
  private checkedInAfterViewChecked = false; // Flag to prevent multiple checks in same cycle

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Store initial values immediately (before AfterViewInit)
    // This captures values when component is conditionally created with initial data
    if (this.imageData) {
      this.pendingImageData = this.imageData;
    }
    if (this.imageUrl) {
      this.pendingImageUrl = this.imageUrl;
    }
  }

  ngAfterViewInit(): void {
    // Poll for input value until it is set
    // This handles cases where signal evaluation happens after component creation
    const checkAndUpdate = () => {
      // Check if input is now available
      if (this.imageData || this.imageUrl) {
        this.canvasReady = true;
        this.retryCount = 0; // Reset retry count on success
        // Store current inputs
        if (this.imageData && !this.pendingImageData) {
          this.pendingImageData = this.imageData;
        }
        if (this.imageUrl && !this.pendingImageUrl) {
          this.pendingImageUrl = this.imageUrl;
        }
        // Update canvas now that it's ready
        this.updateCanvas();
      } else if (this.retryCount < this.maxRetries) {
        // Input not set yet, check again
        this.retryCount++;
        setTimeout(checkAndUpdate, 10);
      } else {
        // Max retries reached, mark as ready anyway (might be legitimately null)
        this.canvasReady = true;
        // Still try to update in case pending data exists
        if (this.pendingImageData || this.pendingImageUrl) {
          this.updateCanvas();
        }
      }
    };
    setTimeout(checkAndUpdate, 0);
  }

  ngAfterViewChecked(): void {
    // Fallback: Check if input is set but canvas hasn't been updated yet
    // This catches cases where input is bound after initial lifecycle hooks
    // Use setTimeout to defer the update and break the change detection cycle
    if (this.checkedInAfterViewChecked) {
      return; // Already checked in this cycle
    }

    if (this.canvasReady && this.canvasRef?.nativeElement) {
      const hasNewImageData = this.imageData && this.imageData !== this.lastRenderedImageData;
      const hasNewImageUrl = this.imageUrl && this.imageUrl !== this.lastRenderedImageUrl;
      
      if (hasNewImageData || hasNewImageUrl) {
        // Set flag to prevent multiple checks in same cycle
        this.checkedInAfterViewChecked = true;
        
        // Input is set but not rendered yet, update canvas
        // Defer using setTimeout to break the synchronous change detection cycle
        setTimeout(() => {
          if (hasNewImageData) {
            this.pendingImageData = this.imageData;
          }
          if (hasNewImageUrl) {
            this.pendingImageUrl = this.imageUrl;
          }
          this.updateCanvas();
          // Reset flag after update
          this.checkedInAfterViewChecked = false;
        }, 0);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imageData'] || changes['imageUrl']) {
      // Store the new values
      if (changes['imageData']) {
        this.pendingImageData = this.imageData;
      }
      if (changes['imageUrl']) {
        this.pendingImageUrl = this.imageUrl;
      }
      
      if (!this.canvasReady) {
        // Canvas isn't ready yet, data will be processed in ngAfterViewInit
        // The polling logic in ngAfterViewInit will pick it up
        return;
      }
      
      // Canvas is ready, update immediately
      // This handles cases where input is set after component creation
      // Use requestAnimationFrame for better timing with DOM updates
      requestAnimationFrame(() => {
        this.updateCanvas();
      });
    }
  }

  private updateCanvas(): void {
    // Prevent re-entry
    if (this.isUpdating) {
      return;
    }

    // Retry if canvas isn't ready yet
    if (!this.canvasRef?.nativeElement) {
      // If we have data to render, retry on next animation frame
      if (this.imageData || this.imageUrl || this.pendingImageData || this.pendingImageUrl) {
        requestAnimationFrame(() => {
          this.updateCanvas();
        });
      }
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    // Use pending data if available, otherwise use current inputs
    const imageDataToUse = this.pendingImageData || this.imageData;
    const imageUrlToUse = this.pendingImageUrl || this.imageUrl;

    // If no data to render, return early
    if (!imageDataToUse && !imageUrlToUse) {
      return;
    }

    // Set updating flag
    this.isUpdating = true;

    // Clear pending data once we start using it
    if (this.pendingImageData) {
      this.pendingImageData = null;
    }
    if (this.pendingImageUrl) {
      this.pendingImageUrl = null;
    }

    if (imageDataToUse) {
      // Use ImageData directly
      // Update canvas element synchronously for proper drawing
      canvas.width = imageDataToUse.width;
      canvas.height = imageDataToUse.height;
      ctx.putImageData(imageDataToUse, 0, 0);
      // Track what we've rendered to prevent duplicate renders
      this.lastRenderedImageData = imageDataToUse;
      // Update template-bound properties immediately for display size
      this.canvasWidth = imageDataToUse.width;
      this.canvasHeight = imageDataToUse.height;
      this.calculateDisplaySize();
      // Defer change detection to next tick to avoid infinite loops
      setTimeout(() => {
        this.cdr.markForCheck();
        this.isUpdating = false;
      }, 0);
    } else if (imageUrlToUse) {
      // Load from URL
      const img = new Image();
      img.onload = () => {
        // Update canvas element synchronously for proper drawing
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        // Track what we've rendered to prevent duplicate renders
        this.lastRenderedImageUrl = imageUrlToUse;
        // Update template-bound properties immediately for display size
        this.canvasWidth = img.width;
        this.canvasHeight = img.height;
        this.calculateDisplaySize();
        // Defer change detection to next tick to avoid infinite loops
        setTimeout(() => {
          this.cdr.markForCheck();
          this.isUpdating = false;
        }, 0);
      };
      img.onerror = () => {
        this.isUpdating = false;
      };
      img.src = imageUrlToUse;
      return;
    } else {
      this.isUpdating = false;
    }
  }

  private calculateDisplaySize(): void {
    const scale = Math.min(
      this.maxDisplayWidth / this.canvasWidth,
      this.maxDisplayHeight / this.canvasHeight,
      1 // Don't scale up
    );

    this.displayWidth = this.canvasWidth * scale;
    this.displayHeight = this.canvasHeight * scale;
    
    // Emit dimensions when they change
    this.dimensionsChanged.emit({
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      displayWidth: this.displayWidth,
      displayHeight: this.displayHeight
    });
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

