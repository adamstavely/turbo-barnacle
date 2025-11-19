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

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Color Channel</mat-label>
          <mat-select [(ngModel)]="colorChannel" (ngModelChange)="onColorChannelChange($event)">
            <mat-option value="null">Full Color</mat-option>
            <mat-optgroup label="RGB">
              <mat-option value="red">Red</mat-option>
              <mat-option value="green">Green</mat-option>
              <mat-option value="blue">Blue</mat-option>
            </mat-optgroup>
            <mat-optgroup label="HSV">
              <mat-option value="hue">Hue</mat-option>
              <mat-option value="saturation">Saturation</mat-option>
              <mat-option value="value">Value</mat-option>
            </mat-optgroup>
            <mat-optgroup label="Lab">
              <mat-option value="lightness">Lightness</mat-option>
              <mat-option value="a-channel">A-Channel</mat-option>
              <mat-option value="b-channel">B-Channel</mat-option>
            </mat-optgroup>
          </mat-select>
        </mat-form-field>
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

        <div class="slider-control">
          <label>Moiré Removal: {{ moireIntensity | number:'1.0-0' }}%</label>
          <mat-slider
            [min]="0"
            [max]="100"
            [step]="1"
            [discrete]="true"
            [showTickMarks]="true"
            [(ngModel)]="moireIntensity"
            (ngModelChange)="onMoireIntensityChange($event)">
          </mat-slider>
        </div>
      </mat-expansion-panel>

          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>Super Resolution</mat-panel-title>
            </mat-expansion-panel-header>

            <p class="info-text">Upscale image for better OCR accuracy</p>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Method</mat-label>
              <mat-select [(ngModel)]="superResolutionMethod" (ngModelChange)="onSuperResolutionMethodChange($event)">
                <mat-option value="bicubic">Bicubic (Fast)</mat-option>
                <mat-option value="esrgan">ESRGAN (Quality)</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="slider-control">
              <label>Scale Factor: {{ superResolutionScale | number:'1.0-1' }}x</label>
              <mat-slider
                [min]="1"
                [max]="4"
                [step]="0.5"
                [discrete]="true"
                [(ngModel)]="superResolutionScale"
                (ngModelChange)="onSuperResolutionChange($event)">
              </mat-slider>
            </div>
            <button mat-stroked-button (click)="onApplySuperResolution()" class="action-button">
              <mat-icon>zoom_in</mat-icon>
              Apply Super Resolution
            </button>
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

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Highlight Removal</mat-label>
          <mat-select [(ngModel)]="highlightRemoval" (ngModelChange)="onHighlightRemovalChange($event)">
            <mat-option value="null">None</mat-option>
            <mat-option value="soft">Soft Clean</mat-option>
            <mat-option value="medium">Medium Clean</mat-option>
            <mat-option value="aggressive">Aggressive Clean</mat-option>
          </mat-select>
        </mat-form-field>

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

    .full-width {
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
        superResolution?: number;
        superResolutionMethod?: 'bicubic' | 'esrgan';
        moireIntensity?: number;
        colorChannel?: 'red' | 'green' | 'blue' | 'hue' | 'saturation' | 'value' | 'lightness' | 'a-channel' | 'b-channel' | null;
        highlightRemoval?: 'soft' | 'medium' | 'aggressive' | null;
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
      superResolutionScale = 2;
      superResolutionMethod: 'bicubic' | 'esrgan' = 'bicubic';
      moireIntensity = 0;
      colorChannel: 'red' | 'green' | 'blue' | 'hue' | 'saturation' | 'value' | 'lightness' | 'a-channel' | 'b-channel' | null = null;
      highlightRemoval: 'soft' | 'medium' | 'aggressive' | null = null;

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

      onSuperResolutionChange(value: number): void {
        this.superResolutionScale = value;
      }

      onSuperResolutionMethodChange(value: 'bicubic' | 'esrgan'): void {
        this.superResolutionMethod = value;
      }

      onApplySuperResolution(): void {
        this.transformChange.emit({ 
          superResolution: this.superResolutionScale,
          superResolutionMethod: this.superResolutionMethod
        });
      }

      onMoireIntensityChange(value: number): void {
        this.transformChange.emit({ moireIntensity: value });
      }

      onColorChannelChange(value: string): void {
        const channelValue = value === 'null' || value === null ? null : value as 'red' | 'green' | 'blue' | 'hue' | 'saturation' | 'value' | 'lightness' | 'a-channel' | 'b-channel';
        this.colorChannel = channelValue;
        this.transformChange.emit({ colorChannel: channelValue });
      }

      onHighlightRemovalChange(value: string): void {
        const removalValue = value === 'null' || value === null ? null : value as 'soft' | 'medium' | 'aggressive';
        this.highlightRemoval = removalValue;
        this.transformChange.emit({ highlightRemoval: removalValue });
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
        this.superResolutionScale = 2;
        this.superResolutionMethod = 'bicubic';
        this.moireIntensity = 0;
        this.colorChannel = null;
        this.highlightRemoval = null;
        this.transformChange.emit({ reset: true });
  }
}

