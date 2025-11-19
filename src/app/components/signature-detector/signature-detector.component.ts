import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { SignatureDetectionService } from '../../services/signature-detection.service';
import { Signature } from '../../models/signature.interface';

@Component({
  selector: 'app-signature-detector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatListModule
  ],
  template: `
    <div class="signature-detector-panel">
      <div class="header">
        <h3>Signature Detection</h3>
        <button mat-raised-button color="primary" (click)="detectSignatures()" [disabled]="!hasImage() || isDetecting()">
          @if (isDetecting()) {
            <mat-spinner [diameter]="20"></mat-spinner>
          } @else {
            <mat-icon>draw</mat-icon>
          }
          Detect Signatures
        </button>
      </div>

      @if (isDetecting()) {
        <div class="detecting">
          <mat-spinner [diameter]="40"></mat-spinner>
          <p>Detecting signatures...</p>
        </div>
      }

      @if (signatures().length > 0) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ signatures().length }} Signature(s) Detected</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              @for (signature of signatures(); track signature.id) {
                <mat-list-item>
                  <div class="signature-item">
                    <div class="signature-info">
                      <mat-chip>Confidence: {{ (signature.confidence * 100) | number:'1.0-0' }}%</mat-chip>
                      <span class="signature-coords">
                        ({{ signature.boundingBox.x | number:'1.0-0' }}, {{ signature.boundingBox.y | number:'1.0-0' }})
                        {{ signature.boundingBox.width | number:'1.0-0' }}×{{ signature.boundingBox.height | number:'1.0-0' }}
                      </span>
                    </div>
                    <div class="signature-actions">
                      <button mat-icon-button (click)="selectSignature(signature.id)" matTooltip="Select">
                        <mat-icon>visibility</mat-icon>
                      </button>
                      <button mat-icon-button (click)="exportSignature(signature)" matTooltip="Export as PNG">
                        <mat-icon>download</mat-icon>
                      </button>
                      <button mat-icon-button (click)="removeSignature(signature.id)" color="warn" matTooltip="Remove">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>
                </mat-list-item>
              }
            </mat-list>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .signature-detector-panel {
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

    .detecting {
      text-align: center;
      padding: 40px;
    }

    .signature-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .signature-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .signature-coords {
      font-size: 11px;
      color: #666;
    }

    .signature-actions {
      display: flex;
      gap: 4px;
    }

    mat-spinner {
      margin-right: 8px;
    }
  `]
})
export class SignatureDetectorComponent {
  @Input() imageData: ImageData | null = null;
  @Output() signatureSelected = new EventEmitter<Signature>();
  @Output() signatureExported = new EventEmitter<{ signature: Signature; blob: Blob }>();

  signatures = signal<Signature[]>([]);
  isDetecting = signal(false);

  constructor(private signatureDetection: SignatureDetectionService) {}

  hasImage(): boolean {
    return this.imageData !== null;
  }

  async detectSignatures(): Promise<void> {
    if (!this.imageData) return;

    this.isDetecting.set(true);
    
    try {
      const detected = await this.signatureDetection.detectSignatures(this.imageData);
      this.signatures.set(detected);
    } catch (error) {
      console.error('Signature detection failed:', error);
      alert('Failed to detect signatures. Please try again.');
    } finally {
      this.isDetecting.set(false);
    }
  }

  selectSignature(id: string): void {
    const signature = this.signatures().find(s => s.id === id);
    if (signature) {
      this.signatureSelected.emit(signature);
    }
  }

  async exportSignature(signature: Signature): Promise<void> {
    if (!this.imageData) return;

    try {
      const blob = await this.signatureDetection.exportSignatureAsPng(this.imageData, signature);
      this.signatureExported.emit({ signature, blob });
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signature-${signature.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Signature export failed:', error);
      alert('Failed to export signature. Please try again.');
    }
  }

  removeSignature(id: string): void {
    this.signatures.update(sigs => sigs.filter(s => s.id !== id));
  }
}

