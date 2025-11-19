import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { OcrResult } from '../../models/ocr-result.interface';
import { BoundingBox } from '../../models/bounding-box.interface';
import { ExportModalComponent } from '../export-modal/export-modal.component';

@Component({
  selector: 'app-results-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  template: `
    <div class="results-panel">
      <h3>OCR Results</h3>

      @if (ocrResults.length === 0) {
        <p class="no-results">No OCR results yet. Load an image and run OCR.</p>
      } @else {
        <mat-tab-group>
          <mat-tab label="Text">
            <div class="tab-content">
              <div class="text-output">{{ currentResult()?.text || 'No text extracted' }}</div>
              <button mat-stroked-button (click)="exportText()" class="export-button">
                <mat-icon>download</mat-icon>
                Export Text
              </button>
            </div>
          </mat-tab>

          <mat-tab label="JSON">
            <div class="tab-content">
              <pre class="json-output">{{ jsonOutput() }}</pre>
              <button mat-stroked-button (click)="exportJSON()" class="export-button">
                <mat-icon>download</mat-icon>
                Export JSON
              </button>
            </div>
          </mat-tab>

          <mat-tab label="Export">
            <div class="tab-content">
              <button mat-raised-button color="primary" (click)="openExportModal()" class="export-button">
                <mat-icon>file_download</mat-icon>
                Open Export Options
              </button>
            </div>
          </mat-tab>

          <mat-tab label="Boxes">
            <div class="tab-content">
              <mat-list>
                @for (box of currentResult()?.boundingBoxes || []; track box.id) {
                  <mat-list-item 
                    [class.hovered]="hoveredBoxId === box.id"
                    (mouseenter)="onBoxHover(box.id)"
                    (mouseleave)="onBoxHover(null)">
                    <div class="box-item">
                      <div class="box-text">{{ box.text || 'No text' }}</div>
                      <div class="box-meta">
                        <span>Confidence: {{ (box.confidence || 0) | number:'1.0-2' }}</span>
                        <span>Position: ({{ box.x }}, {{ box.y }})</span>
                        <span>Size: {{ box.width }}×{{ box.height }}</span>
                      </div>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            </div>
          </mat-tab>

          <mat-tab label="Metadata">
            <div class="tab-content">
              @if (hasMetadata()) {
                <div class="metadata-view">
                  <h4>Engine: {{ currentResult()!.engine }}</h4>
                  @if (currentResult()!.processingTime !== undefined) {
                    <p><strong>Processing Time:</strong> {{ currentResult()!.processingTime }}ms</p>
                  }
                  @if (currentResult()!.confidence !== undefined) {
                    <p><strong>Overall Confidence:</strong> {{ (currentResult()!.confidence! * 100) | number:'1.0-2' }}%</p>
                  }
                  <h4>Additional Metadata:</h4>
                  <pre class="metadata-json">{{ metadataJson() }}</pre>
                </div>
              } @else {
                <p class="no-metadata">No metadata available for this OCR result.</p>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .results-panel {
      padding: 16px;
      height: 100%;
      overflow-y: auto;
    }

    h3 {
      margin-top: 0;
    }

    .no-results {
      color: #666;
      text-align: center;
      padding: 40px 20px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .text-output {
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 14px;
      margin-bottom: 16px;
    }

    .json-output {
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      margin-bottom: 16px;
    }

    .export-button {
      width: 100%;
      margin-top: 8px;
    }

    mat-list-item {
      border-bottom: 1px solid #eee;
    }

    mat-list-item.hovered {
      background: #e3f2fd;
    }

    .box-item {
      width: 100%;
    }

    .box-text {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .box-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }

    .box-meta span {
      display: inline-block;
    }

    .metadata-view {
      padding: 16px;
    }

    .metadata-view h4 {
      margin-top: 16px;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
    }

    .metadata-view p {
      margin: 8px 0;
      font-size: 13px;
    }

    .metadata-json {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .no-metadata {
      color: #666;
      text-align: center;
      padding: 40px 20px;
    }
  `]
})
export class ResultsPanelComponent implements OnInit, OnChanges {
  @Input() ocrResults: OcrResult[] = [];
  @Input() hoveredBoxId: string | null = null;
  @Input() imageData: ImageData | null = null;
  @Input() boundingBoxes: BoundingBox[] = [];

  @Output() boxHover = new EventEmitter<string | null>();

  currentResult = signal<OcrResult | null>(null);

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.updateCurrentResult();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ocrResults']) {
      this.updateCurrentResult();
    }
  }

  private updateCurrentResult(): void {
    if (this.ocrResults.length > 0) {
      this.currentResult.set(this.ocrResults[this.ocrResults.length - 1]);
    } else {
      this.currentResult.set(null);
    }
  }

  jsonOutput(): string {
    return JSON.stringify(this.currentResult(), null, 2);
  }

  hasMetadata(): boolean {
    const result = this.currentResult();
    return !!(result?.metadata && Object.keys(result.metadata).length > 0);
  }

  metadataJson(): string {
    const result = this.currentResult();
    if (!result || !result.metadata) return '{}';
    return JSON.stringify(result.metadata, null, 2);
  }

  onBoxHover(boxId: string | null): void {
    this.hoveredBoxId = boxId;
    this.boxHover.emit(boxId);
  }

  exportText(): void {
    const text = this.currentResult()?.text || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-result.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  exportJSON(): void {
    const json = this.jsonOutput();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-result.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  openExportModal(): void {
    this.dialog.open(ExportModalComponent, {
      width: '400px',
      data: {
        ocrResult: this.currentResult(),
        imageData: this.imageData,
        boundingBoxes: this.boundingBoxes
      }
    });
  }
}

