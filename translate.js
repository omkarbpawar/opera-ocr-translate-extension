async function translateText(text, targetLang = 'en') {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
    const result = await response.json();
    return result[0][0][0];
  }
  