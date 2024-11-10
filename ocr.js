Tesseract.workerOptions = {
  workerPath: chrome.runtime.getURL("lib/worker.min.js"),
  langPath: chrome.runtime.getURL("lib/tessdata/"),
  corePath: chrome.runtime.getURL("lib/tesseract.min.js"),
};

async function performOCR(imageUrl) {
  const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng', {
    logger: (m) => console.log(m)
  });
  return text;
}
