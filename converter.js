document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     Part 1: Initial Setup and Loader
     ========================================================================== */

  // --- LOADER SCRIPT ---
  (() => {
    const loading = document.getElementById('loading');
    const loaderFill = document.getElementById('loaderFill');
    const container = document.querySelector('.container');
    window.addEventListener('load', () => {
      loaderFill.style.width = "100%";
      setTimeout(() => {
        loading.style.opacity = '0';
        setTimeout(() => {
          loading.style.display = 'none';
          container.classList.add('show');
        }, 1000);
      }, 500);
    });
  })();
  
  // --- SOUND & NOTIFICATION ---
  const playSound = (id) => {
    const sound = document.getElementById(id);
    if (sound) {
      sound.currentTime = 0;
      sound.play();
    }
  };

  const showToast = (message, isError = false) => {
      const toastContainer = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.className = `toast ${isError ? 'error' : ''}`;
      toastContainer.appendChild(toast);
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 500);
      }, 3000);
  };

  // // Attach sounds to navbar links
  // document.querySelectorAll('#navbara a').forEach(link => {
  //   link.addEventListener('click', e => {
  //     const soundId = link.getAttribute('data-sound-id');
  //     if (!soundId) return;
      
  //     e.preventDefault();
  //     playSound(soundId);
      
  //     const sound = document.getElementById(soundId);
  //     sound.onended = () => {
  //         // In a real app, you'd navigate. Here we just log it.
  //         console.log(`Navigating to ${link.href}`);
  //         // window.location.href = link.href;
  //     };
  //   });
  // });

  // Attach click sound to all buttons
  document.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => playSound('sound-click'));
  });

  /* ==========================================================================
     Part 2: Main Application Logic
     ========================================================================== */

  // --- Elements ---
  const getEl = (id) => document.getElementById(id);
  const uploadBox = document.querySelector('.upload-box'),
    uploadText = getEl('uploadText'), fileInput = getEl('fileUpload'),
    previewImage = getEl('previewImage'), formatSel = getEl('format'),
    qualityControl = getEl('qualityControl'), qualitySlider = getEl('qualitySlider'),
    qualityValue = getEl('qualityValue'), filterSel = getEl('filter'),
    targetWInput = getEl('targetW'), targetHInput = getEl('targetH'),
    aspectLock = getEl('aspectLock'), metadataCheck = getEl('metadata'),
    convertBtn = getEl('convertBtn'), copyBtn = getEl('copyBtn'),
    clearBtn = getEl('clearBtn'), voiceBtn = getEl('voiceBtn'),
    progressContainer = document.querySelector('.progress-container'),
    progressText = getEl('progressText'), progressBar = document.querySelector('.progress-bar'),
    sizeEstimate = getEl('sizeEstimate'), historyContainer = getEl('history'),
    historyList = getEl('historyList'), batchRenameContainer = getEl('batchRenameContainer'),
    batchRenameInput = getEl('batchRenameInput');
  
  // --- Worker ---
  const worker = new Worker('worker.js');

  // --- State ---
  let fileList = [], processedBlobs = [], originalDimensions = { w: 0, h: 0 }, estimateDebounceTimeout;

  // --- Settings & History (localStorage) ---
  const saveSettings = () => localStorage.setItem('converterSettings', JSON.stringify({ format: formatSel.value, quality: qualitySlider.value, filter: filterSel.value, targetW: targetWInput.value, targetH: targetHInput.value, aspectLock: aspectLock.checked, metadata: metadataCheck.checked }));
  const loadSettings = () => {
    const s = JSON.parse(localStorage.getItem('converterSettings'));
    if (s) {
      formatSel.value = s.format || 'image/png'; qualitySlider.value = s.quality || 92; filterSel.value = s.filter || 'none';
      targetWInput.value = s.targetW || ''; targetHInput.value = s.targetH || ''; aspectLock.checked = s.aspectLock !== false; metadataCheck.checked = s.metadata !== false;
      updateQualityUI();
    }
  };
  const getHistory = () => JSON.parse(localStorage.getItem('converterHistory')) || [];
  const saveHistory = (item) => {
    let history = getHistory();
    history.unshift(item);
    if (history.length > 5) history = history.slice(0, 5);
    localStorage.setItem('converterHistory', JSON.stringify(history));
    renderHistory();
  };
  
  // --- UI Updates ---
  const updateQualityUI = () => {
    const isLossy = ['image/jpeg', 'image/webp'].includes(formatSel.value);
    qualityControl.style.display = isLossy ? 'block' : 'none';
    qualityValue.textContent = `${qualitySlider.value}%`;
    triggerSizeEstimate();
  };

  const resizeHandler = (e) => {
    if (!aspectLock.checked || !originalDimensions.w) return;
    const changedInput = e.target.id;
    const aspectRatio = originalDimensions.w / originalDimensions.h;
    if (changedInput === 'targetW') {
      targetHInput.value = targetWInput.value ? Math.round(targetWInput.value / aspectRatio) : '';
    } else {
      targetWInput.value = targetHInput.value ? Math.round(targetHInput.value * aspectRatio) : '';
    }
    triggerSizeEstimate();
  };

  // --- File Handling & Drag/Drop ---
  function handleFiles(files) {
    fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
        showToast("No valid image files selected.", true);
        playSound('sound-error');
        return;
    }
    
    const firstFile = fileList[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      const img = new Image();
      img.onload = () => { 
          originalDimensions = { w: img.width, h: img.height };
          triggerSizeEstimate();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(firstFile);

    previewImage.style.display = 'block';
    uploadText.textContent = fileList.length === 1 ? firstFile.name : `${fileList.length} images selected`;
    convertBtn.disabled = false;
    batchRenameContainer.style.display = fileList.length > 1 ? 'block' : 'none';
    copyBtn.style.display = 'none';

    if (firstFile.type.includes('gif') || firstFile.type.includes('png')) {
         formatSel.value = 'image/png';
    } else {
         formatSel.value = 'image/jpeg';
    }
    updateQualityUI();
  }

  uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.classList.add('active'); });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('active'));
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault(); uploadBox.classList.remove('active');
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => e.target.files?.length && handleFiles(e.target.files));
  
  // --- Event Listeners for Controls ---
  qualitySlider.addEventListener('input', () => { updateQualityUI(); triggerSizeEstimate(); });
  formatSel.addEventListener('change', updateQualityUI);
  targetWInput.addEventListener('input', resizeHandler);
  targetHInput.addEventListener('input', resizeHandler);
  [filterSel, aspectLock, metadataCheck].forEach(el => el.addEventListener('change', triggerSizeEstimate));

  // --- Size Estimator ---
  function triggerSizeEstimate() {
      if(fileList.length === 0) return;
      sizeEstimate.textContent = 'Calculating...';
      clearTimeout(estimateDebounceTimeout);
      estimateDebounceTimeout = setTimeout(updateSizeEstimate, 500);
  }
  
  if (!HTMLCanvasElement.prototype.convertToBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'convertToBlob', {
      value: function (callback, type, quality) {
        const dataURL = this.toDataURL(type, quality);
        const binStr = atob(dataURL.split(',')[1]);
        const len = binStr.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        callback(new Blob([arr], { type: type || 'image/png' }));
      }
    });
  }

  async function updateSizeEstimate() {
      if (fileList.length === 0 || !previewImage.src) {
          sizeEstimate.textContent = '-- KB';
          return;
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const tempImg = new Image();
      tempImg.src = previewImage.src;
      try {
        await tempImg.decode();
      } catch(e) {
        sizeEstimate.textContent = 'N/A';
        return;
      }
      
      const w = parseInt(targetWInput.value) || originalDimensions.w;
      const h = parseInt(targetHInput.value) || originalDimensions.h;
      
      const MAX_ESTIMATE_DIM = 500;
      const ratio = Math.min(MAX_ESTIMATE_DIM / w, MAX_ESTIMATE_DIM / h, 1);
      canvas.width = w * ratio;
      canvas.height = h * ratio;

      ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
      
      canvas.convertToBlob(
          (blob) => {
              if (blob) {
                  const estimatedFullSize = blob.size / (ratio * ratio);
                  sizeEstimate.textContent = `${(estimatedFullSize / 1024).toFixed(1)} KB`;
              } else {
                  sizeEstimate.textContent = 'N/A';
              }
          },
          formatSel.value,
          qualitySlider.value / 100
      );
  }
  
  // --- Conversion Process ---
  convertBtn.addEventListener('click', () => {
    if (fileList.length === 0) return;
    saveSettings();
    processedBlobs = [];
    convertBtn.disabled = true; clearBtn.disabled = true; copyBtn.style.display = 'none';
    progressContainer.style.display = 'block';
    processFile(0);
  });

  worker.onmessage = (e) => {
    const { status, blob, fileName, message } = e.data;
    if (status === 'complete') {
      processedBlobs.push({ blob, fileName });
      const nextIndex = processedBlobs.length;
      if (nextIndex < fileList.length) {
        processFile(nextIndex);
      } else {
        finishConversion();
      }
    } else {
      playSound('sound-error');
      showToast(`Error processing ${fileName}: ${message}`, true);
      finishConversion(true);
    }
  };
  
  function processFile(index) {
    const file = fileList[index];
    progressText.textContent = `Processing ${index + 1}/${fileList.length}: ${file.name}`;
    progressBar.style.width = `${(index / fileList.length) * 100}%`;
    const settings = {
      format: formatSel.value, quality: qualitySlider.value / 100, filter: filterSel.value,
      targetW: parseInt(targetWInput.value, 10) || null, targetH: parseInt(targetHInput.value, 10) || null,
      stripMetadata: metadataCheck.checked,
    };
    worker.postMessage({ file, settings });
  }

  async function finishConversion(error = false) {
    if (error) { progressText.textContent = 'Conversion failed.'; }
    else if (processedBlobs.length === 1) {
      progressBar.style.width = '100%';
      const { blob, fileName } = processedBlobs[0];
      progressText.textContent = 'Conversion complete!';
      downloadBlob(blob, getFileName(fileName, blob.type));
      playSound('sound-success');
      
      copyBtn.style.display = 'inline-block';
      copyBtn.onclick = async () => {
          try {
              if (!navigator.clipboard || !navigator.clipboard.write) {
                   throw new Error("Clipboard API not available.");
              }
              if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) {
                  throw new Error(`Cannot copy ${blob.type} to clipboard.`);
              }
              const clipboardItem = new ClipboardItem({ [blob.type]: blob });
              await navigator.clipboard.write([clipboardItem]);
              showToast('Image copied to clipboard!');
          } catch (err) {
              showToast(err.message || 'Failed to copy image.', true);
              console.error('Copy failed:', err);
          }
      };

      const reader = new FileReader();
      reader.onloadend = () => saveHistory({ dataUrl: reader.result, name: getFileName(fileName, blob.type), date: new Date().toLocaleString() });
      reader.readAsDataURL(blob);

    } else if (processedBlobs.length > 1) {
        progressBar.style.width = '100%';
        progressText.textContent = 'Packaging ZIP...';
        const zip = new JSZip();
        const prefix = batchRenameInput.value.trim() || 'converted';
        processedBlobs.forEach(({ blob, fileName }, index) => {
            const ext = blob.type.split('/')[1] || 'png';
            const newName = `${prefix}-${index + 1}.${ext}`;
            zip.file(newName, blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${prefix}-images.zip`);
        playSound('sound-success');
    }
    setTimeout(() => { convertBtn.disabled = false; clearBtn.disabled = false; }, 1000);
  }

  clearBtn.addEventListener('click', () => {
      fileList = [];
      processedBlobs = [];
      previewImage.src = '';
      previewImage.style.display = 'none';
      uploadText.innerHTML = '📁 Drag & drop image(s) here<br>or click to upload';
      convertBtn.disabled = true;
      fileInput.value = '';
      progressContainer.style.display = 'none';
      progressBar.style.width = '0%';
      copyBtn.style.display = 'none';
      batchRenameContainer.style.display = 'none';
      batchRenameInput.value = '';
      targetWInput.value = '';
      targetHInput.value = '';
      sizeEstimate.textContent = '-- KB';
  });

  // --- History ---
  function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = '';
    if (history.length > 0) {
      historyContainer.style.display = 'block';
      history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<img src="${item.dataUrl}" alt="History preview"><a href="${item.dataUrl}" download="${item.name}">Download</a>`;
        historyList.appendChild(div);
      });
    } else {
      historyContainer.style.display = 'none';
    }
  }

  // --- Voice Control ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.lang = 'en-US';

    voiceBtn.addEventListener('click', () => recognition.start());
    recognition.onstart = () => voiceBtn.textContent = '🔊';
    recognition.onend = () => voiceBtn.textContent = '🎤';
    recognition.onerror = () => voiceBtn.textContent = '🎤';
    recognition.onresult = (e) => {
      const command = e.results[0][0].transcript.toLowerCase();
      if (command.includes('convert')) {
        ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].forEach(fmt => {
          if (command.includes(fmt)) formatSel.value = `image/${fmt === 'jpg' ? 'jpeg' : fmt}`;
        });
        ['high quality', 'medium quality', 'low quality'].forEach((q, i) => {
          if (command.includes(q)) qualitySlider.value = [92, 75, 50][i];
        });
        updateQualityUI();
        if(!convertBtn.disabled) convertBtn.click();
      }
      if(command.includes('clear') || command.includes('reset')) {
        clearBtn.click();
      }
    };
  } else {
    voiceBtn.style.display = 'none';
  }

  // --- Helper Functions ---
  const getFileName = (original, type) => {
      const name = original.substring(0, original.lastIndexOf('.')) || original;
      const ext = type.split('/')[1] || 'bin';
      return `${name}.${ext}`;
  }
  const downloadBlob = (blob, name) => { 
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click(); 
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href); 
  };
  
  // --- Initial Load ---
  loadSettings();
  renderHistory();
  updateQualityUI();
});
 document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('.gradient-text, .gradientai-text');

  links.forEach(link => {
    link.addEventListener('click', e => {
      const soundId = link.getAttribute('data-sound-id');
      const sound = document.getElementById(soundId);
      if (!sound) return;

      e.preventDefault();
      sound.currentTime = 0;
      sound.play();

      sound.addEventListener('ended', function handleEnd() {
        const targetHref = link.getAttribute('href');
        window.location.href = targetHref;
        sound.removeEventListener('ended', handleEnd);
      });
    });
  });
});