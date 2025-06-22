import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Breadcrumbs from "./Breadcrumbs";


function ChapterScreen({ user, language, course, onSelect, back, home, goCourse}) {
  const [chapters, setChapters] = useState([]);
  const [modules, setModules] = useState({});
  const [scores, setScores] = useState({});
  const [sortOption, setSortOption] = useState('name-asc');

  useEffect(() => {
    axios.get(`/chapters/${course.id}`).then(res => setChapters(res.data));
  }, [course]);

  useEffect(() => {
    if (user) {
      axios.get(`/results/${user.id}/${language}`).then(res => setScores(res.data));
    }
  }, [user, language]);

  useEffect(() => {
    chapters.forEach(ch => {
      axios.get(`/modules/by_chapter/${ch.id}`).then(res => {
        setModules(prev => ({ ...prev, [ch.id]: res.data }));
      });
    });
  }, [chapters]);

  const add = () => {
    const name = window.prompt('New chapter name');
    if (!name) return;
    axios.post('/chapters', { name, course_id: course.id }).then(res => {
      setChapters([...chapters, { id: res.data.id, name }]);
    });
  };

  const edit = ch => {
    const name = window.prompt('New name', ch.name);
    if (!name) return;
    axios.put(`/chapters/${ch.id}`, { name }).then(() => {
      setChapters(chapters.map(x => x.id === ch.id ? { ...x, name } : x));
    });
  };

  const remove = ch => {
    if (!window.confirm('Delete chapter?')) return;
    axios.delete(`/chapters/${ch.id}`).then(() => {
      setChapters(chapters.filter(x => x.id !== ch.id));
    });
  };

  const chapterProgress = (ch) => {
    const mods = modules[ch.id] || [];
    if (mods.length === 0) return 0;
      const avg =
        moduleScores.length > 0
          ? moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length
          : 0;
  const chapterLastReviewed = (ch) => {
    const mods = modules[ch.id] || [];
    let last = null;
    mods.forEach((m) => {
      const entry = scores[m.name] || {};
      const lr = Array.isArray(entry) ? null : entry.last_reviewed;
      if (lr && (!last || new Date(lr) > new Date(last))) {
        last = lr;
      }
    });
    return last;
  };

  const sortedChapters = [...chapters].sort((a, b) => {
    const progA = chapterProgress(a);
    const progB = chapterProgress(b);
    const lastA = chapterLastReviewed(a);
    const lastB = chapterLastReviewed(b);
    switch (sortOption) {
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'progress':
        return progB - progA;
      case 'last-reviewed':
        if (!lastA && !lastB) return 0;
        if (!lastA) return 1;
        if (!lastB) return -1;
        return new Date(lastB) - new Date(lastA);
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name);
    }
  });

      <div style={{ marginBottom: '1rem' }}>
        <button onClick={add} style={{ marginRight: '1rem' }}>Add Chapter</button>
        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="progress">Progress</option>
          <option value="last-reviewed">Last Reviewed</option>
        </select>
      </div>
        {sortedChapters.map(ch => {
      const entry = scores[m.name] || {};
      const moduleScores = Array.isArray(entry) ? entry : entry.scores || [];
      const avg = moduleScores.length > 0
        ? moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length
        : 0;

      const scaled = Math.min(avg / 0.8, 1);  // scale and cap at 1
      total += scaled;
    });

    return total / mods.length;
  };


  return (
    <div style={{ padding: '2rem' }}>
      <Breadcrumbs
        items={[
          { label: "Courses", onClick: back },
          { label: course.name},
          //{ label: "Select Module" },
        ]}
      />
      <h2>{course.name}</h2>
      <button onClick={add} style={{ marginBottom: '1rem' }}>Add Chapter</button>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
        {chapters.map(ch => {
          const mods = modules[ch.id] || [];
          const modNames = mods.map(m => m.name).slice(0, 3);
          const progress = chapterProgress(ch);
          return (
            <div
              key={ch.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: 4,
                padding: '1rem',
                margin: '0.5rem',
                width: 'calc(100% - 1rem)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: '0.5rem' }}>
                <span
                  onClick={() => edit(ch)}
                  style={{ color: '#007BFF', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Edit
                </span>
                <span
                  onClick={() => remove(ch)}
                  style={{ cursor: 'pointer' }}
                  title="Delete"
                >
                  🗑️
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{ch.name}</div>
                <div className="progress-info" style={{ marginBottom: '0.25rem' }}>
                  Progress: {(progress * 100).toFixed(0)}%
                </div>
                <div className="progress-bar" style={{ height: 10, background: '#eee', marginBottom: '0.5rem' }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${progress * 100}%`, background: '#ff9500', height: '100%' }}
                  />
                </div>
                <div>
                  {modNames.join(', ')}{mods.length > modNames.length ? '...' : ''}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => onSelect(ch)}>Open</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={back} style={{ marginRight: '1rem' }}>Back</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default ChapterScreen;
