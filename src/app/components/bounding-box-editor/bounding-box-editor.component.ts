import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { BoundingBox } from '../../models/bounding-box.interface';

@Component({
  selector: 'app-bounding-box-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule
  ],
  template: `
    <div class="bounding-box-editor">
      <h3>Bounding Boxes</h3>
      
      @if (selectedBox) {
        <div class="editor-form">
          <mat-form-field appearance="outline">
            <mat-label>Text</mat-label>
            <textarea matInput [(ngModel)]="selectedBox.text" (ngModelChange)="onBoxUpdate()"></textarea>
          </mat-form-field>

          <div class="coords-grid">
            <mat-form-field appearance="outline">
              <mat-label>X</mat-label>
              <input matInput type="number" [(ngModel)]="selectedBox.x" (ngModelChange)="onBoxUpdate()">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Y</mat-label>
              <input matInput type="number" [(ngModel)]="selectedBox.y" (ngModelChange)="onBoxUpdate()">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Width</mat-label>
              <input matInput type="number" [(ngModel)]="selectedBox.width" (ngModelChange)="onBoxUpdate()">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Height</mat-label>
              <input matInput type="number" [(ngModel)]="selectedBox.height" (ngModelChange)="onBoxUpdate()">
            </mat-form-field>
          </div>

          @if (selectedBox.confidence !== undefined) {
            <mat-form-field appearance="outline">
              <mat-label>Confidence</mat-label>
              <input matInput type="number" [(ngModel)]="selectedBox.confidence" (ngModelChange)="onBoxUpdate()" step="0.01" min="0" max="1">
            </mat-form-field>
          }

          <mat-form-field appearance="outline">
            <mat-label>Label</mat-label>
            <input matInput [(ngModel)]="selectedBox.label" (ngModelChange)="onBoxUpdate()">
          </mat-form-field>

          <button mat-raised-button color="warn" (click)="onDeleteBox()">
            <mat-icon>delete</mat-icon>
            Delete Box
          </button>
        </div>
      }

      <mat-list>
        @for (box of boundingBoxes; track box.id) {
          <mat-list-item 
            [class.selected]="box.id === selectedBoxId"
            (click)="onSelectBox(box.id)">
            <div class="box-item">
              <div class="box-text">{{ box.text || 'No text' }}</div>
              <div class="box-coords">({{ box.x }}, {{ box.y }}) {{ box.width }}×{{ box.height }}</div>
            </div>
          </mat-list-item>
        }
      </mat-list>
    </div>
  `,
  styles: [`
    .bounding-box-editor {
      padding: 16px;
    }

    h3 {
      margin-top: 0;
    }

    .editor-form {
      margin-bottom: 16px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .coords-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 16px 0;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 8px;
    }

    mat-list-item {
      cursor: pointer;
    }

    mat-list-item.selected {
      background: #e3f2fd;
    }

    .box-item {
      width: 100%;
    }

    .box-text {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .box-coords {
      font-size: 12px;
      color: #666;
    }
  `]
})
export class BoundingBoxEditorComponent {
  @Input() boundingBoxes: BoundingBox[] = [];
  @Input() selectedBoxId: string | null = null;

  @Output() boxSelected = new EventEmitter<string>();
  @Output() boxUpdated = new EventEmitter<BoundingBox>();
  @Output() boxDeleted = new EventEmitter<string>();

  get selectedBox(): BoundingBox | null {
    return this.boundingBoxes.find(b => b.id === this.selectedBoxId) || null;
  }

  onSelectBox(boxId: string): void {
    this.boxSelected.emit(boxId);
  }

  onBoxUpdate(): void {
    if (this.selectedBox) {
      this.boxUpdated.emit({ ...this.selectedBox });
    }
  }

  onDeleteBox(): void {
    if (this.selectedBoxId) {
      this.boxDeleted.emit(this.selectedBoxId);
    }
  }
}

