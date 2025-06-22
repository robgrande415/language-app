import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CourseScreen({ user, language, onSelect, home }) {
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState({});
  const [modules, setModules] = useState({});
  const [scores, setScores] = useState({});

  useEffect(() => {
    axios.get(`/courses/${language}`).then(res => setCourses(res.data));
  }, [language]);

  useEffect(() => {
    if (user) {
      axios.get(`/results/${user.id}/${language}`).then(res => setScores(res.data));
    }
  }, [user, language]);

  useEffect(() => {
    courses.forEach(c => {
      axios.get(`/chapters/${c.id}`).then(res => {
        setChapters(prev => ({ ...prev, [c.id]: res.data }));
        res.data.forEach(ch => {
          axios.get(`/modules/by_chapter/${ch.id}`).then(mres => {
            setModules(prev => ({ ...prev, [ch.id]: mres.data }));
          });
        });
      });
    });
  }, [courses]);

  const add = () => {
    const name = window.prompt('New course name');
    if (!name) return;
    axios.post('/courses', { name, language }).then(res => {
      setCourses([...courses, { id: res.data.id, name }]);
    });
  };

  const edit = c => {
    const name = window.prompt('New name', c.name);
    if (!name) return;
    axios.put(`/courses/${c.id}`, { name }).then(() => {
      setCourses(courses.map(x => x.id === c.id ? { ...x, name } : x));
    });
  };

  const remove = c => {
    if (!window.confirm('Delete course?')) return;
    axios.delete(`/courses/${c.id}`).then(() => {
      setCourses(courses.filter(x => x.id !== c.id));
    });
  };

  const courseProgress = (c) => {
    const chs = chapters[c.id] || [];
    const allMods = chs.flatMap(ch => modules[ch.id] || []);
    if (allMods.length === 0) return 0;
    let good = 0;
    allMods.forEach(m => {
      const entry = scores[m.name] || {};
      const moduleScores = Array.isArray(entry) ? entry : entry.scores || [];
      const avg = moduleScores.length > 0 ? moduleScores.reduce((a,b) => a + b, 0) / moduleScores.length : 0;
      if (avg >= 0.8) good += 1;
    });
    return good / allMods.length;
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Course</h2>
      <button onClick={add} style={{ marginBottom: '1rem' }}>Add Course</button>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
        {courses.map(c => {
          const chs = chapters[c.id] || [];
          const chNames = chs.map(ch => ch.name).slice(0,3);
          const progress = courseProgress(c);
          return (
            <div
              key={c.id}
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
                  onClick={() => edit(c)}
                  style={{ color: '#007BFF', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Edit
                </span>
                <span
                  onClick={() => remove(c)}
                  style={{ cursor: 'pointer' }}
                  title="Delete"
                >
                  🗑️
                </span>
              </div>

              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{c.name}</div>
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
                  {chNames.join(', ')}{chs.length > chNames.length ? '...' : ''}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => onSelect(c)}>Open</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default CourseScreen;
