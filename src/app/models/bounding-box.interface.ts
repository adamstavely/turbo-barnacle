export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence?: number;
  label?: string;
}

export interface BoundingBoxEditEvent {
  boxId: string;
  changes: Partial<BoundingBox>;
}

