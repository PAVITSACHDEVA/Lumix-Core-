// This line is crucial for the worker to have access to the JSZip library.
importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

// Listen for messages from the main script
self.onmessage = async (event) => {
  const { file, settings } = event.data;

  try {
    // 1. Create an ImageBitmap from the file for efficient processing
    const imageBitmap = await createImageBitmap(file);

    // 2. Determine new dimensions based on settings
    let w = imageBitmap.width;
    let h = imageBitmap.height;
    const { targetW, targetH } = settings;

    if (targetW && !targetH) { // Width is set, maintain aspect ratio
      const ratio = targetW / w;
      w = targetW;
      h = Math.round(h * ratio);
    } else if (!targetW && targetH) { // Height is set, maintain aspect ratio
      const ratio = targetH / h;
      h = targetH;
      w = Math.round(w * ratio);
    } else if (targetW && targetH) { // Both are set, ignore aspect ratio
      w = targetW;
      h = targetH;
    }

    // 3. Use OffscreenCanvas, which is designed for workers
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');

    // 4. Apply filter
    ctx.filter = settings.filter;

    // 5. Draw the image to the canvas
    ctx.drawImage(imageBitmap, 0, 0, w, h);

    // 6. Convert the canvas to a Blob (a file-like object)
    const blob = await canvas.convertToBlob({
      type: settings.format,
      quality: settings.quality,
    });
    
    // 7. Send the processed data back to the main script
    self.postMessage({
      status: 'complete',
      fileName: file.name,
      blob: blob,
    });

  } catch (error) {
    // If something goes wrong, send an error message back
    self.postMessage({
      status: 'error',
      fileName: file.name,
      message: error.message,
    });
  }
};