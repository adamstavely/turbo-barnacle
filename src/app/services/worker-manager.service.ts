import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WorkerManagerService {
  private filterWorker: Worker | null = null;
  private deskewWorker: Worker | null = null;
  private warpWorker: Worker | null = null;
  private moireWorker: Worker | null = null;
  private highlightWorker: Worker | null = null;

  async getFilterWorker(): Promise<Worker> {
    if (!this.filterWorker) {
      this.filterWorker = new Worker(
        new URL('../workers/image-filter.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.filterWorker;
  }

  async getDeskewWorker(): Promise<Worker> {
    if (!this.deskewWorker) {
      this.deskewWorker = new Worker(
        new URL('../workers/deskew.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.deskewWorker;
  }

  async getWarpWorker(): Promise<Worker> {
    if (!this.warpWorker) {
      this.warpWorker = new Worker(
        new URL('../workers/warp.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.warpWorker;
  }

  async getMoireWorker(): Promise<Worker> {
    if (!this.moireWorker) {
      this.moireWorker = new Worker(
        new URL('../workers/moire-removal.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.moireWorker;
  }

  async getHighlightWorker(): Promise<Worker> {
    if (!this.highlightWorker) {
      this.highlightWorker = new Worker(
        new URL('../workers/highlight-removal.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.highlightWorker;
  }

  terminateAll(): void {
    if (this.filterWorker) {
      this.filterWorker.terminate();
      this.filterWorker = null;
    }
    if (this.deskewWorker) {
      this.deskewWorker.terminate();
      this.deskewWorker = null;
    }
    if (this.warpWorker) {
      this.warpWorker.terminate();
      this.warpWorker = null;
    }
    if (this.moireWorker) {
      this.moireWorker.terminate();
      this.moireWorker = null;
    }
    if (this.highlightWorker) {
      this.highlightWorker.terminate();
      this.highlightWorker = null;
    }
  }
}

