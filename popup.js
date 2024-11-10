document.getElementById("scanButton").addEventListener("click", async () => {
    const file = document.getElementById("imageInput").files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      const text = await performOCR(imageUrl);
      const translatedText = await translateText(text, 'en');
      document.getElementById("result").innerText = translatedText;
    } else {
      alert("Please select an image first.");
    }
  });
  