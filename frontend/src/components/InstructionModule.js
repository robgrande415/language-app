import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function InstructionModule({ text, next, home, regenerate }) {
  const [loading, setLoading] = useState(false);

  const handleRegenerate = () => {
    setLoading(true);
    regenerate().finally(() => setLoading(false));
  };

  return (
    <div className="page">
      <h2>Instruction</h2>
      <div style={{ marginBottom: '1rem' }}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      <div>
        <button
          className="btn-secondary"
          onClick={handleRegenerate}
          style={{ marginRight: '1rem' }}
          disabled={loading}
        >
          {loading ? 'Regenerating...' : 'Regenerate'}
        </button>
        <button className="btn-primary" onClick={next} style={{ marginRight: '1rem' }}>
          Next
        </button>
        <button className="btn-secondary" onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default InstructionModule;
