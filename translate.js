async function translateText(text, targetLang = 'en') {
  try {
    console.log("Translating Text:", text);
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const result = await response.json();
    console.log("Translation Result:", result[0][0][0]);
    return result[0][0][0];
  } catch (error) {
    console.error("Translation Error:", error);
    return "Translation failed. Please try again.";
  }
}
