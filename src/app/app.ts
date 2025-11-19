import { Component } from '@angular/core';
import { OcrAppRootComponent } from './components/ocr-app-root/ocr-app-root.component';

@Component({
  selector: 'app-root',
  imports: [OcrAppRootComponent],
  template: '<app-ocr-app-root></app-ocr-app-root>',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class App {
}
