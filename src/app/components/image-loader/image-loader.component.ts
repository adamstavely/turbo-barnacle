import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PdfRasterizerService } from '../../services/pdf-rasterizer.service';
import { loadImageFromFile, imageToImageData, scaleImageData } from '../../utils/image-helpers';

@Component({
  selector: 'app-image-loader',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="image-loader" 
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)"
         [class.drag-over]="isDragOver">
      <input #fileInput 
             type="file" 
             accept="image/*,.pdf"
             (change)="onFileSelected($event)"
             style="display: none">
      
      <div class="loader-content">
        <mat-icon>cloud_upload</mat-icon>
        <p>Drag and drop an image or PDF here</p>
        <p class="subtitle">or</p>
        <button mat-raised-button color="primary" (click)="fileInput.click()">
          Browse Files
        </button>
        <p class="formats">Supported: JPG, PNG, TIFF, WebP, PDF</p>
      </div>
    </div>
  `,
  styles: [`
    .image-loader {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #fafafa;
    }

    .image-loader.drag-over {
      border-color: #1976d2;
      background: #e3f2fd;
    }

    .loader-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #666;
    }

    .subtitle {
      margin: 0;
      color: #666;
    }

    .formats {
      margin: 8px 0 0 0;
      font-size: 12px;
      color: #999;
    }
  `]
})
export class ImageLoaderComponent {
  @Output() imageLoaded = new EventEmitter<{
    imageData: ImageData;
    imageUrl: string;
    fileName: string;
    fileType: string;
    width: number;
    height: number;
  }>();

  isDragOver = false;

  constructor(private pdfRasterizer: PdfRasterizerService) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.processFile(files[0]);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.processFile(input.files[0]);
    }
  }

  private async processFile(file: File): Promise<void> {
    try {
      let imageData: ImageData;
      let width: number;
      let height: number;
      let imageUrl: string;

      if (file.type === 'application/pdf') {
        // Handle PDF
        const result = await this.pdfRasterizer.rasterizePdf(file, 1);
        imageData = result.imageData;
        width = result.width;
        height = result.height;
        imageUrl = URL.createObjectURL(file);
      } else {
        // Handle image files
        const img = await loadImageFromFile(file);
        imageData = imageToImageData(img);
        width = img.width;
        height = img.height;
        imageUrl = URL.createObjectURL(file);
      }

      // Scale if too large (max 2000px on longest side for performance)
      const scaledImageData = scaleImageData(imageData, 2000);
      const scaleFactor = scaledImageData.width / imageData.width;
      width = scaledImageData.width;
      height = scaledImageData.height;

      this.imageLoaded.emit({
        imageData: scaledImageData,
        imageUrl,
        fileName: file.name,
        fileType: file.type,
        width,
        height
      });
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Failed to load image. Please try again.');
    }
  }
}

