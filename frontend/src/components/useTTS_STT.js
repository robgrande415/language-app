import { useState, useRef } from 'react';

export function useTTS_STT({
  ttsLang = 'en-US',
  sttLang = 'en-US',
  ttsApi = '',
  sttApi = '',
  silenceDelay = 3000,
  openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY,
  openaiModel = 'gpt-4o-mini-transcribe',
} = {}) {
  const [ttsLoading, setTtsLoading] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const playTTS = (text) => {
    if (!window.speechSynthesis) return;
    setTtsLoading(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLang;
    utterance.onend = () => setTtsLoading(false);
    speechSynthesis.speak(utterance);
  };

  const playOpenAITTS = async (text) => {
    if (!ttsApi) return;
    try {
      setTtsLoading(true);
      const res = await fetch(ttsApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: ttsLang }),
      });
      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setTtsLoading(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch (err) {
      console.error('TTS error', err);
      setTtsLoading(false);
    }
  };

  const sttToText = (callback) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = sttLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    setIsListening(true);
    let silenceTimer;

    const resetSilenceTimer = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, silenceDelay);
    };

    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((r) => r[0].transcript).join(' ');
      callback(text);
      resetSilenceTimer();
    };

    recognition.onerror = (e) => {
      console.error('STT error', e);
      clearTimeout(silenceTimer);
      setIsListening(false);
    };

    recognition.onend = () => {
      clearTimeout(silenceTimer);
      setIsListening(false);
    };

    recognition.start();
    resetSilenceTimer();
  };

  const startRecording = async (onStop) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onStop && onStop(blob);
      setRecording(false);
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const openaiSTT = async (audioBlob, callback) => {
    try {
      setSttLoading(true);
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', openaiModel);

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      const data = await res.json();
      callback && callback(data.text);
    } catch (err) {
      console.error('OpenAI STT error', err);
    } finally {
      setSttLoading(false);
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
