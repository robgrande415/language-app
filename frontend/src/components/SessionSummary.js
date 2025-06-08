import React from 'react';

function SessionSummary({ restart, home, user }) {
  const download = () => {
    window.location = `http://localhost:5000/session/${user.id}/export`;
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Congrats!</h2>
      <button onClick={restart}>Continue</button>
      <button onClick={home}>Home</button>
      <button onClick={download}>Download CSV</button>
    </div>
  );
}

export default SessionSummary;
