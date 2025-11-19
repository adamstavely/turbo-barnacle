import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { OcrResult } from '../../models/ocr-result.interface';
import { OcrEngineService } from '../../services/ocr-engine.service';
import { imageDataToBlob } from '../../utils/image-helpers';

@Component({
  selector: 'app-multi-engine-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <div class="comparison-container">
      <div class="header">
        <h2>Multi-Engine OCR Comparison</h2>
        <button mat-raised-button color="primary" (click)="runAllEngines()" [disabled]="isRunning()">
          @if (isRunning()) {
            <mat-spinner [diameter]="20"></mat-spinner>
          } @else {
            <mat-icon>compare_arrows</mat-icon>
          }
          Run All Engines
        </button>
      </div>

      @if (results().length === 0 && !isRunning()) {
        <div class="empty-state">
          <mat-icon>compare_arrows</mat-icon>
          <p>Click "Run All Engines" to compare OCR results from different engines</p>
        </div>
      }

      @if (isRunning()) {
        <div class="progress-section">
          <mat-spinner [diameter]="40"></mat-spinner>
          <p>Running OCR on {{ activeEngines().length }} engines...</p>
          <div class="engine-status">
            @for (engine of activeEngines(); track engine) {
              <mat-chip>{{ engine }}</mat-chip>
            }
          </div>
        </div>
      }

      @if (results().length > 0) {
        <mat-tab-group>
          <mat-tab label="Summary">
            <div class="summary-content">
              <table mat-table [dataSource]="summaryData()" class="comparison-table">
                <ng-container matColumnDef="engine">
                  <th mat-header-cell *matHeaderCellDef>Engine</th>
                  <td mat-cell *matCellDef="let result">{{ result.engine }}</td>
                </ng-container>

                <ng-container matColumnDef="textLength">
                  <th mat-header-cell *matHeaderCellDef>Text Length</th>
                  <td mat-cell *matCellDef="let result">{{ result.text.length }}</td>
                </ng-container>

                <ng-container matColumnDef="wordCount">
                  <th mat-header-cell *matHeaderCellDef>Word Count</th>
                  <td mat-cell *matCellDef="let result">{{ result.wordCount }}</td>
                </ng-container>

                <ng-container matColumnDef="confidence">
                  <th mat-header-cell *matHeaderCellDef>Confidence</th>
                  <td mat-cell *matCellDef="let result">
                    <span [class.high-confidence]="result.confidence && result.confidence > 0.8"
                          [class.medium-confidence]="result.confidence && result.confidence > 0.5 && result.confidence <= 0.8"
                          [class.low-confidence]="result.confidence && result.confidence <= 0.5">
                      {{ (result.confidence || 0) * 100 | number:'1.0-1' }}%
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="processingTime">
                  <th mat-header-cell *matHeaderCellDef>Processing Time</th>
                  <td mat-cell *matCellDef="let result">{{ result.processingTime || 0 }}ms</td>
                </ng-container>

                <ng-container matColumnDef="boundingBoxes">
                  <th mat-header-cell *matHeaderCellDef>Bounding Boxes</th>
                  <td mat-cell *matCellDef="let result">{{ result.boundingBoxes.length }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="summaryColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: summaryColumns"></tr>
              </table>
            </div>
          </mat-tab>

          @for (result of results(); track result.engine) {
            <mat-tab [label]="result.engine">
              <div class="result-content">
                <mat-card>
                  <mat-card-header>
                    <mat-card-title>{{ result.engine }}</mat-card-title>
                    <mat-card-subtitle>
                      Confidence: {{ (result.confidence || 0) * 100 | number:'1.0-1' }}% | 
                      Processing Time: {{ result.processingTime || 0 }}ms
                    </mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="result-text">
                      <h3>Extracted Text:</h3>
                      <pre>{{ result.text }}</pre>
                    </div>
                    <div class="result-stats">
                      <mat-chip>Words: {{ getWordCount(result.text) }}</mat-chip>
                      <mat-chip>Characters: {{ result.text.length }}</mat-chip>
                      <mat-chip>Bounding Boxes: {{ result.boundingBoxes.length }}</mat-chip>
                    </div>
                    <div class="action-buttons">
                      <button mat-raised-button color="primary" (click)="selectResult(result)">
                        <mat-icon>check</mat-icon>
                        Use This Result
                      </button>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </mat-tab>
          }
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .comparison-container {
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h2 {
      margin: 0;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .progress-section {
      text-align: center;
      padding: 40px;
    }

    .engine-status {
      margin-top: 16px;
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .summary-content {
      padding: 16px;
    }

    .comparison-table {
      width: 100%;
    }

    .high-confidence {
      color: #4CAF50;
      font-weight: bold;
    }

    .medium-confidence {
      color: #FF9800;
    }

    .low-confidence {
      color: #F44336;
    }

    .result-content {
      padding: 16px;
    }

    .result-text {
      margin-bottom: 16px;
    }

    .result-text h3 {
      margin-bottom: 8px;
    }

    .result-text pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .result-stats {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .action-buttons {
      margin-top: 16px;
    }

    mat-spinner {
      margin-right: 8px;
    }
  `]
})
export class MultiEngineComparisonComponent implements OnInit {
  imageData: ImageData | null = null;
  results = signal<OcrResult[]>([]);
  isRunning = signal(false);
  activeEngines = signal<string[]>([]);

  summaryColumns = ['engine', 'textLength', 'wordCount', 'confidence', 'processingTime', 'boundingBoxes'];

  constructor(
    private ocrEngineService: OcrEngineService,
    public dialogRef: MatDialogRef<MultiEngineComparisonComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { imageData: ImageData | null }
  ) {
    this.imageData = data.imageData || null;
  }

  ngOnInit(): void {
    // Auto-run comparison when dialog opens
    if (this.imageData) {
      this.runAllEngines();
    }
  }

  summaryData() {
    return this.results().map(result => ({
      ...result,
      wordCount: result.text.split(/\s+/).filter((w: string) => w.length > 0).length
    }));
  }

  getWordCount(text: string): number {
    return text.split(/\s+/).filter((w: string) => w.length > 0).length;
  }

  async runAllEngines(): Promise<void> {
    if (!this.imageData) {
      alert('No image loaded');
      return;
    }

    this.isRunning.set(true);
    this.results.set([]);
    
    const adapters = this.ocrEngineService.getAvailableAdapters();
    this.activeEngines.set(adapters.map(a => a.name));

    const blob = await imageDataToBlob(this.imageData);
    const promises: Promise<OcrResult>[] = [];

    for (const adapter of adapters) {
      const promise = (async () => {
        try {
          const currentAdapter = this.ocrEngineService.getCurrentAdapterName();
          await this.ocrEngineService.setAdapter(adapter.name);
            const result = await this.ocrEngineService.performOCR(blob, undefined);
          // Restore original adapter
          if (currentAdapter) {
            await this.ocrEngineService.setAdapter(currentAdapter);
          }
          return result;
        } catch (error) {
          console.error(`OCR failed for ${adapter.name}:`, error);
          return {
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            boundingBoxes: [],
            engine: adapter.name,
            confidence: 0,
            processingTime: 0
          } as OcrResult;
        }
      })();
      promises.push(promise);
    }

    try {
      const allResults = await Promise.all(promises);
      this.results.set(allResults);
    } catch (error) {
      console.error('Multi-engine comparison failed:', error);
      alert('Some OCR engines failed. Check console for details.');
    } finally {
      this.isRunning.set(false);
      this.activeEngines.set([]);
    }
  }

  selectResult(result: OcrResult): void {
    this.dialogRef.close(result);
  }
}

