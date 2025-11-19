/// <reference lib="webworker" />

import { createWorker, Worker } from 'tesseract.js';

let worker: Worker | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'init':
        worker = await createWorker(payload.language || 'eng');
        self.postMessage({ type: 'init', success: true });
        break;

      case 'recognize':
        if (!worker) {
          worker = await createWorker('eng');
        }
        const { imageBlob, options } = payload;
        const { data } = await worker.recognize(imageBlob, options);
        self.postMessage({ type: 'recognize', result: data });
        break;

      case 'terminate':
        if (worker) {
          await worker.terminate();
          worker = null;
        }
        self.postMessage({ type: 'terminate', success: true });
        break;

      default:
        self.postMessage({ type: 'error', error: 'Unknown message type' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

