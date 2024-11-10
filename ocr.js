async function performOCR(imageUrl) {
  const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng', {
    logger: (m) => console.log(m),
  });
  return text;
}
