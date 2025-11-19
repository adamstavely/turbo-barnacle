import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EngineSelectorComponent } from '../engine-selector/engine-selector.component';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EngineSelectorComponent
  ],
  template: `
    <mat-toolbar color="primary">
      <span class="toolbar-title">OCR Micro-Application</span>
      <span class="spacer"></span>
      
      <app-engine-selector></app-engine-selector>
      
      <button mat-icon-button (click)="onRunOcr()" [disabled]="!canRunOcr || isProcessing">
        <mat-icon>text_fields</mat-icon>
      </button>
      
      @if (isProcessing) {
        <mat-spinner diameter="24"></mat-spinner>
      }
      
      <button mat-icon-button (click)="onUndo()" [disabled]="!canUndo">
        <mat-icon>undo</mat-icon>
      </button>
      
      <button mat-icon-button (click)="onRedo()" [disabled]="!canRedo">
        <mat-icon>redo</mat-icon>
      </button>
      
      <button mat-icon-button (click)="onClear()" [disabled]="!canClear">
        <mat-icon>clear</mat-icon>
      </button>
    </mat-toolbar>
  `,
  styles: [`
    mat-toolbar {
      display: flex;
      align-items: center;
    }

    .toolbar-title {
      margin-right: 16px;
      font-weight: 500;
    }

    .spacer {
      flex: 1 1 auto;
    }

    app-engine-selector {
      margin-right: 16px;
      min-width: 200px;
    }

    mat-spinner {
      margin: 0 8px;
    }
  `]
})
export class ToolbarComponent {
  @Input() canRunOcr = false;
  @Input() isProcessing = false;
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() canClear = false;

  @Output() runOcr = new EventEmitter<void>();
  @Output() undo = new EventEmitter<void>();
  @Output() redo = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  onRunOcr(): void {
    this.runOcr.emit();
  }

  onUndo(): void {
    this.undo.emit();
  }

  onRedo(): void {
    this.redo.emit();
  }

  onClear(): void {
    this.clear.emit();
  }
}

