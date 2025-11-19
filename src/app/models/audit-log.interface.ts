export interface AuditLogEntry {
  id?: number;
  timestamp: number;
  userId?: string;
  action: 'ocr' | 'preprocessing' | 'bounding_box_edit' | 'export' | 'mask' | 'other';
  engine?: string;
  preprocessingSteps?: string[];
  boundingBoxEdits?: Array<{ boxId: string; change: string }>;
  exportAction?: { type: string; format: string };
  maskRegions?: number;
  metadata?: Record<string, any>;
}

export interface AuditLogPlugin {
  name: string;
  onLogEntry(entry: AuditLogEntry): void;
}

