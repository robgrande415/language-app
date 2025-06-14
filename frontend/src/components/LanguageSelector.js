import React from 'react';

function LanguageSelector({ onSelect, next, goExport, home }) {
  const choose = lang => {
    onSelect(lang);
    next();
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Language</h2>
      <button onClick={() => choose('French')}>French</button>
      <button onClick={() => choose('Spanish')}>Spanish</button>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={goExport} style={{ marginRight: '1rem' }}>Session Export</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default LanguageSelector;
