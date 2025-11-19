import { Injectable, signal } from '@angular/core';
import { ImageState } from '../models/image-state.interface';
import { BoundingBox } from '../models/bounding-box.interface';
import { OcrResult } from '../models/ocr-result.interface';

@Injectable({
  providedIn: 'root'
})
export class StateStoreService {
  private initialState: ImageState = {
    originalImageData: null,
    currentImageData: null,
    imageUrl: null,
    fileName: null,
    fileType: null,
    width: 0,
    height: 0,
    transforms: {},
    ocrResults: [],
    boundingBoxes: [],
    selectedBoxId: null
  };

  private state = signal<ImageState>(this.initialState);

  getState() {
    return this.state.asReadonly();
  }

  updateState(updates: Partial<ImageState>): void {
    this.state.update(current => ({ ...current, ...updates }));
  }

  setImage(imageUrl: string, fileName: string, fileType: string, width: number, height: number, imageData: ImageData): void {
    this.state.set({
      ...this.initialState,
      imageUrl,
      fileName,
      fileType,
      width,
      height,
      originalImageData: imageData,
      currentImageData: imageData
    });
  }

  updateImageData(imageData: ImageData): void {
    this.state.update(current => ({
      ...current,
      currentImageData: imageData
    }));
  }

  updateTransforms(transforms: Partial<ImageState['transforms']>): void {
    this.state.update(current => ({
      ...current,
      transforms: { ...current.transforms, ...transforms }
    }));
  }

  addOcrResult(result: OcrResult): void {
    this.state.update(current => ({
      ...current,
      ocrResults: [...current.ocrResults, result],
      boundingBoxes: result.boundingBoxes
    }));
  }

  updateBoundingBox(boxId: string, updates: Partial<BoundingBox>): void {
    this.state.update(current => ({
      ...current,
      boundingBoxes: current.boundingBoxes.map(box =>
        box.id === boxId ? { ...box, ...updates } : box
      )
    }));
  }

  addBoundingBox(box: BoundingBox): void {
    this.state.update(current => ({
      ...current,
      boundingBoxes: [...current.boundingBoxes, box]
    }));
  }

  removeBoundingBox(boxId: string): void {
    this.state.update(current => ({
      ...current,
      boundingBoxes: current.boundingBoxes.filter(box => box.id !== boxId),
      selectedBoxId: current.selectedBoxId === boxId ? null : current.selectedBoxId
    }));
  }

  setSelectedBox(boxId: string | null): void {
    this.state.update(current => ({
      ...current,
      selectedBoxId: boxId
    }));
  }

  clearState(): void {
    this.state.set(this.initialState);
  }
}

