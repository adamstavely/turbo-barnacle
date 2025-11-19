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
    selectedBoxId: null,
    splitViewEnabled: false
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

  mergeBoundingBoxes(boxIds: string[]): void {
    this.state.update(current => {
      const boxesToMerge = current.boundingBoxes.filter(box => boxIds.includes(box.id));
      if (boxesToMerge.length < 2) return current;

      // Calculate merged box bounds
      const minX = Math.min(...boxesToMerge.map(b => b.x));
      const minY = Math.min(...boxesToMerge.map(b => b.y));
      const maxX = Math.max(...boxesToMerge.map(b => b.x + b.width));
      const maxY = Math.max(...boxesToMerge.map(b => b.y + b.height));

      // Combine text
      const combinedText = boxesToMerge
        .map(b => b.text)
        .filter(t => t && t.trim())
        .join(' ');

      // Average confidence
      const avgConfidence = boxesToMerge
        .map(b => b.confidence || 0)
        .reduce((a, b) => a + b, 0) / boxesToMerge.length;

      const mergedBox: BoundingBox = {
        id: `merged-${Date.now()}`,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        text: combinedText,
        confidence: avgConfidence,
        label: boxesToMerge.find(b => b.label)?.label
      };

      return {
        ...current,
        boundingBoxes: [
          ...current.boundingBoxes.filter(box => !boxIds.includes(box.id)),
          mergedBox
        ],
        selectedBoxId: mergedBox.id
      };
    });
  }

  splitBoundingBox(boxId: string, direction: 'horizontal' | 'vertical'): void {
    this.state.update(current => {
      const box = current.boundingBoxes.find(b => b.id === boxId);
      if (!box) return current;

      let box1: BoundingBox;
      let box2: BoundingBox;

      if (direction === 'horizontal') {
        // Split horizontally (left/right)
        const midX = box.x + box.width / 2;
        box1 = {
          id: `${boxId}-split-1`,
          x: box.x,
          y: box.y,
          width: box.width / 2,
          height: box.height,
          text: box.text.substring(0, Math.floor(box.text.length / 2)),
          confidence: box.confidence,
          label: box.label ? `${box.label}-1` : undefined
        };
        box2 = {
          id: `${boxId}-split-2`,
          x: midX,
          y: box.y,
          width: box.width / 2,
          height: box.height,
          text: box.text.substring(Math.floor(box.text.length / 2)),
          confidence: box.confidence,
          label: box.label ? `${box.label}-2` : undefined
        };
      } else {
        // Split vertically (top/bottom)
        const midY = box.y + box.height / 2;
        box1 = {
          id: `${boxId}-split-1`,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height / 2,
          text: box.text.substring(0, Math.floor(box.text.length / 2)),
          confidence: box.confidence,
          label: box.label ? `${box.label}-1` : undefined
        };
        box2 = {
          id: `${boxId}-split-2`,
          x: box.x,
          y: midY,
          width: box.width,
          height: box.height / 2,
          text: box.text.substring(Math.floor(box.text.length / 2)),
          confidence: box.confidence,
          label: box.label ? `${box.label}-2` : undefined
        };
      }

      return {
        ...current,
        boundingBoxes: [
          ...current.boundingBoxes.filter(b => b.id !== boxId),
          box1,
          box2
        ],
        selectedBoxId: box1.id
      };
    });
  }

  clearState(): void {
    this.state.set(this.initialState);
  }

  setState(newState: ImageState): void {
    this.state.set(newState);
  }
}

