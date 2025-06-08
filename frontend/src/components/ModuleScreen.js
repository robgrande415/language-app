import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ModuleScreen({ language, cefr, setCefr, setModule, next }) {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (language) {
      axios.get(`http://localhost:5000/modules/${language}`).then(res => setModules(res.data));
    }
  }, [language]);

  const filtered = modules.filter(m => m.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Module</h2>
      <div>
        {['A1','A2','B1','B2','C1','C2'].map(lvl => (
          <label key={lvl} style={{ marginRight: '1rem' }}>
            <input type="radio" checked={cefr === lvl} onChange={() => setCefr(lvl)} /> {lvl}
          </label>
        ))}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
      <ul>
        {filtered.map(m => (
          <li key={m}>
            <button onClick={() => { setModule(m); next(); }}>{m}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ModuleScreen;
