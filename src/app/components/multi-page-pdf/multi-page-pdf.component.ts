import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { PdfRasterizerService } from '../../services/pdf-rasterizer.service';

@Component({
  selector: 'app-multi-page-pdf',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <div class="multi-page-pdf-dialog">
      <h2 mat-dialog-title>Multi-Page PDF</h2>
      <mat-dialog-content>
        <div class="header-info">
          <p>PDF has {{ totalPages() }} pages. Select pages to process:</p>
          <button mat-stroked-button (click)="selectAll()">Select All</button>
          <button mat-stroked-button (click)="deselectAll()">Deselect All</button>
        </div>

        @if (isLoading()) {
          <div class="loading">
            <mat-spinner [diameter]="40"></mat-spinner>
            <p>Loading PDF pages...</p>
          </div>
        }

        <div class="pages-grid">
          @for (page of pages(); track page.pageNumber) {
            <mat-card [class.selected]="page.selected" (click)="togglePage(page.pageNumber)">
              <mat-card-header>
                <mat-card-title>Page {{ page.pageNumber }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="page-preview">
                  @if (page.imageData) {
                    <canvas [attr.data-page]="page.pageNumber" [width]="page.width" [height]="page.height"></canvas>
                  } @else {
                    <div class="placeholder">Loading...</div>
                  }
                </div>
                @if (page.selected) {
                  <mat-chip>Selected</mat-chip>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onProcessSelected()" [disabled]="selectedPages().length === 0">
          Process {{ selectedPages().length }} Page(s)
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .multi-page-pdf-dialog {
      width: 100%;
      max-height: 90vh;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .loading {
      text-align: center;
      padding: 40px;
    }

    .pages-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      max-height: 60vh;
      overflow-y: auto;
      padding: 16px;
    }

    mat-card {
      cursor: pointer;
      transition: all 0.2s;
    }

    mat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    mat-card.selected {
      border: 2px solid #2196F3;
      background: #e3f2fd;
    }

    .page-preview {
      width: 100%;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
    }

    canvas {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .placeholder {
      color: #999;
    }

    mat-dialog-actions {
      justify-content: flex-end;
    }
  `]
})
export class MultiPagePdfComponent implements OnInit {
  file: File;
  totalPages = signal(0);
  pages = signal<Array<{
    pageNumber: number;
    selected: boolean;
    imageData: ImageData | null;
    width: number;
    height: number;
  }>>([]);
  isLoading = signal(false);

  constructor(
    public dialogRef: MatDialogRef<MultiPagePdfComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { file: File },
    private pdfRasterizer: PdfRasterizerService
  ) {
    this.file = data.file;
  }

  async ngOnInit(): Promise<void> {
    await this.loadPdfPages();
  }

  async loadPdfPages(): Promise<void> {
    this.isLoading.set(true);
    try {
      const pageCount = await this.pdfRasterizer.getPdfPageCount(this.file);
      this.totalPages.set(pageCount);

      const pagesData = [];
      for (let i = 1; i <= pageCount; i++) {
        pagesData.push({
          pageNumber: i,
          selected: i === 1, // Select first page by default
          imageData: null,
          width: 0,
          height: 0
        });
      }
      this.pages.set(pagesData);

      // Load previews for first few pages
      for (let i = 0; i < Math.min(6, pageCount); i++) {
        await this.loadPagePreview(i + 1);
      }
    } catch (error) {
      console.error('Failed to load PDF:', error);
      alert('Failed to load PDF. Please ensure it is a valid PDF file.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadPagePreview(pageNumber: number): Promise<void> {
    try {
      const { imageData, width, height } = await this.pdfRasterizer.rasterizePdf(this.file, pageNumber, 0.5);
      const pages = this.pages();
      const pageIndex = pageNumber - 1;
      if (pages[pageIndex]) {
        pages[pageIndex].imageData = imageData;
        pages[pageIndex].width = width;
        pages[pageIndex].height = height;
        this.pages.set([...pages]);
        
        // Draw preview after view update
        setTimeout(() => {
          this.drawPreview(pageNumber, imageData, width, height);
        }, 0);
      }
    } catch (error) {
      console.error(`Failed to load page ${pageNumber}:`, error);
    }
  }

  drawPreview(pageNumber: number, imageData: ImageData, width: number, height: number): void {
    const canvas = document.querySelector(`canvas[data-page="${pageNumber}"]`) as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale to fit preview
    const maxSize = 200;
    const scale = Math.min(maxSize / width, maxSize / height);
    canvas.width = width * scale;
    canvas.height = height * scale;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }
  }

  togglePage(pageNumber: number): void {
    const pages = this.pages();
    const page = pages.find(p => p.pageNumber === pageNumber);
    if (page) {
      page.selected = !page.selected;
      this.pages.set([...pages]);
    }
  }

  selectAll(): void {
    const pages = this.pages();
    pages.forEach(page => page.selected = true);
    this.pages.set([...pages]);
  }

  deselectAll(): void {
    const pages = this.pages();
    pages.forEach(page => page.selected = false);
    this.pages.set([...pages]);
  }

  selectedPages(): number[] {
    return this.pages().filter(p => p.selected).map(p => p.pageNumber);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onProcessSelected(): Promise<void> {
    const selected = this.selectedPages();
    if (selected.length === 0) return;

    if (selected.length === 1) {
      // Single page - process directly
      try {
        const { imageData, width, height } = await this.pdfRasterizer.rasterizePdf(
          this.file,
          selected[0],
          2.0
        );
        this.dialogRef.close({ imageData, width, height, pageNumber: selected[0] });
      } catch (error) {
        console.error('Failed to process PDF page:', error);
        alert('Failed to process PDF page. Please try again.');
      }
    } else {
      // Multiple pages - return batch processing info
      this.dialogRef.close({ 
        batchPages: selected,
        file: this.file,
        batchMode: true
      });
    }
  }
}

