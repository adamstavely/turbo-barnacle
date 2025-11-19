import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
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
    MatListModule,
    MatCheckboxModule,
    MatMenuModule
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

          <div class="action-buttons">
            <button mat-stroked-button (click)="onSplitBox('horizontal')" [disabled]="!canSplit">
              <mat-icon>call_split</mat-icon>
              Split Horizontal
            </button>
            <button mat-stroked-button (click)="onSplitBox('vertical')" [disabled]="!canSplit">
              <mat-icon>call_split</mat-icon>
              Split Vertical
            </button>
            <button mat-raised-button color="warn" (click)="onDeleteBox()">
              <mat-icon>delete</mat-icon>
              Delete Box
            </button>
          </div>
        </div>
      }

      @if (boundingBoxes.length > 0) {
        <div class="multi-select-actions">
          <button mat-stroked-button (click)="onMergeBoxes()" [disabled]="!canMerge">
            <mat-icon>merge_type</mat-icon>
            Merge Selected ({{ selectedBoxIds.size }})
          </button>
          @if (selectedBoxIds.size > 0) {
            <button mat-button (click)="clearSelection()">
              Clear Selection
            </button>
          }
        </div>
      }

      <mat-list>
        @for (box of boundingBoxes; track box.id) {
          <mat-list-item 
            [class.selected]="box.id === selectedBoxId"
            [class.multi-selected]="selectedBoxIds.has(box.id)">
            <mat-checkbox 
              [checked]="selectedBoxIds.has(box.id)"
              (change)="onToggleSelection(box.id, $event.checked)"
              (click)="$event.stopPropagation()">
            </mat-checkbox>
            <div class="box-item" (click)="onSelectBox(box.id)">
              <div class="box-text">{{ box.text || 'No text' }}</div>
              <div class="box-coords">({{ box.x }}, {{ box.y }}) {{ box.width }}×{{ box.height }}</div>
              @if (box.label) {
                <div class="box-label">Label: {{ box.label }}</div>
              }
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

    mat-list-item.multi-selected {
      background: #fff3e0;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .action-buttons button {
      width: 100%;
    }

    .multi-select-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .box-item {
      flex: 1;
      cursor: pointer;
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
  @Output() boxesMerged = new EventEmitter<string[]>();
  @Output() boxSplit = new EventEmitter<{ boxId: string; direction: 'horizontal' | 'vertical' }>();

  selectedBoxIds = new Set<string>();

  get selectedBox(): BoundingBox | null {
    return this.boundingBoxes.find(b => b.id === this.selectedBoxId) || null;
  }

  get canMerge(): boolean {
    return this.selectedBoxIds.size >= 2;
  }

  get canSplit(): boolean {
    return this.selectedBoxId !== null;
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

  onToggleSelection(boxId: string, checked: boolean): void {
    if (checked) {
      this.selectedBoxIds.add(boxId);
    } else {
      this.selectedBoxIds.delete(boxId);
    }
  }

  clearSelection(): void {
    this.selectedBoxIds.clear();
  }

  onMergeBoxes(): void {
    if (this.selectedBoxIds.size >= 2) {
      this.boxesMerged.emit(Array.from(this.selectedBoxIds));
      this.selectedBoxIds.clear();
    }
  }

  onSplitBox(direction: 'horizontal' | 'vertical'): void {
    if (this.selectedBoxId) {
      this.boxSplit.emit({ boxId: this.selectedBoxId, direction });
    }
  }
}

