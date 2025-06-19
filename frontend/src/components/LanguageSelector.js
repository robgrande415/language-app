import React from 'react';

function LanguageSelector({ onSelect, next, goExport, home }) {
  const choose = lang => {
    onSelect(lang);
    next();
  };

  return (
    <div className="page">
      <h2>Select Language</h2>
      <button className="btn-secondary" onClick={() => choose('French')} style={{ marginRight: '0.5rem' }}>
        French
      </button>
      <button className="btn-secondary" onClick={() => choose('Spanish')}>
        Spanish
      </button>
      <div style={{ marginTop: '1rem' }}>
        <button className="btn-primary" onClick={goExport} style={{ marginRight: '1rem' }}>
          Session Export
        </button>
        <button className="btn-secondary" onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default LanguageSelector;
