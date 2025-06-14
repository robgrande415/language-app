import React, { useState } from 'react';

function ExportPage({ home, user }) {
  const [filename, setFilename] = useState('session.csv');
  const [errorsFilename, setErrorsFilename] = useState('errors.csv');

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
      console.error('❌ Failed to download CSV:', err);
    }
  };

  const downloadErrors = async () => {
    try {
      const response = await fetch(`/session/${user.id}/errors`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = errorsFilename || 'errors.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('❌ Failed to download errors CSV:', err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Session Export</h2>
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
        <input
          value={errorsFilename}
          onChange={e => setErrorsFilename(e.target.value)}
          placeholder="Errors filename (e.g., errors.csv)"
          style={{ marginRight: '1rem' }}
        />
        <button onClick={downloadErrors}>Download Errors</button>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default ExportPage;
