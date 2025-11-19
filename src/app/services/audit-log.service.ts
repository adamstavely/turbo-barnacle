import { Injectable } from '@angular/core';
import { AuditLogEntry, AuditLogPlugin } from '../models/audit-log.interface';

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private dbName = 'ocr-audit-log';
  private dbVersion = 1;
  private storeName = 'logs';
  private db: IDBDatabase | null = null;
  private plugins: AuditLogPlugin[] = [];

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('action', 'action', { unique: false });
        }
      };
    });
  }

  async logEntry(entry: AuditLogEntry): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now()
    };

    // Store in IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.add(logEntry);
    }

    // Notify plugins
    this.plugins.forEach(plugin => {
      try {
        plugin.onLogEntry(logEntry);
      } catch (error) {
        console.error(`Error in audit log plugin ${plugin.name}:`, error);
      }
    });
  }

  async getLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Reverse order (newest first)
      const logs: AuditLogEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && logs.length < limit) {
          logs.push(cursor.value);
          cursor.continue();
        } else {
          resolve(logs);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearLogs(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.clear();
    }
  }

  registerPlugin(plugin: AuditLogPlugin): void {
    this.plugins.push(plugin);
  }

  unregisterPlugin(name: string): void {
    this.plugins = this.plugins.filter(p => p.name !== name);
  }

  // Helper methods for common log types
  async logOcrOperation(engine: string, options?: any): Promise<void> {
    await this.logEntry({
      action: 'ocr',
      engine,
      metadata: options
    });
  }

  async logPreprocessing(steps: string[]): Promise<void> {
    await this.logEntry({
      action: 'preprocessing',
      preprocessingSteps: steps
    });
  }

  async logBoundingBoxEdit(boxId: string, change: string): Promise<void> {
    await this.logEntry({
      action: 'bounding_box_edit',
      boundingBoxEdits: [{ boxId, change }]
    });
  }

  async logExport(type: string, format: string): Promise<void> {
    await this.logEntry({
      action: 'export',
      exportAction: { type, format }
    });
  }

  async logMaskOperation(regionCount: number): Promise<void> {
    await this.logEntry({
      action: 'mask',
      maskRegions: regionCount
    });
  }
}

