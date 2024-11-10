document.getElementById("translateButton").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startSelection" });
  });
});

chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === "processImage") {
    const text = await performOCR(request.image);
    const translatedText = await translateText(text, 'en');
    document.getElementById("result").innerText = translatedText;
  }
});
