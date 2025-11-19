import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { OcrResult } from '../../models/ocr-result.interface';
import { OcrPreviewService } from '../../services/ocr-preview.service';
import { OcrEngineService } from '../../services/ocr-engine.service';

@Component({
  selector: 'app-ocr-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    @if (isVisible()) {
      <div class="ocr-preview-panel">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>preview</mat-icon>
              OCR Preview
            </mat-card-title>
            <button mat-icon-button (click)="close()" class="close-button">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            @if (isLoading()) {
              <div class="loading">
                <mat-spinner [diameter]="30"></mat-spinner>
                <p>Processing...</p>
              </div>
            } @else if (previewResult()) {
              <div class="preview-content">
                <div class="engine-info">
                  <mat-chip>Engine: {{ previewResult()!.engine }}</mat-chip>
                  @if (previewResult()!.confidence) {
                    <mat-chip>Confidence: {{ (previewResult()!.confidence! * 100) | number:'1.0-0' }}%</mat-chip>
                  }
                </div>
                <div class="preview-text">
                  <p>{{ previewResult()!.text || '(No text detected)' }}</p>
                </div>
                @if (previewResult()!.boundingBoxes.length > 0) {
                  <div class="bbox-count">
                    {{ previewResult()!.boundingBoxes.length }} text region(s) detected
                  </div>
                }
              </div>
            } @else {
              <p class="no-result">No preview available</p>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .ocr-preview-panel {
      position: fixed;
      top: 80px;
      right: 20px;
      width: 300px;
      z-index: 1000;
      max-height: 400px;
      overflow-y: auto;
    }

    mat-card {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }

    .close-button {
      margin-left: auto;
    }

    .loading {
      text-align: center;
      padding: 20px;
    }

    .loading p {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .preview-content {
      padding: 8px;
    }

    .engine-info {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .preview-text {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      max-height: 200px;
      overflow-y: auto;
    }

    .preview-text p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .bbox-count {
      font-size: 11px;
      color: #666;
      text-align: center;
    }

    .no-result {
      text-align: center;
      color: #999;
      padding: 20px;
      font-size: 12px;
    }
  `]
})
export class OcrPreviewComponent {
  @Input() imageData: ImageData | null = null;
  @Input() regionX = 0;
  @Input() regionY = 0;
  @Input() regionWidth = 0;
  @Input() regionHeight = 0;

  isVisible = signal(false);
  isLoading = signal(false);
  previewResult = signal<OcrResult | null>(null);

  constructor(
    private ocrPreview: OcrPreviewService,
    private ocrEngine: OcrEngineService
  ) {}

  async updatePreview(): Promise<void> {
    if (!this.imageData || this.regionWidth <= 0 || this.regionHeight <= 0) {
      this.previewResult.set(null);
      return;
    }

    this.isLoading.set(true);
    this.isVisible.set(true);

    try {
      const result = await this.ocrPreview.previewRegion(
        this.imageData,
        this.regionX,
        this.regionY,
        this.regionWidth,
        this.regionHeight
      );
      this.previewResult.set(result);
    } catch (error) {
      console.error('Preview update failed:', error);
      this.previewResult.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  close(): void {
    this.isVisible.set(false);
    this.ocrPreview.cancelPending();
  }

  async switchEngine(engineName: string): Promise<void> {
    await this.ocrEngine.setAdapter(engineName);
    await this.updatePreview();
  }
}

