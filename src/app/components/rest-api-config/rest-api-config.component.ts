import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { OcrEngineService } from '../../services/ocr-engine.service';
import { OcrEngineAdapter } from '../../adapters/ocr-engine-adapter.interface';

export interface RestApiConfigData {
  name?: string;
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

@Component({
  selector: 'app-rest-api-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>Configure REST API OCR</h2>
    <mat-dialog-content>
      <div class="config-form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="name" placeholder="My OCR Service" required>
          <mat-hint>Display name for this OCR service</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Endpoint URL</mat-label>
          <input matInput [(ngModel)]="endpoint" placeholder="https://api.example.com/ocr" required>
          <mat-hint>REST API endpoint for OCR processing</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>API Key (Optional)</mat-label>
          <input matInput [(ngModel)]="apiKey" type="password" placeholder="your-api-key">
          <mat-hint>API key for authentication</mat-hint>
        </mat-form-field>

        <div class="headers-section">
          <h3>Custom Headers (Optional)</h3>
          <div class="headers-list">
            @for (header of headers(); track header.key) {
              <div class="header-item">
                <mat-form-field appearance="outline">
                  <mat-label>Key</mat-label>
                  <input matInput [(ngModel)]="header.key" (ngModelChange)="onHeaderChange()">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Value</mat-label>
                  <input matInput [(ngModel)]="header.value" (ngModelChange)="onHeaderChange()">
                </mat-form-field>
                <button mat-icon-button (click)="removeHeader($index)" color="warn">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
            <button mat-stroked-button (click)="addHeader()">
              <mat-icon>add</mat-icon>
              Add Header
            </button>
          </div>
        </div>

        @if (existingAdapters().length > 0) {
          <div class="existing-adapters">
            <h3>Existing REST API Adapters</h3>
            <mat-list>
              @for (adapter of existingAdapters(); track adapter.name) {
                <mat-list-item>
                  <div class="adapter-item">
                    <span class="adapter-name">{{ adapter.name }}</span>
                    <button mat-icon-button (click)="removeAdapter(adapter.name)" color="warn">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-list-item>
              }
            </mat-list>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!isValid()">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .config-form {
      padding: 20px;
      min-width: 500px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .headers-section {
      margin-top: 24px;
      margin-bottom: 24px;
    }

    .headers-section h3 {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 500;
    }

    .headers-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .header-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .header-item mat-form-field {
      flex: 1;
      margin-bottom: 0;
    }

    .existing-adapters {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
    }

    .existing-adapters h3 {
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: 500;
    }

    .adapter-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .adapter-name {
      font-weight: 500;
    }

    mat-dialog-actions {
      justify-content: flex-end;
    }
  `]
})
export class RestApiConfigComponent implements OnInit {
  name = '';
  endpoint = '';
  apiKey = '';
  headers = signal<Array<{ key: string; value: string }>>([]);
  existingAdapters = signal<OcrEngineAdapter[]>([]);

  constructor(
    public dialogRef: MatDialogRef<RestApiConfigComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RestApiConfigData | null,
    private ocrEngineService: OcrEngineService
  ) {
    if (data) {
      this.name = data.name || '';
      this.endpoint = data.endpoint || '';
      this.apiKey = data.apiKey || '';
      if (data.headers) {
        this.headers.set(Object.entries(data.headers).map(([key, value]) => ({ key, value })));
      }
    }
  }

  ngOnInit(): void {
    this.loadExistingAdapters();
  }

  loadExistingAdapters(): void {
    const allAdapters = this.ocrEngineService.getAvailableAdapters();
    // Filter REST API adapters (they typically have names that don't match built-in ones)
    const restAdapters = allAdapters.filter(adapter => 
      adapter.name !== 'Mock OCR' && 
      adapter.name !== 'Tesseract.js' &&
      adapter.name !== 'REST API' // Default REST API name
    );
    this.existingAdapters.set(restAdapters);
  }

  addHeader(): void {
    this.headers.update(h => [...h, { key: '', value: '' }]);
  }

  removeHeader(index: number): void {
    this.headers.update(h => h.filter((_, i) => i !== index));
  }

  onHeaderChange(): void {
    // Headers are updated via two-way binding
  }

  removeAdapter(adapterName: string): void {
    // Note: This would require adding a removeAdapter method to OcrEngineService
    // For now, we'll just reload the list
    this.loadExistingAdapters();
  }

  isValid(): boolean {
    return !!(this.name.trim() && this.endpoint.trim());
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSave(): Promise<void> {
    if (!this.isValid()) return;

    try {
      const headersObj: Record<string, string> = {};
      this.headers().forEach(header => {
        if (header.key.trim() && header.value.trim()) {
          headersObj[header.key.trim()] = header.value.trim();
        }
      });

      await this.ocrEngineService.registerRestAdapter({
        name: this.name.trim(),
        endpoint: this.endpoint.trim(),
        apiKey: this.apiKey.trim() || undefined,
        headers: Object.keys(headersObj).length > 0 ? headersObj : undefined
      });

      this.dialogRef.close({ success: true });
    } catch (error) {
      console.error('Failed to register REST API adapter:', error);
      alert('Failed to register REST API adapter. Please check your configuration.');
    }
  }
}

