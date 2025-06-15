import React, { useState } from 'react';

function InstructionModule({ text, next, home, regenerate }) {
  const [loading, setLoading] = useState(false);
  const handleRegenerate = () => {
    setLoading(true);
    regenerate().finally(() => setLoading(false));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Instruction</h2>
      <pre>{text}</pre>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleRegenerate} style={{ marginRight: '1rem' }} disabled={loading}>
          {loading ? 'Regenerating...' : 'Regenerate'}
        </button>
        <button onClick={next} style={{ marginRight: '1rem' }}>Next</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default InstructionModule;
