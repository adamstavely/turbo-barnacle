import { Injectable } from '@angular/core';
import { BoundingBox } from '../models/bounding-box.interface';
import { getPixel } from '../utils/math-helpers';

export interface TableCell {
  row: number;
  col: number;
  boundingBox: BoundingBox;
  text: string;
}

export interface DetectedTable {
  id: string;
  cells: TableCell[][];
  boundingBox: BoundingBox;
  rowCount: number;
  colCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class TableDetectionService {
  
  /**
   * Detect tables from bounding boxes using heuristics
   */
  detectTables(boundingBoxes: BoundingBox[]): DetectedTable[] {
    const tables: DetectedTable[] = [];
    
    // Group bounding boxes that might form a table
    // Look for aligned boxes in rows and columns
    const potentialTables = this.groupPotentialTableBoxes(boundingBoxes);
    
    potentialTables.forEach((group, index) => {
      const table = this.organizeAsTable(group);
      if (table && table.rowCount >= 2 && table.colCount >= 2) {
        tables.push(table);
      }
    });
    
    return tables;
  }

  /**
   * Group bounding boxes that might form a table
   */
  private groupPotentialTableBoxes(boundingBoxes: BoundingBox[]): BoundingBox[][] {
    const groups: BoundingBox[][] = [];
    const processed = new Set<string>();
    
    boundingBoxes.forEach(box => {
      if (processed.has(box.id)) return;
      
      const group: BoundingBox[] = [box];
      processed.add(box.id);
      
      // Find nearby boxes that might be in the same table
      boundingBoxes.forEach(otherBox => {
        if (processed.has(otherBox.id)) return;
        
        // Check if boxes are aligned (similar y-position or x-position)
        const verticalAlign = Math.abs((box.y + box.height / 2) - (otherBox.y + otherBox.height / 2)) < box.height;
        const horizontalAlign = Math.abs((box.x + box.width / 2) - (otherBox.x + otherBox.width / 2)) < box.width;
        const nearby = Math.abs(box.x - otherBox.x) < box.width * 3 && Math.abs(box.y - otherBox.y) < box.height * 3;
        
        if ((verticalAlign || horizontalAlign) && nearby) {
          group.push(otherBox);
          processed.add(otherBox.id);
        }
      });
      
      if (group.length >= 4) { // Minimum cells for a table
        groups.push(group);
      }
    });
    
    return groups;
  }

  /**
   * Organize bounding boxes into a table structure
   */
  private organizeAsTable(boxes: BoundingBox[]): DetectedTable | null {
    // Sort boxes by y-position (rows), then by x-position (columns)
    const sorted = [...boxes].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > a.height / 2) {
        return yDiff;
      }
      return a.x - b.x;
    });
    
    // Group into rows
    const rows: BoundingBox[][] = [];
    let currentRow: BoundingBox[] = [];
    let currentRowY = sorted[0].y;
    
    sorted.forEach(box => {
      const boxCenterY = box.y + box.height / 2;
      if (Math.abs(boxCenterY - currentRowY) < box.height) {
        currentRow.push(box);
      } else {
        if (currentRow.length > 0) {
          rows.push(currentRow.sort((a, b) => a.x - b.x));
        }
        currentRow = [box];
        currentRowY = boxCenterY;
      }
    });
    if (currentRow.length > 0) {
      rows.push(currentRow.sort((a, b) => a.x - b.x));
    }
    
    if (rows.length < 2) return null;
    
    // Create table structure
    const cells: TableCell[][] = [];
    let maxCols = 0;
    
    rows.forEach((row, rowIndex) => {
      const cellRow: TableCell[] = [];
      row.forEach((box, colIndex) => {
        cellRow.push({
          row: rowIndex,
          col: colIndex,
          boundingBox: box,
          text: box.text || ''
        });
      });
      cells.push(cellRow);
      maxCols = Math.max(maxCols, cellRow.length);
    });
    
    // Calculate table bounding box
    const minX = Math.min(...boxes.map(b => b.x));
    const minY = Math.min(...boxes.map(b => b.y));
    const maxX = Math.max(...boxes.map(b => b.x + b.width));
    const maxY = Math.max(...boxes.map(b => b.y + b.height));
    
    return {
      id: `table-${Date.now()}`,
      cells,
      boundingBox: {
        id: `table-bbox-${Date.now()}`,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        text: ''
      },
      rowCount: rows.length,
      colCount: maxCols
    };
  }

  /**
   * Extract table as CSV
   */
  extractTableAsCSV(table: DetectedTable): string {
    const lines: string[] = [];
    
    table.cells.forEach(row => {
      const csvRow = row.map(cell => {
        const text = cell.text || '';
        // Escape CSV special characters
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      });
      lines.push(csvRow.join(','));
    });
    
    return lines.join('\n');
  }

  /**
   * Extract table as HTML
   */
  extractTableAsHTML(table: DetectedTable): string {
    let html = '<table>\n';
    
    table.cells.forEach(row => {
      html += '  <tr>\n';
      row.forEach(cell => {
        html += `    <td>${this.escapeHtml(cell.text || '')}</td>\n`;
      });
      html += '  </tr>\n';
    });
    
    html += '</table>';
    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

