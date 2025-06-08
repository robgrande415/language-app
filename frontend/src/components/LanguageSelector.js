import React from 'react';

function LanguageSelector({ onSelect, next }) {
  const choose = lang => {
    onSelect(lang);
    next();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Language</h2>
      <button onClick={() => choose('French')}>French</button>
      <button onClick={() => choose('Spanish')}>Spanish</button>
    </div>
  );
}

export default LanguageSelector;
