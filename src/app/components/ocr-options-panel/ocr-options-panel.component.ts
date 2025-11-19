import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OcrOptions } from '../../models/ocr-options.interface';

@Component({
  selector: 'app-ocr-options-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="ocr-options-panel">
      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>OCR Options</mat-panel-title>
        </mat-expansion-panel-header>

        <mat-form-field appearance="outline">
          <mat-label>Language</mat-label>
          <mat-select [(ngModel)]="selectedLanguage" (ngModelChange)="onOptionsChange()">
            <mat-option value="">Auto-detect</mat-option>
            @for (lang of languages; track lang.code) {
              <mat-option [value]="lang.code">{{ lang.name }} ({{ lang.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>PSM Mode (Page Segmentation)</mat-label>
          <mat-select [(ngModel)]="psmMode" (ngModelChange)="onOptionsChange()">
            @for (psm of psmModes; track psm.value) {
              <mat-option [value]="psm.value">{{ psm.value }} - {{ psm.description }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>OEM Mode (OCR Engine Mode)</mat-label>
          <mat-select [(ngModel)]="oemMode" (ngModelChange)="onOptionsChange()">
            @for (oem of oemModes; track oem.value) {
              <mat-option [value]="oem.value">{{ oem.value }} - {{ oem.description }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Custom Parameters (JSON)</mat-label>
          <textarea matInput 
                    [(ngModel)]="customParamsText" 
                    (ngModelChange)="onCustomParamsChange()"
                    placeholder='{"key": "value"}'
                    rows="3"></textarea>
          <mat-hint>Optional JSON object for custom parameters</mat-hint>
        </mat-form-field>

        <button mat-stroked-button (click)="onReset()" class="reset-button">
          <mat-icon>refresh</mat-icon>
          Reset to Defaults
        </button>
      </mat-expansion-panel>
    </div>
  `,
  styles: [`
    .ocr-options-panel {
      padding: 16px;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .reset-button {
      width: 100%;
      margin-top: 8px;
    }

    mat-expansion-panel {
      margin-bottom: 8px;
    }
  `]
})
export class OcrOptionsPanelComponent {
  @Output() optionsChange = new EventEmitter<OcrOptions>();

  selectedLanguage = signal<string>('');
  psmMode = signal<number | undefined>(undefined);
  oemMode = signal<number | undefined>(undefined);
  customParamsText = signal<string>('');
  customParams = signal<Record<string, any>>({});

  languages = [
    { code: 'eng', name: 'English' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
    { code: 'deu', name: 'German' },
    { code: 'ita', name: 'Italian' },
    { code: 'por', name: 'Portuguese' },
    { code: 'rus', name: 'Russian' },
    { code: 'chi_sim', name: 'Chinese (Simplified)' },
    { code: 'chi_tra', name: 'Chinese (Traditional)' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'kor', name: 'Korean' },
    { code: 'ara', name: 'Arabic' },
    { code: 'hin', name: 'Hindi' },
    { code: 'nld', name: 'Dutch' },
    { code: 'pol', name: 'Polish' },
    { code: 'tur', name: 'Turkish' },
    { code: 'swe', name: 'Swedish' },
    { code: 'nor', name: 'Norwegian' },
    { code: 'dan', name: 'Danish' },
    { code: 'fin', name: 'Finnish' }
  ];

  psmModes = [
    { value: 0, description: 'Orientation and script detection (OSD) only' },
    { value: 1, description: 'Automatic page segmentation with OSD' },
    { value: 2, description: 'Automatic page segmentation, but no OSD, or OCR' },
    { value: 3, description: 'Fully automatic page segmentation, but no OSD (Default)' },
    { value: 4, description: 'Assume a single column of text of variable sizes' },
    { value: 5, description: 'Assume a single uniform block of vertically aligned text' },
    { value: 6, description: 'Assume a single uniform block of text' },
    { value: 7, description: 'Treat the image as a single text line' },
    { value: 8, description: 'Treat the image as a single word' },
    { value: 9, description: 'Treat the image as a single word in a circle' },
    { value: 10, description: 'Treat the image as a single character' },
    { value: 11, description: 'Sparse text. Find as much text as possible in no particular order' },
    { value: 12, description: 'Sparse text with OSD' },
    { value: 13, description: 'Raw line. Treat the image as a single text line' }
  ];

  oemModes = [
    { value: 0, description: 'Legacy engine only' },
    { value: 1, description: 'Neural nets LSTM engine only' },
    { value: 2, description: 'Legacy + LSTM engines' },
    { value: 3, description: 'Default, based on what is available' }
  ];

  onOptionsChange(): void {
    const options: OcrOptions = {
      language: this.selectedLanguage() || undefined,
      psm: this.psmMode(),
      oem: this.oemMode(),
      customParams: Object.keys(this.customParams()).length > 0 ? this.customParams() : undefined
    };
    this.optionsChange.emit(options);
  }

  onCustomParamsChange(): void {
    try {
      const text = this.customParamsText();
      if (text.trim()) {
        const parsed = JSON.parse(text);
        this.customParams.set(parsed);
      } else {
        this.customParams.set({});
      }
    } catch (error) {
      // Invalid JSON, ignore for now
      this.customParams.set({});
    }
    this.onOptionsChange();
  }

  onReset(): void {
    this.selectedLanguage.set('');
    this.psmMode.set(undefined);
    this.oemMode.set(undefined);
    this.customParamsText.set('');
    this.customParams.set({});
    this.onOptionsChange();
  }

  getCurrentOptions(): OcrOptions {
    return {
      language: this.selectedLanguage() || undefined,
      psm: this.psmMode(),
      oem: this.oemMode(),
      customParams: Object.keys(this.customParams()).length > 0 ? this.customParams() : undefined
    };
  }
}

