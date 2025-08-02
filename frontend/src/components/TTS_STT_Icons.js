import React from 'react';

// Speaker (TTS) icons
export const SpeakerFree = (props) => (
  <span title="Free TTS" style={{ color: '#2d8f2d', verticalAlign: 'middle', marginRight: 4, ...props.style }}>
    {/* Unicode with green */}
    <span role="img" aria-label="Speaker Free">🔊</span>
    <span style={{ fontSize: '0.7em', marginLeft: 2, color: '#2d8f2d' }}>free</span>
  </span>
);

export const SpeakerPaid = (props) => (
  <span title="OpenAI TTS" style={{ color: '#007aff', verticalAlign: 'middle', marginRight: 4, ...props.style }}>
    {/* Unicode with blue */}
    <span role="img" aria-label="Speaker Paid">🔊</span>
    <span style={{ fontSize: '0.7em', marginLeft: 2, color: '#007aff' }}>ai</span>
  </span>
);

// Mic (STT) icons
export const MicFree = (props) => (
  <span title="Free STT" style={{ color: '#2d8f2d', verticalAlign: 'middle', marginRight: 4, ...props.style }}>
    <span role="img" aria-label="Mic Free">🎤</span>
    <span style={{ fontSize: '0.7em', marginLeft: 2, color: '#2d8f2d' }}>free</span>
  </span>
);

export const MicPaid = (props) => (
  <span title="OpenAI Whisper" style={{ color: '#007aff', verticalAlign: 'middle', marginRight: 4, ...props.style }}>
    <span role="img" aria-label="Mic Paid">🎤</span>
    <span style={{ fontSize: '0.7em', marginLeft: 2, color: '#007aff' }}>ai</span>
  </span>
);
