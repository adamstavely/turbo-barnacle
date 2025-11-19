import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { OcrEngineService } from '../../services/ocr-engine.service';
import { OcrEngineAdapter } from '../../adapters/ocr-engine-adapter.interface';

@Component({
  selector: 'app-engine-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSelectModule, MatFormFieldModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>OCR Engine</mat-label>
      <mat-select [ngModel]="selectedEngine()" (ngModelChange)="onEngineChange($event)">
        @for (adapter of availableAdapters(); track adapter.name) {
          <mat-option [value]="adapter.name">{{ adapter.name }}</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: [`
    mat-form-field {
      width: 100%;
    }
  `]
})
export class EngineSelectorComponent implements OnInit {
  availableAdapters = signal<OcrEngineAdapter[]>([]);
  selectedEngine = signal<string>('');

  constructor(private ocrEngineService: OcrEngineService) {
    effect(() => {
      const currentName = this.ocrEngineService.getCurrentAdapterName();
      if (currentName && currentName !== this.selectedEngine()) {
        this.selectedEngine.set(currentName);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.availableAdapters.set(this.ocrEngineService.getAvailableAdapters());
    
    // Set default to Mock if available
    const adapters = this.availableAdapters();
    if (adapters.length > 0 && !this.selectedEngine()) {
      await this.onEngineChange(adapters[0].name);
    }
  }

  async onEngineChange(engineName: string): Promise<void> {
    try {
      await this.ocrEngineService.setAdapter(engineName);
      this.selectedEngine.set(engineName);
    } catch (error) {
      console.error('Failed to set OCR engine:', error);
    }
  }
}

