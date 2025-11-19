import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-enhancement-tools-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSliderModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatSelectModule
  ],
  template: `
    <div class="enhancement-panel">
      <h3>Image Enhancement</h3>
      
      <mat-expansion-panel [expanded]="true">
        <mat-expansion-panel-header>
          <mat-panel-title>Lighting & Color</mat-panel-title>
        </mat-expansion-panel-header>
        
        <div class="slider-control">
          <label>Brightness: {{ brightness | number:'1.0-2' }}</label>
          <mat-slider
            [min]="-1"
            [max]="1"
            [step]="0.01"
            [discrete]="true"
            [showTickMarks]="true"
            [(ngModel)]="brightness"
            (ngModelChange)="onBrightnessChange($event)">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Contrast: {{ contrast | number:'1.0-2' }}</label>
          <mat-slider
            [min]="-1"
            [max]="1"
            [step]="0.01"
            [discrete]="true"
            [showTickMarks]="true"
            [(ngModel)]="contrast"
            (ngModelChange)="onContrastChange($event)">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Saturation: {{ saturation | number:'1.0-2' }}</label>
          <mat-slider
            [min]="-1"
            [max]="1"
            [step]="0.01"
            [discrete]="true"
            [showTickMarks]="true"
            [(ngModel)]="saturation"
            (ngModelChange)="onSaturationChange($event)">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Gamma: {{ gamma | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0.1"
            [max]="3"
            [step]="0.1"
            [discrete]="true"
            [showTickMarks]="true"
            [(ngModel)]="gamma"
            (ngModelChange)="onGammaChange($event)">
          </mat-slider>
        </div>

        <button mat-stroked-button (click)="onAutoLighting()" class="action-button">
          <mat-icon>auto_fix_high</mat-icon>
          Auto Lighting
        </button>
      </mat-expansion-panel>

      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>Filters & Clarity</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="slider-control">
          <label>Sharpen: {{ sharpen | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0"
            [max]="1"
            [step]="0.01"
            [discrete]="true"
            [(ngModel)]="sharpen"
            (ngModelChange)="onSharpenChange($event)">
          </mat-slider>
        </div>

        <div class="slider-control">
          <label>Denoise (Gaussian): {{ denoise | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0"
            [max]="5"
            [step]="0.1"
            [discrete]="true"
            [(ngModel)]="denoise"
            (ngModelChange)="onDenoiseChange($event)">
          </mat-slider>
        </div>

        <mat-checkbox [(ngModel)]="binarization" (ngModelChange)="onBinarizationChange($event)">
          Binarization (Otsu)
        </mat-checkbox>

        <mat-form-field appearance="outline">
          <mat-label>Binarization Method</mat-label>
          <mat-select [(ngModel)]="binarizationMethod" (ngModelChange)="onBinarizationMethodChange($event)">
            <mat-option value="otsu">Otsu</mat-option>
            <mat-option value="niblack">Niblack</mat-option>
            <mat-option value="sauvola">Sauvola</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="slider-control">
          <label>Edge Enhancement: {{ edgeEnhancement | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0"
            [max]="2"
            [step]="0.1"
            [discrete]="true"
            [(ngModel)]="edgeEnhancement"
            (ngModelChange)="onEdgeEnhancementChange($event)">
          </mat-slider>
        </div>
      </mat-expansion-panel>

      <mat-expansion-panel>
        <mat-expansion-panel-header>
          <mat-panel-title>Advanced Enhancement</mat-panel-title>
        </mat-expansion-panel-header>

        <button mat-stroked-button (click)="onCLAHE()" class="action-button">
          <mat-icon>auto_fix_high</mat-icon>
          Apply CLAHE
        </button>

        <button mat-stroked-button (click)="onRemoveShadows()" class="action-button">
          <mat-icon>light_mode</mat-icon>
          Remove Shadows
        </button>

        <button mat-stroked-button (click)="onRemoveGlare()" class="action-button">
          <mat-icon>highlight</mat-icon>
          Remove Glare
        </button>

        <button mat-stroked-button (click)="onWhitenBackground()" class="action-button">
          <mat-icon>format_color_fill</mat-icon>
          Whiten Background
        </button>

        <div class="slider-control">
          <label>Bilateral Denoise: {{ bilateralDenoise | number:'1.0-2' }}</label>
          <mat-slider
            [min]="0"
            [max]="10"
            [step]="0.5"
            [discrete]="true"
            [(ngModel)]="bilateralDenoise"
            (ngModelChange)="onBilateralDenoiseChange($event)">
          </mat-slider>
        </div>
      </mat-expansion-panel>

      <button mat-raised-button color="warn" (click)="onReset()" class="reset-button">
        <mat-icon>refresh</mat-icon>
        Reset All
      </button>
    </div>
  `,
  styles: [`
    .enhancement-panel {
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

    mat-expansion-panel {
      margin-bottom: 8px;
    }
  `]
})
export class EnhancementToolsPanelComponent {
  @Output() transformChange = new EventEmitter<{
    brightness?: number;
    contrast?: number;
    saturation?: number;
    gamma?: number;
    sharpen?: number;
    denoise?: number;
    binarization?: boolean;
    binarizationMethod?: 'otsu' | 'niblack' | 'sauvola';
    edgeEnhancement?: number;
    clahe?: boolean;
    removeShadows?: boolean;
    removeGlare?: boolean;
    whitenBackground?: boolean;
    bilateralDenoise?: number;
    autoLighting?: boolean;
    reset?: boolean;
  }>();

  brightness = 0;
  contrast = 0;
  saturation = 0;
  gamma = 1;
  sharpen = 0;
  denoise = 0;
  binarization = false;
  binarizationMethod: 'otsu' | 'niblack' | 'sauvola' = 'otsu';
  edgeEnhancement = 0;
  bilateralDenoise = 0;

  onBrightnessChange(value: number): void {
    this.transformChange.emit({ brightness: value });
  }

  onContrastChange(value: number): void {
    this.transformChange.emit({ contrast: value });
  }

  onSaturationChange(value: number): void {
    this.transformChange.emit({ saturation: value });
  }

  onGammaChange(value: number): void {
    this.transformChange.emit({ gamma: value });
  }

  onSharpenChange(value: number): void {
    this.transformChange.emit({ sharpen: value });
  }

  onDenoiseChange(value: number): void {
    this.transformChange.emit({ denoise: value });
  }

  onBinarizationChange(value: boolean): void {
    this.transformChange.emit({ binarization: value });
  }

  onAutoLighting(): void {
    this.transformChange.emit({ autoLighting: true });
  }

  onBinarizationMethodChange(value: 'otsu' | 'niblack' | 'sauvola'): void {
    this.transformChange.emit({ binarizationMethod: value });
  }

  onEdgeEnhancementChange(value: number): void {
    this.transformChange.emit({ edgeEnhancement: value });
  }

  onCLAHE(): void {
    this.transformChange.emit({ clahe: true });
  }

  onRemoveShadows(): void {
    this.transformChange.emit({ removeShadows: true });
  }

  onRemoveGlare(): void {
    this.transformChange.emit({ removeGlare: true });
  }

  onWhitenBackground(): void {
    this.transformChange.emit({ whitenBackground: true });
  }

  onBilateralDenoiseChange(value: number): void {
    this.transformChange.emit({ bilateralDenoise: value });
  }

  onReset(): void {
    this.brightness = 0;
    this.contrast = 0;
    this.saturation = 0;
    this.gamma = 1;
    this.sharpen = 0;
    this.denoise = 0;
    this.binarization = false;
    this.binarizationMethod = 'otsu';
    this.edgeEnhancement = 0;
    this.bilateralDenoise = 0;
    this.transformChange.emit({ reset: true });
  }
}

