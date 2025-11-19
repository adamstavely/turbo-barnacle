import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableDetectionService, DetectedTable } from '../../services/table-detection.service';
import { BoundingBox } from '../../models/bounding-box.interface';

@Component({
  selector: 'app-table-detection',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatTabsModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="table-detection-panel">
      <div class="header">
        <h3>Table Detection</h3>
        <button mat-raised-button color="primary" (click)="detectTables()" [disabled]="!hasBoundingBoxes()">
          <mat-icon>table_chart</mat-icon>
          Detect Tables
        </button>
      </div>

      @if (tables().length === 0 && !isDetecting()) {
        <div class="empty-state">
          <mat-icon>table_chart</mat-icon>
          <p>Click "Detect Tables" to find tables in the OCR results</p>
        </div>
      }

      @if (isDetecting()) {
        <div class="detecting">
          <mat-spinner [diameter]="30"></mat-spinner>
          <p>Detecting tables...</p>
        </div>
      }

      @if (tables().length > 0) {
        <div class="tables-list">
          @for (table of tables(); track table.id) {
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>
                  Table {{ $index + 1 }} ({{ table.rowCount }}x{{ table.colCount }})
                </mat-panel-title>
                <mat-panel-description>
                  {{ table.cells.length }} rows, {{ table.cells[0]?.length || 0 }} columns
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div class="table-content">
                <div class="table-actions">
                  <button mat-stroked-button (click)="exportAsCSV(table)">
                    <mat-icon>file_download</mat-icon>
                    Export CSV
                  </button>
                  <button mat-stroked-button (click)="exportAsHTML(table)">
                    <mat-icon>code</mat-icon>
                    Export HTML
                  </button>
                  <button mat-stroked-button (click)="highlightTable(table)">
                    <mat-icon>highlight</mat-icon>
                    Highlight
                  </button>
                </div>

                <mat-tab-group>
                  <mat-tab label="Table View">
                    <div class="table-view">
                      <table class="data-table">
                        <thead>
                          <tr>
                            @for (col of getColumns(table); track col) {
                              <th>Column {{ col + 1 }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of table.cells; track $index) {
                            <tr>
                              @for (cell of row; track cell.col) {
                                <td>{{ cell.text || '' }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </mat-tab>

                  <mat-tab label="CSV">
                    <div class="export-content">
                      <pre>{{ getTableCSV(table) }}</pre>
                      <button mat-raised-button color="primary" (click)="copyToClipboard(getTableCSV(table))">
                        <mat-icon>content_copy</mat-icon>
                        Copy CSV
                      </button>
                    </div>
                  </mat-tab>

                  <mat-tab label="HTML">
                    <div class="export-content">
                      <pre>{{ getTableHTML(table) }}</pre>
                      <button mat-raised-button color="primary" (click)="copyToClipboard(getTableHTML(table))">
                        <mat-icon>content_copy</mat-icon>
                        Copy HTML
                      </button>
                    </div>
                  </mat-tab>
                </mat-tab-group>
              </div>
            </mat-expansion-panel>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .table-detection-panel {
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header h3 {
      margin: 0;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .detecting {
      text-align: center;
      padding: 20px;
    }

    .tables-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .table-content {
      padding: 16px;
    }

    .table-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .table-view {
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .data-table th,
    .data-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }

    .data-table th {
      background: #f5f5f5;
      font-weight: bold;
    }

    .export-content {
      padding: 16px;
    }

    .export-content pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
      font-size: 12px;
    }
  `]
})
export class TableDetectionComponent implements OnInit {
  @Input() boundingBoxes: BoundingBox[] = [];
  @Output() tableHighlighted = new EventEmitter<DetectedTable>();

  tables = signal<DetectedTable[]>([]);
  isDetecting = signal(false);

  constructor(private tableDetection: TableDetectionService) {}

  ngOnInit(): void {
    // Auto-detect if bounding boxes are available
    if (this.boundingBoxes.length > 0) {
      this.detectTables();
    }
  }

  hasBoundingBoxes(): boolean {
    return this.boundingBoxes.length > 0;
  }

  detectTables(): void {
    if (this.boundingBoxes.length === 0) return;

    this.isDetecting.set(true);
    
    try {
      const detected = this.tableDetection.detectTables(this.boundingBoxes);
      this.tables.set(detected);
    } catch (error) {
      console.error('Table detection failed:', error);
      alert('Failed to detect tables. Please try again.');
    } finally {
      this.isDetecting.set(false);
    }
  }

  getColumns(table: DetectedTable): number[] {
    const maxCols = Math.max(...table.cells.map(row => row.length));
    return Array.from({ length: maxCols }, (_, i) => i);
  }

  getTableCSV(table: DetectedTable): string {
    return this.tableDetection.extractTableAsCSV(table);
  }

  getTableHTML(table: DetectedTable): string {
    return this.tableDetection.extractTableAsHTML(table);
  }

  exportAsCSV(table: DetectedTable): void {
    const csv = this.getTableCSV(table);
    this.downloadFile(csv, `table-${table.id}.csv`, 'text/csv');
  }

  exportAsHTML(table: DetectedTable): void {
    const html = this.getTableHTML(table);
    this.downloadFile(html, `table-${table.id}.html`, 'text/html');
  }

  highlightTable(table: DetectedTable): void {
    this.tableHighlighted.emit(table);
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}

