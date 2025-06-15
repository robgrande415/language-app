import React from 'react';

function InstructionModule({ text, next, home }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Instruction</h2>
      <pre>{text}</pre>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={next} style={{ marginRight: '1rem' }}>Next</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default InstructionModule;
