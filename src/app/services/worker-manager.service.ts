import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WorkerManagerService {
  private filterWorker: Worker | null = null;
  private deskewWorker: Worker | null = null;
  private warpWorker: Worker | null = null;

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
  }
}

