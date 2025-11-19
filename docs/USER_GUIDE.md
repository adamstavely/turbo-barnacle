# User Guide

## New Features Overview

This guide covers the new features added to the OCR application, including image enhancement tools, workflow improvements, and advanced OCR capabilities.

---

## Image Enhancement Features

### Moiré Pattern Removal

**What it does:** Removes interference patterns (Moiré patterns) that appear when scanning printed materials.

**How to use:**
1. Open the Enhancement Tools panel
2. Find the "Moiré Removal Intensity" slider
3. Adjust the slider (0-100) to control removal strength
4. Higher values remove more patterns but may blur fine details

**When to use:**
- Scanning printed documents or photos
- Images with visible interference patterns
- Documents with halftone patterns

**Tips:**
- Start with low values (20-30) and increase if needed
- Use in combination with sharpening for best results

---

### Color Channel Isolation

**What it does:** Allows you to view individual color channels (RGB, HSV, Lab) to better analyze and process images.

**How to use:**
1. Open the Enhancement Tools panel
2. Find the "Color Channel Isolation" dropdown
3. Select a channel:
   - **RGB channels:** Red, Green, Blue
   - **HSV channels:** Hue, Saturation, Value
   - **Lab channels:** Lightness, A-Channel, B-Channel
4. Select "Full Color" to return to normal view

**When to use:**
- Analyzing color distribution
- Enhancing specific color channels
- Debugging color-related OCR issues
- Isolating text from colored backgrounds

**Tips:**
- Use "Value" channel for grayscale analysis
- "Lightness" channel often provides best OCR results
- Combine with other enhancements for optimal results

---

### Highlight & Marker Removal

**What it does:** Removes highlights, markers, or annotations from documents.

**How to use:**
1. Open the Enhancement Tools panel
2. Find the "Highlight Removal" dropdown
3. Select intensity:
   - **Soft Clean:** Gentle removal, preserves text
   - **Medium Clean:** Balanced removal
   - **Aggressive Clean:** Strong removal, may affect text

**When to use:**
- Documents with yellow highlights
- Marked-up documents
- Documents with annotations you want to remove

**Tips:**
- Start with "Soft Clean" and increase if needed
- May require additional contrast adjustment after removal
- Works best on light-colored highlights

---

### Super Resolution

**What it does:** Upscales images to higher resolution for better OCR accuracy.

**How to use:**
1. Open the Enhancement Tools panel
2. Find the "Super Resolution" section
3. Select method:
   - **Bicubic:** Fast, standard interpolation
   - **ESRGAN:** Advanced ML-based upscaling (requires setup)
4. Adjust "Scale Factor" slider (1.5x to 4x)
5. Apply the enhancement

**When to use:**
- Low-resolution images
- Small text that's hard to read
- Improving OCR accuracy on blurry images

**Tips:**
- Higher scale factors take longer to process
- ESRGAN provides better quality but requires more resources
- 2x scale is usually sufficient for most cases

---

## Workflow Enhancements

### Split View

**What it does:** Displays original and enhanced images side-by-side for comparison.

**How to use:**
1. Click the "Toggle Split View" button in the toolbar (or press `S`)
2. Drag the divider slider to adjust the split position
3. Click the close button or press `S` again to exit

**When to use:**
- Comparing before/after enhancement results
- Verifying enhancement quality
- Fine-tuning enhancement parameters

**Tips:**
- Use to verify that enhancements improve image quality
- Helpful for learning which enhancements work best

---

### Magnifier Lens

**What it does:** Provides a circular magnifying glass that follows your cursor.

**How to use:**
1. Click the "Toggle Magnifier" button in the toolbar (or press `M`)
2. Move your mouse over the image to see magnified view
3. Click the zoom button in the magnifier to cycle zoom levels (2x, 4x, 8x)
4. Press `M` again to close

**When to use:**
- Inspecting fine details
- Verifying text quality
- Checking bounding box accuracy

**Tips:**
- Useful for precise bounding box editing
- Helps verify OCR accuracy on small text

---

### Secure Image Sandbox (Mask Tool)

**What it does:** Allows you to mask sensitive regions that should be excluded from OCR processing.

**How to use:**
1. Open the "Secure Sandbox Mode" panel
2. Click "Enter Mask Mode"
3. Click and drag on the canvas to create mask rectangles
4. Masked areas will appear with a red overlay
5. Run OCR - masked areas will be excluded
6. Click "Clear All" to remove all masks

**When to use:**
- Protecting sensitive information (SSNs, credit cards, etc.)
- Excluding signatures from OCR
- Removing watermarks or annotations
- Privacy compliance requirements

**Tips:**
- Masks are applied before OCR processing
- Multiple masks can be created
- Masks are saved with the image state

---

### Audit Logging

**What it does:** Automatically logs all OCR operations, preprocessing steps, and edits for compliance and debugging.

**How to use:**
- Automatically enabled - no configuration needed
- Logs are stored locally in your browser
- Access logs programmatically via the AuditLogService

**What gets logged:**
- OCR operations (engine, parameters, results)
- Preprocessing steps applied
- Bounding box edits
- Export actions
- Mask operations

**Privacy:**
- Logs are stored locally in your browser
- Never sent to external servers
- Can be cleared at any time

---

## Advanced OCR Features

### Real-Time OCR Preview

**What it does:** Shows OCR results for selected regions in real-time as you hover or select bounding boxes.

**How to use:**
1. Select a bounding box on the canvas
2. OCR preview panel appears automatically
3. Shows detected text, confidence, and engine information
4. Updates automatically as you select different regions

**When to use:**
- Quick verification of OCR results
- Checking confidence scores
- Previewing text before full OCR

**Tips:**
- Preview is debounced for performance
- Shows results for the selected region only
- Useful for iterative refinement

---

### Confidence Heatmap

**What it does:** Visualizes OCR confidence scores as a color overlay on the canvas.

**How to use:**
1. Click "Toggle Confidence Heatmap" in the toolbar (or press `H`)
2. Bounding boxes are colored by confidence:
   - **Green:** High confidence (≥90%)
   - **Yellow:** Medium confidence (70-90%)
   - **Red:** Low confidence (<70%)
3. Press `H` again to toggle off

**When to use:**
- Identifying low-confidence regions
- Quality assurance
- Deciding which regions need manual review

**Tips:**
- Use to quickly identify problematic areas
- Combine with manual editing for best results

---

### Signature Detection & Extraction

**What it does:** Automatically detects and extracts signatures from documents.

**How to use:**
1. Open the "Signature Detection" panel
2. Click "Detect Signatures"
3. Detected signatures appear in the list
4. Click the eye icon to highlight a signature
5. Click the download icon to export as PNG
6. Signatures are automatically excluded from OCR results

**When to use:**
- Extracting signatures for separate processing
- Excluding signatures from OCR
- Document authentication workflows

**Tips:**
- Signatures are automatically excluded from OCR
- Can export individual signatures
- Detection uses heuristic algorithms (ML option available with API setup)

---

## AI Auto Clean Enhancements

### Enhanced Recommendations

**What it does:** Provides intelligent recommendations for image enhancements based on automatic analysis.

**How to use:**
1. Open the "AI Auto Clean" panel
2. Click "Analyze & Recommend"
3. Review recommended enhancements
4. Click "Apply All Recommendations" or apply individually
5. View the "Transformation Log" to see what was applied

**New features:**
- **Transformation Log:** Shows all applied transformations with timestamps
- **Preview Before/After:** Compare original and enhanced images
- **Enhanced Analysis:** More accurate detection of image issues

**When to use:**
- Quick optimization of document images
- Learning which enhancements work best
- Batch processing workflows

**Tips:**
- Review recommendations before applying
- Use transformation log to understand changes
- Can undo if results aren't satisfactory

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `S` | Toggle Split View |
| `M` | Toggle Magnifier |
| `H` | Toggle Confidence Heatmap |
| `Ctrl/Cmd + Enter` | Run OCR |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + Y` | Redo (alternative) |
| `Ctrl/Cmd + N` | Clear/New |
| `Delete/Backspace` | Delete selected bounding box |
| `Escape` | Deselect bounding box |

---

## Best Practices

### Image Preparation Workflow

1. **Load Image:** Start with the best quality image available
2. **Auto Clean:** Run AI Auto Clean for initial recommendations
3. **Manual Adjustments:** Fine-tune based on results
4. **Super Resolution:** Apply if text is small or blurry
5. **Mask Sensitive Data:** Use mask tool for privacy
6. **Run OCR:** Process the enhanced image
7. **Review Heatmap:** Check confidence scores
8. **Edit Bounding Boxes:** Manually correct as needed
9. **Export Results:** Save your work

### Enhancement Tips

- **Start conservative:** Begin with low enhancement values
- **One at a time:** Apply enhancements incrementally
- **Use Split View:** Compare before/after results
- **Check confidence:** Use heatmap to verify quality
- **Save frequently:** Use state persistence for important work

### Performance Tips

- **Large images:** Consider downscaling before processing
- **Batch processing:** Use for multiple PDF pages
- **Web Workers:** Heavy processing runs in background automatically
- **Debouncing:** Real-time preview is optimized for performance

---

## Troubleshooting

### OCR Accuracy Issues

- **Try Super Resolution:** Upscale low-resolution images
- **Adjust Contrast:** Increase contrast for better text detection
- **Apply Binarization:** Convert to black/white for scanned documents
- **Check Skew:** Use auto-deskew for rotated documents

### Performance Issues

- **Reduce Image Size:** Downscale very large images
- **Disable Real-time Preview:** If experiencing lag
- **Close Split View:** Reduces rendering overhead
- **Clear Masks:** Remove unnecessary mask regions

### Feature Not Working

- **Check Browser:** Ensure modern browser with Web Workers support
- **Clear Cache:** Try clearing browser cache
- **Check Console:** Look for error messages in browser console
- **Update Browser:** Ensure latest browser version

---

## Privacy & Security

### Data Handling

- All processing happens in your browser
- Images are never sent to external servers (unless using REST API OCR)
- Audit logs are stored locally only
- Masks protect sensitive data from OCR processing

### Export Options

- Export OCR results as text
- Export bounding boxes as JSON
- Export signatures as PNG
- Export enhanced images

---

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review this user guide
3. Consult the API documentation for advanced usage
4. Check the developer guide for extension development

