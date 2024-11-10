async function performOCR(imageUrl) {
  console.log("Starting OCR on:", imageUrl);
  const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng', {
    logger: (m) => console.log(m),  // Log OCR process
  });
  console.log("Extracted Text from OCR:", text);
  return text;
}
