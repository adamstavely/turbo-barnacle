import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { OcrResult } from '../../models/ocr-result.interface';
import { BoundingBox } from '../../models/bounding-box.interface';
import jsPDF from 'jspdf';

export interface ExportModalData {
  ocrResult: OcrResult | null;
  imageData: ImageData | null;
  boundingBoxes: BoundingBox[];
}

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    FormsModule
  ],
  template: `
    <h2 mat-dialog-title>Export Results</h2>
    <mat-dialog-content>
      <div class="export-options">
        <mat-radio-group [(ngModel)]="selectedFormat">
          <mat-radio-button value="json">JSON</mat-radio-button>
          <mat-radio-button value="text">Plain Text</mat-radio-button>
          <mat-radio-button value="csv">CSV (Table)</mat-radio-button>
          <mat-radio-button value="png">PNG with Overlay</mat-radio-button>
          <mat-radio-button value="pdf">PDF with Overlay</mat-radio-button>
        </mat-radio-group>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onExport()">Export</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .export-options {
      padding: 20px;
      min-width: 300px;
    }

    mat-radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  `]
})
export class ExportModalComponent {
  selectedFormat: 'json' | 'text' | 'csv' | 'png' | 'pdf' = 'json';

  constructor(
    public dialogRef: MatDialogRef<ExportModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportModalData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  async onExport(): Promise<void> {
    switch (this.selectedFormat) {
      case 'json':
        this.exportJSON();
        break;
      case 'text':
        this.exportText();
        break;
      case 'csv':
        this.exportCSV();
        break;
      case 'png':
        await this.exportPNG();
        break;
      case 'pdf':
        await this.exportPDF();
        break;
    }
    this.dialogRef.close();
  }

  private exportJSON(): void {
    if (!this.data.ocrResult) return;

    const exportData = {
      ...this.data.ocrResult,
      boundingBoxes: this.data.boundingBoxes
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, 'ocr-result.json');
  }

  private exportText(): void {
    if (!this.data.ocrResult) return;

    const blob = new Blob([this.data.ocrResult.text], { type: 'text/plain' });
    this.downloadBlob(blob, 'ocr-result.txt');
  }

  private exportCSV(): void {
    if (!this.data.ocrResult || this.data.boundingBoxes.length === 0) return;

    const rows: string[] = ['Text,X,Y,Width,Height,Confidence,Label'];
    
    this.data.boundingBoxes.forEach(box => {
      const text = `"${(box.text || '').replace(/"/g, '""')}"`;
      const row = `${text},${box.x},${box.y},${box.width},${box.height},${box.confidence || 0},${box.label || ''}`;
      rows.push(row);
    });

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, 'ocr-result.csv');
  }

  private async exportPNG(): Promise<void> {
    if (!this.data.imageData) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.data.imageData.width;
    canvas.height = this.data.imageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Draw image
    ctx.putImageData(this.data.imageData, 0, 0);

    // Draw bounding boxes
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#4CAF50';

    this.data.boundingBoxes.forEach(box => {
      // Draw box
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw text label
      if (box.text) {
        ctx.fillText(box.text.substring(0, 30), box.x, box.y - 5);
      }
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        this.downloadBlob(blob, 'ocr-result-overlay.png');
      }
    }, 'image/png');
  }

  private async exportPDF(): Promise<void> {
    if (!this.data.imageData) return;

    const canvas = document.createElement('canvas');
    canvas.width = this.data.imageData.width;
    canvas.height = this.data.imageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Draw image
    ctx.putImageData(this.data.imageData, 0, 0);

    // Draw bounding boxes
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#4CAF50';

    this.data.boundingBoxes.forEach(box => {
      // Draw box
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Draw text label
      if (box.text) {
        ctx.fillText(box.text.substring(0, 30), box.x, box.y - 5);
      }
    });

    // Convert canvas to image data URL
    const imageDataUrl = canvas.toDataURL('image/png');

    // Create PDF
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    // Add image to PDF
    pdf.addImage(imageDataUrl, 'PNG', 0, 0, canvas.width, canvas.height);

    // Add OCR text and metadata if available
    if (this.data.ocrResult) {
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Add text content on a new page
      pdf.addPage();
      pdf.setFontSize(12);
      pdf.text('OCR Results', 20, 20);
      
      if (this.data.ocrResult.text) {
        const textLines = pdf.splitTextToSize(this.data.ocrResult.text, pageWidth - 40);
        pdf.text(textLines, 20, 40);
      }

      // Add metadata if available
      if (this.data.ocrResult.metadata && Object.keys(this.data.ocrResult.metadata).length > 0) {
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.text('Metadata', 20, 20);
        let yPos = 40;
        Object.entries(this.data.ocrResult.metadata).forEach(([key, value]) => {
          const text = `${key}: ${JSON.stringify(value)}`;
          const lines = pdf.splitTextToSize(text, pageWidth - 40);
          pdf.text(lines, 20, yPos);
          yPos += lines.length * 7;
          if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }
    }

    // Download PDF
    pdf.save('ocr-result-overlay.pdf');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

