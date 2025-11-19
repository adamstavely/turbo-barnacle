import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { InterpolationMethod } from '../../utils/math-helpers';
import { PerspectivePoints } from '../../services/geometric-transform.service';

@Component({
  selector: 'app-warp-tools-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSliderModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSelectModule,
    MatExpansionModule,
    MatIconModule
  ],
  template: `
    <div class="warp-panel">
      <h3>Geometric Correction</h3>

      <mat-expansion-panel [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Basic Transform</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="slider-control">
          <label>Rotation: {{ rotation }}°</label>
          <mat-slider
            [min]="-180"
            [max]="180"
            [step]="1"
            [discrete]="true"
            [(ngModel)]="rotation"
            (ngModelChange)="onRotationChange($event)">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Scale X: {{ scaleX | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0.1"
            [max]="3"
            [step]="0.01"
            [discrete]="true"
            [(ngModel)]="scaleX"
            (ngModelChange)="onScaleChange()">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Scale Y: {{ scaleY | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0.1"
            [max]="3"
            [step]="0.01"
            [discrete]="true"
            [(ngModel)]="scaleY"
            (ngModelChange)="onScaleChange()">
          </mat-slider>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Interpolation</mat-label>
          <mat-select [(ngModel)]="interpolation" (ngModelChange)="onInterpolationChange($event)">
            <mat-option value="nearest">Nearest Neighbor</mat-option>
            <mat-option value="bilinear">Bilinear</mat-option>
            <mat-option value="bicubic">Bicubic</mat-option>
            <mat-option value="lanczos">Lanczos-3</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button (click)="onAutoDeskew()" class="action-button">
          Auto Deskew
        </button>
      </mat-expansion-panel>

      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>Perspective Correction</mat-panel-title>
        </mat-expansion-panel-header>

        <p class="info-text">Adjust corner points for perspective correction</p>
        <button mat-stroked-button (click)="onOpenTrapezoidal()" class="action-button">
          <mat-icon>crop_free</mat-icon>
          Open Trapezoidal Correction
        </button>
        <button mat-stroked-button (click)="onPerspectiveCorrection()" class="action-button">
          Apply Perspective Correction
        </button>
      </mat-expansion-panel>

      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>Lens Distortion</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="slider-control">
          <label>Barrel: {{ barrel | number:'1.0-2' }}</label>
          <mat-slider
            [min]="-0.5"
            [max]="0.5"
            [step]="0.01"
            [discrete]="true"
            [(ngModel)]="barrel"
            (ngModelChange)="onLensDistortionChange()">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Pincushion: {{ pincushion | number:'1.0-2' }}</label>
          <mat-slider
            [min]="-0.5"
            [max]="0.5"
            [step]="0.01"
            [discrete]="true"
            [(ngModel)]="pincushion"
            (ngModelChange)="onLensDistortionChange()">
          </mat-slider>
        </div>
      </mat-expansion-panel>

      <button mat-raised-button color="warn" (click)="onReset()" class="reset-button">
        Reset All
      </button>
    </div>
  `,
  styles: [`
    .warp-panel {
      padding: 16px;
    }

    h3 {
      margin-top: 0;
    }

    .slider-control {
      margin-bottom: 24px;
    }

    .slider-control label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
    }

    mat-slider {
      width: 100%;
    }

    .action-button {
      width: 100%;
      margin-top: 16px;
    }

    .reset-button {
      width: 100%;
      margin-top: 16px;
    }

    .info-text {
      font-size: 12px;
      color: #666;
      margin-bottom: 16px;
    }

    mat-expansion-panel {
      margin-bottom: 8px;
    }

    mat-form-field {
      width: 100%;
    }
  `]
})
export class WarpToolsPanelComponent {
  @Output() transformChange = new EventEmitter<{
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    interpolation?: InterpolationMethod;
    perspective?: PerspectivePoints;
    barrel?: number;
    pincushion?: number;
    autoDeskew?: boolean;
    openTrapezoidal?: boolean;
    reset?: boolean;
  }>();

  rotation = 0;
  scaleX = 1;
  scaleY = 1;
  interpolation: InterpolationMethod = 'bilinear';
  barrel = 0;
  pincushion = 0;

  onRotationChange(value: number): void {
    this.transformChange.emit({ rotation: value });
  }

  onScaleChange(): void {
    this.transformChange.emit({ scaleX: this.scaleX, scaleY: this.scaleY });
  }

  onInterpolationChange(value: InterpolationMethod): void {
    this.transformChange.emit({ interpolation: value });
  }

  onAutoDeskew(): void {
    this.transformChange.emit({ autoDeskew: true });
  }

  onOpenTrapezoidal(): void {
    this.transformChange.emit({ openTrapezoidal: true });
  }

  onPerspectiveCorrection(): void {
    // This would typically be handled by canvas interaction
    // For now, emit event to trigger perspective correction UI
    this.transformChange.emit({ perspective: undefined });
  }

  onLensDistortionChange(): void {
    this.transformChange.emit({ barrel: this.barrel, pincushion: this.pincushion });
  }

  onReset(): void {
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.barrel = 0;
    this.pincushion = 0;
    this.transformChange.emit({ reset: true });
  }
}

