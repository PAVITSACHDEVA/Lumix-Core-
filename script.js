const text = document.title;
let i = 0;
const generateBtn = document.getElementById("generateBtn");
const generatedImage = document.getElementById("generatedImage");
const progress = document.querySelector(".progress");
const progressBar = document.querySelector(".progress-bar");

function simulateProgress() {
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
        width += 10;
        progressBar.style.width = width + "%";
      }
    }, 120);
  });
}

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

window.addEventListener("load", () => {
  typeWriter(startProgressBar);
});

function autoDownloadImageFromElement(imgElement) {
  const canvas = document.createElement("canvas");
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgElement, 0, 0);

  canvas.toBlob(blob => {
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = "generated-image.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
  }, "image/jpeg");
}


/*generateBtn.addEventListener("click", async () => {
  generatedImage.style.display = "none";
  await simulateProgress();

  const randomNum = Math.floor(Math.random() * 1000);
  const url = `https://picsum.photos/400/300?random=${randomNum}`;

  const tempImg = new Image();
  tempImg.crossOrigin = "anonymous";
  tempImg.onload = () => {
    generatedImage.src = url;
    generatedImage.style.display = "block";
    generatedImage.style.opacity = "0";
    setTimeout(() => {
      generatedImage.style.opacity = "1";
    }, 50);
    autoDownloadImage(url);
  };
  tempImg.onerror = () => {
    alert("Image failed to load.");
  };
  tempImg.src = url;
});*/

generateBtn.addEventListener("click", async () => {
  generatedImage.style.display = "none";
  await simulateProgress();

  const randomNum = Math.floor(Math.random() * 1000);
  const url = `https://picsum.photos/400/300?random=${randomNum}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Image fetch failed");

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);

    // Set the image source
    generatedImage.src = imageUrl;

    // Show the image
    generatedImage.style.display = "block";
    generatedImage.style.opacity = "0";
    setTimeout(() => {
      generatedImage.style.opacity = "1";
    }, 50);

    // Directly download the Blob
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "generated-image.jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the URL after a short delay to allow the image to render
    setTimeout(() => {
      URL.revokeObjectURL(imageUrl);
    }, 500);

  } catch (error) {
    alert("Image failed to load or download.");
    console.error(error);
  }
});

const fallbackImages = [
  "/assest/fallback(3).jpeg",
  "/assest/Fallback(1).jpeg",
  "/assest/fallback(4).jpeg",
  "/assest/fallback(3).jpeg",
  "/assest/fallback(3).jpeg",
  "/assest/fallback(3).jpeg",
  "/assest/fallback(3).jpeg",
  "/assest/fallback(3).jpeg"
];

function handlePreviewError() {
  const img = document.getElementById("previewImage");
  const fallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  img.src = fallback;
  img.alt = "Fallback image";
  //showToast("Preview failed — showing fallback image.");
}

generatedImage.src = ""; // Clear previous
generatedImage.src = newImageUrl;



 
