import { Injectable } from '@angular/core';
import { ImageState } from '../models/image-state.interface';

@Injectable({
  providedIn: 'root'
})
export class UndoRedoService {
  private undoStack: ImageState[] = [];
  private redoStack: ImageState[] = [];
  private maxStackSize = 50;

  saveState(state: ImageState): void {
    // Deep clone the state
    const stateCopy = this.deepCloneState(state);
    
    this.undoStack.push(stateCopy);
    
    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo(currentState: ImageState): ImageState | null {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Save current state to redo stack
    this.redoStack.push(this.deepCloneState(currentState));

    // Pop from undo stack
    const previousState = this.undoStack.pop();
    return previousState || null;
  }

  redo(currentState: ImageState): ImageState | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Save current state to undo stack
    this.undoStack.push(this.deepCloneState(currentState));

    // Pop from redo stack
    const nextState = this.redoStack.pop();
    return nextState || null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  private deepCloneState(state: ImageState): ImageState {
    // Clone ImageData if present
    const cloneImageData = (imgData: ImageData | null): ImageData | null => {
      if (!imgData) return null;
      const cloned = new ImageData(imgData.width, imgData.height);
      cloned.data.set(imgData.data);
      return cloned;
    };

    return {
      ...state,
      originalImageData: cloneImageData(state.originalImageData),
      currentImageData: cloneImageData(state.currentImageData),
      transforms: { ...state.transforms },
      ocrResults: state.ocrResults.map(r => ({ ...r })),
      boundingBoxes: state.boundingBoxes.map(b => ({ ...b }))
    };
  }
}

