import { useRef, useState } from 'react';
import axios from 'axios';

// Utility: get BCP-47 language code (e.g. 'es', 'fr', 'de'), fallback to 'en'
function normalizeLang(lang) {
  if (lang === 'French') return 'fr-FR';
  if (lang === 'English') return 'en-US';
  if (lang === 'Spanish') return 'es-ES';
  if (!lang) return 'en';
  // Optionally: map app language codes to browser/tts codes here
  return lang;
}

export function useTTS_STT({
  ttsLang,
  sttLang,
  ttsApi = '/api/tts/openai',
  sttApi = '/api/stt/openai',
  audioOutput = false,
}) {
  // TTS (browser)
  const playTTS = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = normalizeLang('English');
      window.speechSynthesis.speak(utter);
    } else {
      alert('Speech Synthesis not supported in this browser.');
    }
  };

  // TTS (OpenAI)
  const [ttsLoading, setTtsLoading] = useState(false);
  const playOpenAITTS = async (text) => {
    setTtsLoading(true);
    try {
      const res = await axios.post(ttsApi, { text, language: normalizeLang(ttsLang) }, { responseType: audioOutput ? 'arraybuffer' : 'blob' });
      const blob = new Blob([res.data], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to play TTS audio.');
    } finally {
      setTtsLoading(false);
    }
  };

  // STT (browser)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const sttToText = (onResult) => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = normalizeLang(sttLang);
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.onresult = (event) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          onResult(event.results[0][0].transcript);
        }
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
    setIsListening(true);
    recognitionRef.current.lang = normalizeLang(sttLang); // always update
    recognitionRef.current.start();
  };

  // STT (OpenAI)
  const [sttLoading, setSttLoading] = useState(false);
  const openaiSTT = async (audioBlob, onResult) => {
    setSttLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('language', normalizeLang(sttLang));
      const res = await axios.post(sttApi, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data && res.data.text) onResult(res.data.text);
    } catch (e) {
      alert('Failed to transcribe audio.');
    } finally {
      setSttLoading(false);
    }
  };

  // Utility for recording audio for OpenAI STT
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const startRecording = (onStop) => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert('Audio recording not supported in this browser.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorderRef.current = new window.MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = e => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onStop(blob);
      };
      mediaRecorderRef.current.start();
      setRecording(true);
    });
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return {
    playTTS,
    playOpenAITTS,
    ttsLoading,
    sttToText,
    isListening,
    openaiSTT,
    sttLoading,
    startRecording,
    stopRecording,
    recording,
  };
}
