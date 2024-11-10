chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "captureArea") {
    const { startX, startY, endX, endY } = request;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const imageUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    // Load the image and crop it to the selected area
    const croppedImage = await cropImage(imageUrl, startX, startY, endX - startX, endY - startY);
    chrome.runtime.sendMessage({ action: "processImage", image: croppedImage });
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
