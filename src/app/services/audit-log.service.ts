import { Injectable } from '@angular/core';
import { AuditLogEntry, AuditLogPlugin } from '../models/audit-log.interface';

interface EncryptedLogEntry {
  encrypted: boolean;
  iv: Uint8Array | number[] | ArrayBuffer; // IndexedDB may serialize Uint8Array differently
  data: ArrayBuffer;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private dbName = 'ocr-audit-log';
  private dbVersion = 2; // Updated for encryption support
  private storeName = 'logs';
  private db: IDBDatabase | null = null;
  private plugins: AuditLogPlugin[] = [];
  private encryptionEnabled = false;
  private encryptionKey: CryptoKey | null = null;

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
        const oldVersion = event.oldVersion || 0;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Create new store
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('action', 'action', { unique: false });
        } else if (oldVersion < 2) {
          // Migration from version 1 to 2: no schema changes needed, just version bump
          // Existing entries will be read as unencrypted
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

    // Store in IndexedDB (encrypt if enabled)
    if (this.db) {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      if (this.encryptionEnabled && this.encryptionKey) {
        // Encrypt the entry before storing
        const encrypted = await this.encryptLogEntry(logEntry);
        await store.add(encrypted);
      } else {
        // Store unencrypted
        await store.add(logEntry);
      }
    }

    // Notify plugins (always with unencrypted entry)
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

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Reverse order (newest first)
      const logs: AuditLogEntry[] = [];

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && logs.length < limit) {
          const value = cursor.value;
          
          // Check if entry is encrypted
          if (value.encrypted && value.iv && value.data) {
            try {
              // Decrypt the entry
              const decrypted = await this.decryptLogEntry(value as EncryptedLogEntry);
              logs.push(decrypted);
            } catch (error) {
              console.error('Failed to decrypt log entry:', error);
              // Skip encrypted entries that can't be decrypted
            }
          } else {
            // Unencrypted entry
            logs.push(value as AuditLogEntry);
          }
          
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

  /**
   * Enable encryption for audit logs
   * Generates a new encryption key if one doesn't exist
   */
  async enableEncryption(): Promise<void> {
    if (!this.encryptionKey) {
      this.encryptionKey = await this.generateEncryptionKey();
    }
    this.encryptionEnabled = true;
  }

  /**
   * Disable encryption for audit logs
   * Note: This does not decrypt existing encrypted entries
   */
  disableEncryption(): void {
    this.encryptionEnabled = false;
  }

  /**
   * Check if encryption is currently enabled
   */
  isEncryptionEnabled(): boolean {
    return this.encryptionEnabled;
  }

  /**
   * Generate a new encryption key using Web Crypto API
   */
  private async generateEncryptionKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt a log entry using AES-GCM
   */
  private async encryptLogEntry(entry: AuditLogEntry): Promise<EncryptedLogEntry> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    // Serialize entry to JSON
    const json = JSON.stringify(entry);
    const encoder = new TextEncoder();
    const data = encoder.encode(json);

    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.encryptionKey,
      data
    );

    return {
      encrypted: true,
      iv: iv,
      data: encrypted
    };
  }

  /**
   * Decrypt a log entry using AES-GCM
   */
  private async decryptLogEntry(encrypted: EncryptedLogEntry): Promise<AuditLogEntry> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    try {
      // Ensure IV is a proper Uint8Array with ArrayBuffer backing
      // IndexedDB may return it in various formats, so we normalize it
      let ivArray: number[];
      if (encrypted.iv instanceof Uint8Array) {
        // Convert Uint8Array to number array
        ivArray = Array.from(encrypted.iv);
      } else if (encrypted.iv instanceof ArrayBuffer) {
        ivArray = Array.from(new Uint8Array(encrypted.iv));
      } else if (Array.isArray(encrypted.iv)) {
        // Already an array
        ivArray = encrypted.iv as number[];
      } else {
        // Handle case where IndexedDB returns it as a plain object
        ivArray = Object.values(encrypted.iv) as number[];
      }
      
      // Create a new Uint8Array from the number array to ensure proper ArrayBuffer type
      const iv = new Uint8Array(ivArray);
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.encryptionKey!,
        encrypted.data
      );

      // Deserialize JSON
      const decoder = new TextDecoder();
      const json = decoder.decode(decrypted);
      return JSON.parse(json) as AuditLogEntry;
    } catch (error) {
      throw new Error(`Failed to decrypt log entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

