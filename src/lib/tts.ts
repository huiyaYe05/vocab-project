export function speakEnglish(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const t = (text ?? "").trim();
  if (!t) return;

  synth.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = "en-US";
  u.rate = 1;
  u.pitch = 1;
  synth.speak(u);
}

