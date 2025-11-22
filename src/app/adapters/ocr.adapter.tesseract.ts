import { OcrEngineAdapter } from './ocr-engine-adapter.interface';
import { OcrResult } from '../models/ocr-result.interface';
import { OcrOptions } from '../models/ocr-options.interface';
import { BoundingBox } from '../models/bounding-box.interface';
import { createWorker, Worker } from 'tesseract.js';

export class TesseractOcrAdapter implements OcrEngineAdapter {
  name = 'Tesseract.js';
  private worker: Worker | null = null;
  private initialized = false;

  async initialize(config?: any): Promise<void> {
    if (this.initialized && this.worker) {
      return;
    }

    this.worker = await createWorker(config?.language || 'eng', 1, {
      logger: config?.logger || (() => {})
    });
    this.initialized = true;
  }

  async performOCR(imageBlob: Blob, options?: OcrOptions): Promise<OcrResult> {
    if (!this.worker) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('Tesseract worker not initialized');
    }

    const startTime = Date.now();

    // Set PSM if provided
    if (options?.psm !== undefined) {
      await this.worker.setParameters({
        tessedit_pageseg_mode: options.psm as any
      });
    }

    // Request structured output with bounding boxes
    // In Tesseract.js v6, structured data should be available by default
    const result = await this.worker.recognize(imageBlob);
    const { data } = result;
    const processingTime = Date.now() - startTime;
    
    console.log('Tesseract with JSON output - result structure:', {
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : [],
      hasBlocks: !!(result.data as any)?.blocks,
      blocksType: typeof (result.data as any)?.blocks
    });
    
    // In Tesseract.js v6, check if result has additional properties or if blocks are at result level
    const resultAny = result as any;
    console.log('Tesseract recognize result keys:', Object.keys(result));
    console.log('Tesseract result structure:', {
      hasData: !!result.data,
      hasBlocks: !!resultAny.blocks,
      blocksAtResultLevel: resultAny.blocks,
      resultKeys: Object.keys(result)
    });
    
    // In Tesseract.js v6, blocks might be under pages array
    // Check multiple possible locations
    const dataAny = data as any;
    let blocks = dataAny.blocks || resultAny.blocks || null;
    
    // If blocks is null, check if it's under pages
    if (!blocks && dataAny.pages && Array.isArray(dataAny.pages) && dataAny.pages.length > 0) {
      // In v6, structure might be pages[0].blocks
      const firstPage = dataAny.pages[0];
      if (firstPage && firstPage.blocks) {
        blocks = firstPage.blocks;
        console.log('Found blocks under pages[0], count:', Array.isArray(blocks) ? blocks.length : 'not array');
      }
    }
    
    // Log full data structure for debugging
    const dataKeys = Object.keys(data);
    console.log('Tesseract full data object:', {
      text: data.text?.substring(0, 100),
      hasBlocks: !!data.blocks,
      blocksType: typeof data.blocks,
      blocksIsArray: Array.isArray(data.blocks),
      blocksValue: data.blocks,
      fullDataKeys: dataKeys,
      // Log each key and its type
      dataStructure: dataKeys.reduce((acc: any, key) => {
        const value = (data as any)[key];
        acc[key] = {
          type: typeof value,
          isArray: Array.isArray(value),
          isNull: value === null,
          isUndefined: value === undefined,
          hasKeys: value && typeof value === 'object' ? Object.keys(value).slice(0, 5) : null,
          sampleValue: typeof value === 'string' ? value.substring(0, 50) : 
                      (Array.isArray(value) ? `Array[${value.length}]` : 
                      (value && typeof value === 'object' ? 'Object' : value))
        };
        return acc;
      }, {})
    });
    
    // Log the actual keys to see what's available
    console.log('Tesseract data keys:', dataKeys);
    console.log('Tesseract data values sample:', dataKeys.slice(0, 10).reduce((acc: any, key) => {
      const value = (data as any)[key];
      if (value !== null && value !== undefined) {
        acc[key] = typeof value === 'object' ? 
          (Array.isArray(value) ? `Array[${value.length}]` : `Object with keys: ${Object.keys(value).slice(0, 5).join(', ')}`) :
          String(value).substring(0, 100);
      }
      return acc;
    }, {}));
    
    // Convert Tesseract blocks/words to bounding boxes
    // Initialize bounding boxes array early so we can use it in alternative format parsing
    const boundingBoxes: BoundingBox[] = [];
    let wordIndex = 0;
    
    // Check if blocks is null/undefined
    // In Tesseract.js v6, blocks might be null but we can use alternative formats
    if (data.blocks === null || data.blocks === undefined) {
      console.warn('Tesseract blocks is null/undefined. Trying alternative formats (hocr, tsv, box)...');
      
      // Detailed inspection of alternative formats
      console.log('Format inspection:', {
        tsv: {
          exists: 'tsv' in dataAny,
          type: typeof dataAny.tsv,
          isString: typeof dataAny.tsv === 'string',
          isNull: dataAny.tsv === null,
          isUndefined: dataAny.tsv === undefined,
          isEmpty: typeof dataAny.tsv === 'string' && dataAny.tsv.trim().length === 0,
          length: typeof dataAny.tsv === 'string' ? dataAny.tsv.length : 'N/A',
          firstChars: typeof dataAny.tsv === 'string' ? dataAny.tsv.substring(0, 200) : 'N/A'
        },
        box: {
          exists: 'box' in dataAny,
          type: typeof dataAny.box,
          isString: typeof dataAny.box === 'string',
          isNull: dataAny.box === null,
          isUndefined: dataAny.box === undefined,
          isEmpty: typeof dataAny.box === 'string' && dataAny.box.trim().length === 0,
          length: typeof dataAny.box === 'string' ? dataAny.box.length : 'N/A',
          firstChars: typeof dataAny.box === 'string' ? dataAny.box.substring(0, 200) : 'N/A'
        },
        hocr: {
          exists: 'hocr' in dataAny,
          type: typeof dataAny.hocr,
          isString: typeof dataAny.hocr === 'string',
          isNull: dataAny.hocr === null,
          isUndefined: dataAny.hocr === undefined,
          isEmpty: typeof dataAny.hocr === 'string' && dataAny.hocr.trim().length === 0,
          length: typeof dataAny.hocr === 'string' ? dataAny.hocr.length : 'N/A',
          firstChars: typeof dataAny.hocr === 'string' ? dataAny.hocr.substring(0, 200) : 'N/A'
        }
      });
      
      // Try parsing TSV format which contains bounding boxes
      if (dataAny.tsv && typeof dataAny.tsv === 'string' && dataAny.tsv.trim().length > 0) {
        console.log('Found TSV format, parsing for bounding boxes...');
        try {
          const tsvBoxes = this.parseTsvBoundingBoxes(dataAny.tsv);
          console.log('TSV parser result:', { parsed: tsvBoxes.length, boxes: tsvBoxes.slice(0, 3) });
          if (tsvBoxes.length > 0) {
            boundingBoxes.push(...tsvBoxes);
            console.log('Extracted', tsvBoxes.length, 'bounding boxes from TSV format');
          } else {
            console.warn('TSV parser returned 0 boxes. TSV sample:', dataAny.tsv.substring(0, 500));
          }
        } catch (error) {
          console.error('TSV parser error:', error);
        }
      } else {
        console.log('TSV format not available or empty:', {
          exists: !!dataAny.tsv,
          type: typeof dataAny.tsv,
          length: typeof dataAny.tsv === 'string' ? dataAny.tsv.length : 'N/A'
        });
      }
      
      // Try parsing box format
      if (dataAny.box && typeof dataAny.box === 'string' && dataAny.box.trim().length > 0) {
        console.log('Found box format, parsing for bounding boxes...');
        try {
          const boxBoxes = this.parseBoxBoundingBoxes(dataAny.box);
          console.log('Box parser result:', { parsed: boxBoxes.length, boxes: boxBoxes.slice(0, 3) });
          if (boxBoxes.length > 0) {
            boundingBoxes.push(...boxBoxes);
            console.log('Extracted', boxBoxes.length, 'bounding boxes from box format');
          } else {
            console.warn('Box parser returned 0 boxes. Box sample:', dataAny.box.substring(0, 500));
          }
        } catch (error) {
          console.error('Box parser error:', error);
        }
      } else {
        console.log('Box format not available or empty:', {
          exists: !!dataAny.box,
          type: typeof dataAny.box,
          length: typeof dataAny.box === 'string' ? dataAny.box.length : 'N/A'
        });
      }
      
      // Try parsing HOCR format (HTML with bounding boxes)
      if (dataAny.hocr && typeof dataAny.hocr === 'string' && dataAny.hocr.trim().length > 0) {
        console.log('Found HOCR format, parsing for bounding boxes...');
        try {
          const hocrBoxes = this.parseHocrBoundingBoxes(dataAny.hocr);
          console.log('HOCR parser result:', { parsed: hocrBoxes.length, boxes: hocrBoxes.slice(0, 3) });
          if (hocrBoxes.length > 0) {
            boundingBoxes.push(...hocrBoxes);
            console.log('Extracted', hocrBoxes.length, 'bounding boxes from HOCR format');
          } else {
            console.warn('HOCR parser returned 0 boxes. HOCR sample:', dataAny.hocr.substring(0, 500));
          }
        } catch (error) {
          console.error('HOCR parser error:', error);
        }
      } else {
        console.log('HOCR format not available or empty:', {
          exists: !!dataAny.hocr,
          type: typeof dataAny.hocr,
          length: typeof dataAny.hocr === 'string' ? dataAny.hocr.length : 'N/A'
        });
      }
    } else if (typeof data.blocks === 'object' && !Array.isArray(data.blocks)) {
      console.log('Blocks is an object, inspecting structure:', {
        blockKeys: Object.keys(data.blocks),
        firstBlockKey: Object.keys(data.blocks)[0],
        firstBlockValue: Object.keys(data.blocks).length > 0 ? (data.blocks as any)[Object.keys(data.blocks)[0]] : null
      });
    }

    // Debug: Log Tesseract data structure
    console.log('Tesseract OCR data structure:', {
      hasBlocks: !!data.blocks,
      blocksCount: data.blocks?.length || 0,
      hasWords: 'words' in data && Array.isArray(dataAny.words),
      wordsCount: ('words' in data && Array.isArray(dataAny.words)) ? dataAny.words.length : 0,
      hasSymbols: 'symbols' in data && Array.isArray(dataAny.symbols),
      symbolsCount: ('symbols' in data && Array.isArray(dataAny.symbols)) ? dataAny.symbols.length : 0,
      dataKeys: Object.keys(data)
    });

    // Method 1: Extract words from blocks (nested structure)
    // Handle both array and object formats
    // Use blocks from either data.blocks or result.blocks
    if (blocks) {
      let blocksArray: any[] = [];
      
      if (Array.isArray(blocks)) {
        blocksArray = blocks;
        console.log('Blocks is an array, count:', blocksArray.length);
      } else if (typeof blocks === 'object' && blocks !== null) {
        // If blocks is an object, try to convert to array
        // It might be structured as {0: block1, 1: block2, ...} or have a different structure
        const blockKeys = Object.keys(blocks);
        if (blockKeys.length > 0) {
          // Try to get blocks as array-like object
          blocksArray = Object.values(blocks);
          console.log('Converted blocks object to array, count:', blocksArray.length, 'keys:', blockKeys.slice(0, 5));
        } else {
          console.warn('Blocks object has no keys');
        }
      } else {
        console.warn('Blocks is not an array or object:', typeof blocks, blocks);
      }
      
      for (const block of blocksArray) {
        if (block && typeof block === 'object') {
          // Handle paragraphs - could be array or object
          let paragraphs: any[] = [];
          if (Array.isArray(block.paragraphs)) {
            paragraphs = block.paragraphs;
          } else if (block.paragraphs && typeof block.paragraphs === 'object') {
            paragraphs = Object.values(block.paragraphs);
          }
          
          for (const paragraph of paragraphs) {
            if (paragraph && typeof paragraph === 'object') {
              // Handle lines - could be array or object
              let lines: any[] = [];
              if (Array.isArray(paragraph.lines)) {
                lines = paragraph.lines;
              } else if (paragraph.lines && typeof paragraph.lines === 'object') {
                lines = Object.values(paragraph.lines);
              }
              
              for (const line of lines) {
                if (line && typeof line === 'object') {
                  // Handle words - could be array or object
                  let words: any[] = [];
                  if (Array.isArray(line.words)) {
                    words = line.words;
                  } else if (line.words && typeof line.words === 'object') {
                    words = Object.values(line.words);
                  }
                  
                  for (const word of words) {
                    if (word && word.bbox) {
                      boundingBoxes.push({
                        id: `tesseract-${wordIndex++}`,
                        x: word.bbox.x0,
                        y: word.bbox.y0,
                        width: word.bbox.x1 - word.bbox.x0,
                        height: word.bbox.y1 - word.bbox.y0,
                        text: word.text || '',
                        confidence: (word.confidence || 0) / 100 // Tesseract returns 0-100, we use 0-1
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Method 2: Fallback - Extract directly from words array if available (check if it exists on data)
    if (boundingBoxes.length === 0 && 'words' in data && Array.isArray((data as any).words)) {
      console.log('Tesseract: Using direct words array fallback');
      const words = (data as any).words;
      for (const word of words) {
        if (word.bbox) {
          boundingBoxes.push({
            id: `tesseract-${wordIndex++}`,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            text: word.text || '',
            confidence: (word.confidence || 0) / 100
          });
        }
      }
    }

    // Method 3: Fallback - Extract from symbols if words not available (check if it exists on data)
    if (boundingBoxes.length === 0 && 'symbols' in data && Array.isArray((data as any).symbols)) {
      console.log('Tesseract: Using symbols array fallback');
      const symbols = (data as any).symbols;
      // Group symbols into words by proximity
      const symbolGroups: any[][] = [];
      let currentGroup: any[] = [];
      let lastX = -1;
      
      for (const symbol of symbols) {
        if (symbol.bbox) {
          const symbolX = symbol.bbox.x0;
          // If symbol is far from last one, start new group
          if (lastX >= 0 && symbolX - lastX > 20) {
            if (currentGroup.length > 0) {
              symbolGroups.push(currentGroup);
            }
            currentGroup = [symbol];
          } else {
            currentGroup.push(symbol);
          }
          lastX = symbolX;
        }
      }
      if (currentGroup.length > 0) {
        symbolGroups.push(currentGroup);
      }

      // Create bounding boxes from symbol groups
      for (const group of symbolGroups) {
        if (group.length > 0 && group[0].bbox) {
          const minX = Math.min(...group.map(s => s.bbox.x0));
          const minY = Math.min(...group.map(s => s.bbox.y0));
          const maxX = Math.max(...group.map(s => s.bbox.x1));
          const maxY = Math.max(...group.map(s => s.bbox.y1));
          const text = group.map(s => s.text || '').join('');
          
          boundingBoxes.push({
            id: `tesseract-${wordIndex++}`,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            text: text,
            confidence: group.reduce((sum, s) => sum + (s.confidence || 0), 0) / group.length / 100
          });
        }
      }
    }

    // If no bounding boxes were extracted but we have text, log a warning
    if (boundingBoxes.length === 0 && data.text && data.text.trim().length > 0) {
      console.warn('Tesseract: Text extracted but no bounding boxes found. This may indicate:', {
        reason: 'Tesseract.js may not be returning structured output',
        suggestion: 'Try using a different OCR engine or check Tesseract.js version',
        textLength: data.text.length,
        dataKeys: Object.keys(data)
      });
    }

    console.log('Tesseract: Extracted bounding boxes', {
      count: boundingBoxes.length,
      firstBox: boundingBoxes[0] || null,
      hasText: !!data.text && data.text.length > 0
    });

    return {
      text: data.text || '',
      boundingBoxes,
      confidence: (data.confidence || 0) / 100,
      engine: this.name,
      processingTime,
      metadata: {
        blocks: data.blocks?.length || 0,
        words: boundingBoxes.length,
        textLength: data.text?.length || 0,
        hasStructuredData: boundingBoxes.length > 0
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.worker) {
        await this.initialize();
      }
      return this.worker !== null;
    } catch {
      return false;
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }

  /**
   * Parse TSV (tab-separated values) format to extract bounding boxes
   * TSV format: level page_num block_num par_num line_num word_num left top width height conf text
   */
  private parseTsvBoundingBoxes(tsv: string): BoundingBox[] {
    const boxes: BoundingBox[] = [];
    
    if (!tsv || typeof tsv !== 'string' || tsv.trim().length === 0) {
      console.warn('parseTsvBoundingBoxes: Invalid TSV input');
      return boxes;
    }
    
    try {
      const lines = tsv.split('\n');
      let wordIndex = 0;
      let skippedLines = 0;
      let processedLines = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('level')) {
          skippedLines++;
          continue; // Skip header and empty lines
        }
        
        const parts = line.split('\t');
        if (parts.length < 12) {
          skippedLines++;
          continue;
        }
        
        try {
          const level = parts[0];
          // Only extract word-level boxes (level 5)
          if (level === '5') {
            const left = parseInt(parts[6], 10);
            const top = parseInt(parts[7], 10);
            const width = parseInt(parts[8], 10);
            const height = parseInt(parts[9], 10);
            const conf = parseFloat(parts[10]) || 0;
            const text = parts[11] || '';

            if (!isNaN(left) && !isNaN(top) && !isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
              boxes.push({
                id: `tesseract-tsv-${wordIndex++}`,
                x: left,
                y: top,
                width: width,
                height: height,
                text: text,
                confidence: conf / 100 // TSV confidence is 0-100
              });
              processedLines++;
            } else {
              skippedLines++;
            }
          } else {
            skippedLines++;
          }
        } catch (lineError) {
          console.warn(`parseTsvBoundingBoxes: Error parsing line ${i}:`, lineError, 'Line:', line.substring(0, 100));
          skippedLines++;
        }
      }
      
      console.log('TSV parser stats:', {
        totalLines: lines.length,
        processed: processedLines,
        skipped: skippedLines,
        boxesExtracted: boxes.length
      });
    } catch (error) {
      console.error('parseTsvBoundingBoxes: Fatal error:', error);
    }

    return boxes;
  }

  /**
   * Parse box format to extract bounding boxes
   * Box format: character left bottom right top page
   */
  private parseBoxBoundingBoxes(box: string): BoundingBox[] {
    const boxes: BoundingBox[] = [];
    
    if (!box || typeof box !== 'string' || box.trim().length === 0) {
      console.warn('parseBoxBoundingBoxes: Invalid box input');
      return boxes;
    }
    
    try {
      const lines = box.split('\n');
      let wordIndex = 0;
      let currentWord = '';
      let currentBox: { left: number; bottom: number; right: number; top: number } | null = null;
      let processedChars = 0;
      let skippedLines = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) {
          // Empty line - finalize current word if any
          if (currentBox && currentWord) {
            boxes.push({
              id: `tesseract-box-${wordIndex++}`,
              x: currentBox.left,
              y: currentBox.top, // Note: box format uses bottom, we need to convert
              width: currentBox.right - currentBox.left,
              height: currentBox.bottom - currentBox.top,
              text: currentWord,
              confidence: 0.9 // Box format doesn't include confidence
            });
            currentWord = '';
            currentBox = null;
          }
          continue;
        }

        try {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const char = parts[0];
            const left = parseInt(parts[1], 10);
            const bottom = parseInt(parts[2], 10);
            const right = parseInt(parts[3], 10);
            const top = parseInt(parts[4], 10);

            if (!isNaN(left) && !isNaN(bottom) && !isNaN(right) && !isNaN(top)) {
              processedChars++;
              // Group characters into words (space-separated)
              if (char === ' ' && currentBox && currentWord) {
                // Space character - finalize current word
                boxes.push({
                  id: `tesseract-box-${wordIndex++}`,
                  x: currentBox.left,
                  y: top,
                  width: currentBox.right - currentBox.left,
                  height: bottom - top,
                  text: currentWord,
                  confidence: 0.9
                });
                currentWord = '';
                currentBox = null;
              } else if (char !== ' ') {
                // Add character to current word
                currentWord += char;
                if (!currentBox) {
                  currentBox = { left, bottom, right, top };
                } else {
                  // Expand box to include this character
                  currentBox.left = Math.min(currentBox.left, left);
                  currentBox.bottom = Math.max(currentBox.bottom, bottom);
                  currentBox.right = Math.max(currentBox.right, right);
                  currentBox.top = Math.min(currentBox.top, top);
                }
              }
            } else {
              skippedLines++;
            }
          } else {
            skippedLines++;
          }
        } catch (lineError) {
          console.warn(`parseBoxBoundingBoxes: Error parsing line ${i}:`, lineError, 'Line:', line.substring(0, 100));
          skippedLines++;
        }
      }

      // Finalize last word if any
      if (currentBox && currentWord) {
        boxes.push({
          id: `tesseract-box-${wordIndex++}`,
          x: currentBox.left,
          y: currentBox.top,
          width: currentBox.right - currentBox.left,
          height: currentBox.bottom - currentBox.top,
          text: currentWord,
          confidence: 0.9
        });
      }
      
      console.log('Box parser stats:', {
        totalLines: lines.length,
        processedChars: processedChars,
        skippedLines: skippedLines,
        boxesExtracted: boxes.length
      });
    } catch (error) {
      console.error('parseBoxBoundingBoxes: Fatal error:', error);
    }

    return boxes;
  }

  /**
   * Parse HOCR (HTML OCR) format to extract bounding boxes
   * HOCR uses bbox attributes in HTML elements
   */
  private parseHocrBoundingBoxes(hocr: string): BoundingBox[] {
    const boxes: BoundingBox[] = [];
    
    if (!hocr || typeof hocr !== 'string' || hocr.trim().length === 0) {
      console.warn('parseHocrBoundingBoxes: Invalid HOCR input');
      return boxes;
    }
    
    try {
      let wordIndex = 0;
      let matchesFound = 0;
      let validMatches = 0;

      // Use regex to find word elements with bbox attributes
      // HOCR format: <span class='ocrx_word' title='bbox x0 y0 x1 y1; ...'>text</span>
      // Try multiple regex patterns to handle different HOCR formats
      const patterns = [
        // Standard pattern: class='ocrx_word' or class="ocrx_word"
        /<span[^>]*class=['"]ocrx_word['"][^>]*title=['"][^'"]*bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)[^'"]*['"][^>]*>([^<]*)<\/span>/gi,
        // Alternative: bbox in title without quotes
        /<span[^>]*class=['"]ocrx_word['"][^>]*title=['"]bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)[^'"]*['"][^>]*>([^<]*)<\/span>/gi,
        // More flexible: any span with bbox in title
        /<span[^>]*title=['"][^'"]*bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)[^'"]*['"][^>]*>([^<]*)<\/span>/gi
      ];

      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(hocr)) !== null) {
          matchesFound++;
          try {
            const x0 = parseInt(match[1], 10);
            const y0 = parseInt(match[2], 10);
            const x1 = parseInt(match[3], 10);
            const y1 = parseInt(match[4], 10);
            const text = match[5] ? match[5].trim() : '';

            if (!isNaN(x0) && !isNaN(y0) && !isNaN(x1) && !isNaN(y1) && x1 > x0 && y1 > y0) {
              boxes.push({
                id: `tesseract-hocr-${wordIndex++}`,
                x: x0,
                y: y0,
                width: x1 - x0,
                height: y1 - y0,
                text: text || `word-${wordIndex}`,
                confidence: 0.9 // HOCR doesn't always include confidence in title
              });
              validMatches++;
            }
          } catch (matchError) {
            console.warn('parseHocrBoundingBoxes: Error processing match:', matchError, 'Match:', match[0].substring(0, 100));
          }
        }
        
        // If we found matches with this pattern, stop trying others
        if (validMatches > 0) {
          break;
        }
      }
      
      console.log('HOCR parser stats:', {
        matchesFound: matchesFound,
        validMatches: validMatches,
        boxesExtracted: boxes.length,
        hocrLength: hocr.length
      });
    } catch (error) {
      console.error('parseHocrBoundingBoxes: Fatal error:', error);
    }

    return boxes;
  }
}

