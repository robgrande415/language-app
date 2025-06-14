import React, { useState } from 'react';

function SessionSummary({ restart, home, user }) {
  const [filename, setFilename] = useState('session.csv');

  const download = async () => {
    try {
      const response = await fetch(`/session/${user.id}/export`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'session.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Failed to download CSV:", err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🎉 Congrats!</h2>
      <p>You’ve completed the module.</p>
      <div style={{ marginTop: '1rem' }}>
        <input
          value={filename}
          onChange={e => setFilename(e.target.value)}
          placeholder="Filename (e.g., my-session.csv)"
          style={{ marginRight: '1rem' }}
        />
        <button onClick={download}>Download CSV</button>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={restart} style={{ marginRight: '1rem' }}>Continue</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default SessionSummary;
