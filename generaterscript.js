 let text = "Random Image Generator";
let i = 0;


document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const generateBtn = document.getElementById('generateBtn');
    const progress = document.querySelector(".progress");
    const progressBar = document.querySelector(".progress-bar");
    const editor = document.getElementById('editor');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const imagePlaceholder = document.getElementById('image-placeholder');
    const filterInputs = document.querySelectorAll('#filterControls input[type="range"]');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const downloadBtn = document.getElementById('downloadBtn');
    const filenameInput = document.getElementById('filename');
    const formatSelect = document.getElementById('format');
    const qualityGroup = document.getElementById('qualityGroup');
  const qualitySlider = document.getElementById('quality');
 
typeWriter(startProgressBar); // Show text, then start progress
//     const progress = document.querySelector(".progress");
// const progressBar = document.querySelector(".progress-bar");

// function simulateProgress() {
//   progress.style.display = "block";
//   progressBar.style.width = "0%";
//   let width = 0;

//   return new Promise(resolve => {
//     const interval = setInterval(() => {
//       if (width >= 100) {
//         clearInterval(interval);
//         progress.style.display = "none";
//         resolve();
//       } else {
//         width += 10;
//         progressBar.style.width = width + "%";
//       }
//     }, 120);
//   });
// }

function typeWriter(callback) {
  if (i <= text.length) {
    document.getElementById("loadingText").textContent = text.substring(0, i);
    i++;
    setTimeout(() => typeWriter(callback), 100);
  } else {
    callback();
  }
}

function startProgressBar() {
  let width = 0;
  const loaderFill = document.getElementById("loaderFill");
  const interval = setInterval(() => {
    if (width < 100) {
      width += 2;
      loaderFill.style.width = width + "%";
    } else {
      clearInterval(interval);
      fadeOutLoader();
    }
  }, 100);
}

function fadeOutLoader() {
  const loading = document.getElementById("loading");
  const content = document.getElementById("content");

  loading.style.opacity = "0";
  setTimeout(() => {
    loading.style.display = "none";
    document.body.style.overflow = "auto";
    content.style.display = "flex";
    content.classList.add("show");
  }, 1000);
}


    let originalImage = null; // Store the original Image object
    const originalCanvas = document.createElement('canvas'); // Hidden canvas for original data
    const originalCtx = originalCanvas.getContext('2d');

    const defaultFilters = {
        grayscale: 0, sepia: 0, contrast: 100,
        brightness: 100, blur: 0, invert: 0
    };
    let currentFilters = { ...defaultFilters };

    // --- GENERATOR LOGIC ---
    const simulateProgress = () => {
        progress.style.display = "block";
        progressBar.style.width = "0%";
        let width = 0;
        return new Promise(resolve => {
            const interval = setInterval(() => {
                if (width >= 100) {
                    clearInterval(interval);
                    progress.style.display = "none";
                    resolve();
                } else {
                    width += 5 + Math.random() * 10; // More realistic progress
                    progressBar.style.width = Math.min(width, 100) + "%";
                }
            }, 100);
        });
    };

    generateBtn.addEventListener('click', async () => {
        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";
        await simulateProgress();

        const randomNum = Math.floor(Math.random() * 1000);
        const url = `https://picsum.photos/1200/800?random=${randomNum}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Image fetch failed');
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            loadImageToEditor(imageUrl);
        } catch (error) {
            alert("Failed to generate image. Please try again.");
            console.error(error);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "✨ Generate New Image";
        }
    });

    const loadImageToEditor = (url) => {
        originalImage = new Image();
        originalImage.crossOrigin = "anonymous";
        originalImage.onload = () => {
            // Set canvas sizes
            originalCanvas.width = previewCanvas.width = originalImage.width;
            originalCanvas.height = previewCanvas.height = originalImage.height;

            // Draw to hidden original canvas
            originalCtx.drawImage(originalImage, 0, 0);

            // Show the editor and hide placeholder
            editor.classList.remove('hidden');
            imagePlaceholder.style.display = 'none';
            previewCanvas.style.display = 'block';

            resetFilters(); // Reset and apply
        };
        originalImage.src = url;
    };

    // --- FILTER LOGIC ---
    const applyFilters = () => {
        if (!originalImage) return;
        let filterString = '';
        for (const [key, value] of Object.entries(currentFilters)) {
            const input = document.getElementById(key);
            const unit = input.dataset.unit;
            if (value !== defaultFilters[key]) {
                filterString += `${key}(${value}${unit}) `;
            }
        }
        ctx.filter = filterString.trim();
        ctx.drawImage(originalCanvas, 0, 0); // Draw from the clean original canvas
    };

    filterInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            currentFilters[e.target.id] = e.target.value;
            applyFilters();
        });
    });

    const resetFilters = () => {
        currentFilters = { ...defaultFilters };
        filterInputs.forEach(input => {
            input.value = defaultFilters[input.id];
        });
        applyFilters();
    };
    resetFiltersBtn.addEventListener('click', resetFilters);


    // --- DOWNLOAD LOGIC ---
    formatSelect.addEventListener('change', () => {
        qualityGroup.style.display = formatSelect.value === 'image/jpeg' ? 'block' : 'none';
    });

    downloadBtn.addEventListener('click', () => {
        const format = formatSelect.value;
        const quality = parseFloat(qualitySlider.value);
        const extension = format.split('/')[1];
        const filename = `${filenameInput.value}.${extension}`;

        previewCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, format, quality);
    });
});