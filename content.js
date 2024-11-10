console.log("Content script loaded.");

let startX, startY, endX, endY;
let selectionBox;
let isSelecting = false;

// Function to create an overlay for area selection
function createOverlay() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
  overlay.style.cursor = "crosshair";
  overlay.style.zIndex = "9999";
  document.body.appendChild(overlay);

  // Mouse down to start selection
  overlay.addEventListener("mousedown", (e) => {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;

    // Create selection box
    selectionBox = document.createElement("div");
    selectionBox.style.position = "fixed";
    selectionBox.style.border = "2px dashed #fff";
    selectionBox.style.zIndex = "10000";
    document.body.appendChild(selectionBox);
  });

  // Mouse move to draw the selection box
  overlay.addEventListener("mousemove", (e) => {
    if (isSelecting) {
      endX = e.clientX;
      endY = e.clientY;
      updateSelectionBox();
    }
  });

  // Mouse up to finalize the selection
  overlay.addEventListener("mouseup", async () => {
    isSelecting = false;
    overlay.remove();
    selectionBox.remove();

    // Send the selected area coordinates to the background script
    chrome.runtime.sendMessage({ action: "captureArea", startX, startY, endX, endY });
  });
}

// Update the selection box dimensions
function updateSelectionBox() {
  selectionBox.style.left = Math.min(startX, endX) + "px";
  selectionBox.style.top = Math.min(startY, endY) + "px";
  selectionBox.style.width = Math.abs(startX - endX) + "px";
  selectionBox.style.height = Math.abs(startY - endY) + "px";
}

// Process the captured image and crop to the selected area
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === "processImage") {
    const { imageUrl, startX, startY, endX, endY } = request;
    const croppedImage = await cropImage(imageUrl, startX, startY, endX - startX, endY - startY);
    chrome.runtime.sendMessage({ action: "processCroppedImage", image: croppedImage });
  }
});

// Crop the captured image to the selected region
async function cropImage(imageUrl, x, y, width, height) {
  const img = new Image();
  img.src = imageUrl;

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Draw the selected area of the image on the canvas
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
  });
}
