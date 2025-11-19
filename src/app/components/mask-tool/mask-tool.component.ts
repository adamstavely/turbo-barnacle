import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MaskService } from '../../services/mask.service';
import { MaskRegion } from '../../models/mask-region.interface';

@Component({
  selector: 'app-mask-tool',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <div class="mask-tool-panel">
      <div class="header">
        <h3>Secure Sandbox Mode</h3>
        <button mat-raised-button color="warn" (click)="clearAllMasks()" [disabled]="maskRegions.length === 0">
          <mat-icon>clear</mat-icon>
          Clear All
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <p class="info-text">
            Draw rectangles over sensitive data regions. Masked areas will be excluded from OCR processing.
          </p>

            <div class="mask-list">
              @if (maskRegions.length === 0) {
                <p class="empty-state">No masks defined. Click and drag on the canvas to create a mask.</p>
              } @else {
                @for (region of maskRegions; track region.id) {
                <div class="mask-item">
                  <mat-chip>
                    Mask {{ $index + 1 }}: ({{ region.x | number:'1.0-0' }}, {{ region.y | number:'1.0-0' }}) 
                    {{ region.width | number:'1.0-0' }}×{{ region.height | number:'1.0-0' }}
                  </mat-chip>
                  <button mat-icon-button (click)="removeMask(region.id)" color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            }
          </div>

          <div class="actions">
            <button mat-stroked-button (click)="toggleMaskMode()" [class.active]="isMaskMode()">
              <mat-icon>{{ isMaskMode() ? 'edit_off' : 'edit' }}</mat-icon>
              {{ isMaskMode() ? 'Exit Mask Mode' : 'Enter Mask Mode' }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .mask-tool-panel {
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

    .info-text {
      font-size: 13px;
      color: #666;
      margin-bottom: 16px;
    }

    .mask-list {
      margin-bottom: 16px;
      min-height: 60px;
    }

    .empty-state {
      text-align: center;
      color: #999;
      font-size: 12px;
      padding: 20px;
    }

    .mask-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .actions button.active {
      background: #2196F3;
      color: white;
    }
  `]
})
export class MaskToolComponent {
  @Input() maskRegions: MaskRegion[] = [];
  @Output() maskRegionAdded = new EventEmitter<MaskRegion>();
  @Output() maskRegionRemoved = new EventEmitter<string>();
  @Output() maskModeToggled = new EventEmitter<boolean>();
  @Output() clearMasks = new EventEmitter<void>();

  isMaskMode = signal(false);

  constructor(private maskService: MaskService) {}

  toggleMaskMode(): void {
    this.isMaskMode.set(!this.isMaskMode());
    this.maskModeToggled.emit(this.isMaskMode());
  }

  removeMask(id: string): void {
    this.maskService.removeMaskRegion(id);
    this.maskRegionRemoved.emit(id);
  }

  clearAllMasks(): void {
    this.maskService.clearMaskRegions();
    this.clearMasks.emit();
  }
}

