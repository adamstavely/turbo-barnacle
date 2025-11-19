import { Signature } from '../models/signature.interface';

export interface SignatureDetectionAdapter {
  name: string;
  detectSignatures(imageData: ImageData): Promise<Signature[]>;
  initialize?(): Promise<void>;
}

