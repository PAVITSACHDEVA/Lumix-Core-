document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  const loadingText = document.querySelector('.loading-title');
  const loaderFill = document.getElementById('loaderFill');
  const container = document.querySelector('.container');
  const title = 'Image Converter Pro';
  let idx = 0;
  const MIN_LOAD_TIME = 3000;
  const startTime = Date.now();

  // ✅ Safe check
  if (!loading || !loadingText || !loaderFill || !container) return;

  // Typewriter effect
  function type() {
    if (idx <= title.length) {
      loadingText.textContent = title.slice(0, idx++);
      setTimeout(type, 120);
    }
  }
  type();

  // Progress bar fill
  let width = 0;
  const progressInterval = setInterval(() => {
    if (width < 90) {
      width += 2;
      loaderFill.style.width = width + "%";
    }
  }, 60);

  // Reveal main UI after load
  window.addEventListener('load', () => {
    clearInterval(progressInterval);
    loaderFill.style.width = "100%";
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);

    setTimeout(() => {
      loading.style.opacity = '0';
      loading.addEventListener('transitionend', () => {
        loading.style.display = 'none';
      });
      container.classList.add('show');
    }, remainingTime + 500);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const loading = document.getElementById('loading');
  const loadingText = document.querySelector('.loading-title');
  const loaderFill = document.getElementById('loaderFill');
  const container = document.querySelector('.container');
  const title = 'Image Converter Pro';
  let idx = 0;
  const MIN_LOAD_TIME = 3000;
  const startTime = Date.now();

  // Typewriter effect
  function type() {
    if (idx <= title.length) {
      loadingText.textContent = title.slice(0, idx++);
      setTimeout(type, 120);
    }
  }
  type();

  // Progress bar fill
  let width = 0;
  const progressInterval = setInterval(() => {
    if (width < 90) {
      width += 2;
      loaderFill.style.width = width + "%";
    }
  }, 60);

  // Reveal main UI after load
  window.addEventListener('load', () => {
    clearInterval(progressInterval);
    loaderFill.style.width = "100%";
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);

    setTimeout(() => {
      loading.style.opacity = '0';
      loading.addEventListener('transitionend', () => {
        loading.style.display = 'none';
      });
      container.classList.add('show');
    }, remainingTime + 500);
  });
  function initSoundNavigation() {
  const links = document.querySelectorAll('[data-sound-id]');

  links.forEach(link => {
    link.addEventListener('click', e => {
      const soundId = link.getAttribute('data-sound-id');
      const sound = document.getElementById(soundId);
      if (!sound) return;

      e.preventDefault();

      // Play sound and wait for it to finish
      sound.currentTime = 0;
      sound.play();

      sound.onended = () => {
        window.location.href = link.getAttribute('href');
      };

      // Fallback: if sound doesn't load, navigate anyway after 2s
      setTimeout(() => {
        if (!sound.paused) return; // still playing
        window.location.href = link.getAttribute('href');
      }, 2000);
    });
  });
}


});

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initConverter();
  initSoundNavigation();

});

function initLoader() {
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const loaderFill = document.getElementById('loaderFill');
  const container = document.querySelector('.container');
  const title = 'Browser Image Converter';
  let idx = 0;
  const MIN_LOAD_TIME = 3000;
  const startTime = Date.now();

  function type() {
    if (idx <= title.length) {
      loadingText.textContent = title.slice(0, idx++);
      setTimeout(type, 120);
    }
  }
  type();

  let width = 0;
  const progressInterval = setInterval(() => {
    if (width < 90) {
      width += 2;
      loaderFill.style.width = width + "%";
    }
  }, 60);

  window.addEventListener('load', () => {
    clearInterval(progressInterval);
    loaderFill.style.width = "100%";
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOAD_TIME - elapsedTime);

    setTimeout(() => {
      loading.style.opacity = '0';
      loading.addEventListener('transitionend', () => {
        loading.style.display = 'none';
      });
      container.classList.add('show');
    }, remainingTime + 500);
  });
}

function initConverter() {
  const errorBox = document.getElementById('error-message');
  const dragZone = document.querySelector('.upload-box');
  const fileInput = document.getElementById('fileUpload');
  const previewImage = document.getElementById('previewImage');
  const formatSel = document.getElementById('format');
  const qualitySel = document.getElementById('quality');
  const convertBtn = document.getElementById('convertBtn');
  const clearBtn = document.getElementById('clearBtn');
  const progress = document.querySelector('.progress');
  const progressBar = document.querySelector('.progress-bar');
  const downloadLink = document.getElementById('downloadLink');

  const widthInput = document.getElementById('widthInput');
  const heightInput = document.getElementById('heightInput');
  const aspectRatioCheck = document.getElementById('aspectRatioCheck');
  const filterSel = document.getElementById('filter');
  const fileNameInput = document.getElementById('fileNameInput');

  let imgEl = null;
  let originalFile = null;

  dragZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragZone.classList.add('hover');
  });

  dragZone.addEventListener('dragleave', () => {
    dragZone.classList.remove('hover');
  });

  dragZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragZone.classList.remove('hover');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      fileInput.files = e.dataTransfer.files;
      handleFile(file);
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    errorBox.classList.remove('show');
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    } else if (file) {
      errorBox.textContent = 'Oops! Please select a valid image file.';
      errorBox.classList.add('show');
      setTimeout(() => errorBox.classList.remove('show'), 4000);
    }
  });

  function handleFile(file) {
    originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';
      imgEl = new Image();
      imgEl.onload = () => {
        widthInput.value = imgEl.naturalWidth;
        heightInput.value = imgEl.naturalHeight;
        convertBtn.disabled = false;
      };
      imgEl.src = e.target.result;

      const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      fileNameInput.value = fileName;
    };
    reader.readAsDataURL(file);
  }

  widthInput.addEventListener('input', () => {
    if (aspectRatioCheck.checked && imgEl) {
      const aspectRatio = imgEl.naturalHeight / imgEl.naturalWidth;
      heightInput.value = Math.round(widthInput.value * aspectRatio);
    }
  });

  heightInput.addEventListener('input', () => {
    if (aspectRatioCheck.checked && imgEl) {
      const aspectRatio = imgEl.naturalWidth / imgEl.naturalHeight;
      widthInput.value = Math.round(heightInput.value * aspectRatio);
    }
  });

  filterSel.addEventListener('change', () => {
    previewImage.style.filter = filterSel.value;
  });

  convertBtn.addEventListener('click', async () => {
    if (!imgEl) return;
    await simulateProgress();
    const canvas = document.createElement('canvas');
    const newWidth = parseInt(widthInput.value, 10);
    const newHeight = parseInt(heightInput.value, 10);
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    ctx.filter = filterSel.value;
    ctx.drawImage(imgEl, 0, 0, newWidth, newHeight);

    const fmt = formatSel.value;
    const q = parseFloat(qualitySel.value);
    const dataUrl = (fmt === 'image/png') ? canvas.toDataURL(fmt) : canvas.toDataURL(fmt, q);

    const ext = fmt.split('/')[1] || 'png';
    const a = document.createElement('a');
    a.href = dataUrl;
    const newFileName = fileNameInput.value || 'converted';
    a.download = `${newFileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  clearBtn.addEventListener('click', () => {
    previewImage.removeAttribute('src');
    previewImage.style.display = 'none';
    previewImage.style.filter = 'none';
    convertBtn.disabled = true;
    downloadLink.style.display = 'none';
    fileInput.value = '';
    imgEl = null;
    originalFile = null;
    errorBox.classList.remove('show');
    widthInput.value = '';
    heightInput.value = '';
    filterSel.value = 'none';
    fileNameInput.value = '';
    progressBar.style.width = '0%';
  });

  function simulateProgress() {
    progress.style.display = 'block';
    progressBar.style.width = '0%';
    let width = 0;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (width >= 100) {
          clearInterval(interval);
          progress.style.display = 'none';
          resolve();
        } else {
          width += 12;
          progressBar.style.width = width + '%';
        }
      }, 100);
    });
  }
}

function initSoundNavigation() {
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
}
