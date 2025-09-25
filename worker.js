self.onmessage = async (event) => {
  const { file, settings } = event.data;

  // Feature: If no changes are needed and metadata is to be kept, pass original file back
  if (!settings.stripMetadata && !settings.targetW && !settings.targetH && settings.filter === 'none' && file.type === settings.format) {
     self.postMessage({ status: 'complete', fileName: file.name, blob: file });
     return;
  }

  try {
    const imageBitmap = await createImageBitmap(file);

    let w = imageBitmap.width;
    let h = imageBitmap.height;
    const { targetW, targetH } = settings;

    if (targetW && !targetH) {
      const ratio = targetW / w;
      w = targetW;
      h = Math.round(h * ratio);
    } else if (!targetW && targetH) {
      const ratio = targetH / h;
      h = targetH;
      w = Math.round(w * ratio);
    } else if (targetW && targetH) {
      w = targetW;
      h = targetH;
    }

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.filter = settings.filter;
    ctx.drawImage(imageBitmap, 0, 0, w, h);

    const blob = await canvas.convertToBlob({
      type: settings.format,
      quality: settings.quality,
    });
    
    self.postMessage({ status: 'complete', fileName: file.name, blob: blob });

  } catch (error) {
    self.postMessage({ status: 'error', fileName: file.name, message: error.message });
  }
};
