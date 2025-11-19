import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { AutoCleanService, AutoCleanRecommendations } from '../../services/auto-clean.service';

@Component({
  selector: 'app-auto-clean',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  template: `
    <div class="auto-clean-panel">
      <div class="header">
        <h3>AI Auto-Clean</h3>
        <button mat-raised-button color="primary" (click)="analyze()" [disabled]="!hasImage() || isAnalyzing()">
          @if (isAnalyzing()) {
            <mat-spinner [diameter]="20"></mat-spinner>
          } @else {
            <mat-icon>auto_fix_high</mat-icon>
          }
          Analyze & Recommend
        </button>
      </div>

      @if (isAnalyzing()) {
        <div class="analyzing">
          <mat-spinner [diameter]="40"></mat-spinner>
          <p>Analyzing image...</p>
        </div>
      }

      @if (recommendations() && !isAnalyzing()) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Recommendations</mat-card-title>
            <mat-card-subtitle>
              Confidence: {{ (recommendations()!.confidence * 100) | number:'1.0-0' }}%
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="recommendations">
              @if (recommendations()!.reasoning.length > 0) {
                <div class="reasoning">
                  <h4>Analysis:</h4>
                  <ul>
                    @for (reason of recommendations()!.reasoning; track reason) {
                      <li>{{ reason }}</li>
                    }
                  </ul>
                </div>
              }

              <div class="actions">
                <button mat-raised-button color="primary" (click)="applyRecommendations()">
                  <mat-icon>check</mat-icon>
                  Apply All Recommendations
                </button>
                <button mat-stroked-button (click)="previewRecommendations()">
                  <mat-icon>preview</mat-icon>
                  Preview
                </button>
              </div>

              <mat-expansion-panel>
                <mat-expansion-panel-header>
                  <mat-panel-title>Recommended Settings</mat-panel-title>
                </mat-expansion-panel-header>
                <div class="settings-list">
                  @if (recommendations()!.brightness !== undefined) {
                    <mat-chip>Brightness: {{ recommendations()!.brightness | number:'1.0-2' }}</mat-chip>
                  }
                  @if (recommendations()!.contrast !== undefined) {
                    <mat-chip>Contrast: {{ recommendations()!.contrast | number:'1.0-2' }}</mat-chip>
                  }
                  @if (recommendations()!.sharpen !== undefined) {
                    <mat-chip>Sharpen: {{ recommendations()!.sharpen | number:'1.0-2' }}</mat-chip>
                  }
                  @if (recommendations()!.denoise !== undefined) {
                    <mat-chip>Denoise: {{ recommendations()!.denoise | number:'1.0-2' }}</mat-chip>
                  }
                  @if (recommendations()!.binarization) {
                    <mat-chip>Binarization: {{ recommendations()!.binarizationMethod || 'otsu' }}</mat-chip>
                  }
                  @if (recommendations()!.autoDeskew) {
                    <mat-chip>Auto Deskew</mat-chip>
                  }
                  @if (recommendations()!.removeShadows) {
                    <mat-chip>Remove Shadows</mat-chip>
                  }
                  @if (recommendations()!.removeGlare) {
                    <mat-chip>Remove Glare</mat-chip>
                  }
                  @if (recommendations()!.whitenBackground) {
                    <mat-chip>Whiten Background</mat-chip>
                  }
                  @if (recommendations()!.clahe) {
                    <mat-chip>CLAHE</mat-chip>
                  }
                </div>
              </mat-expansion-panel>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .auto-clean-panel {
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

    .analyzing {
      text-align: center;
      padding: 40px;
    }

    .recommendations {
      padding: 8px;
    }

    .reasoning {
      margin-bottom: 16px;
    }

    .reasoning h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .reasoning ul {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: #666;
    }

    .reasoning li {
      margin-bottom: 4px;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .settings-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px;
    }

    mat-spinner {
      margin-right: 8px;
    }
  `]
})
export class AutoCleanComponent {
  @Input() imageData: ImageData | null = null;
  @Output() recommendationsApplied = new EventEmitter<AutoCleanRecommendations>();

  recommendations = signal<AutoCleanRecommendations | null>(null);
  isAnalyzing = signal(false);

  constructor(private autoClean: AutoCleanService) {}

  hasImage(): boolean {
    return this.imageData !== null;
  }

  analyze(): void {
    if (!this.imageData) return;

    this.isAnalyzing.set(true);
    
    // Run analysis in a timeout to avoid blocking UI
    setTimeout(() => {
      try {
        const recs = this.autoClean.analyzeAndRecommend(this.imageData!);
        this.recommendations.set(recs);
      } catch (error) {
        console.error('Auto-clean analysis failed:', error);
        alert('Failed to analyze image. Please try again.');
      } finally {
        this.isAnalyzing.set(false);
      }
    }, 100);
  }

  applyRecommendations(): void {
    const recs = this.recommendations();
    if (recs) {
      this.recommendationsApplied.emit(recs);
    }
  }

  previewRecommendations(): void {
    // Preview would show before/after comparison
    // For now, just apply
    this.applyRecommendations();
  }
}

