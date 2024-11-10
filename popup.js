document.getElementById("scanButton").addEventListener("click", async () => {
  const file = document.getElementById("imageInput").files[0];
  if (file) {
    console.log("File selected:", file);
    const imageUrl = URL.createObjectURL(file);
    const text = await performOCR(imageUrl);
    console.log("OCR Result:", text); // Check OCR result
    const translatedText = await translateText(text, 'en');
    console.log("Translated Text:", translatedText); // Check translation result
    document.getElementById("result").innerText = translatedText;
  } else {
    console.log("No file selected");
    alert("Please select an image first.");
  }
});
