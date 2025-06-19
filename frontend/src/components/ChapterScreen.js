import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ChapterScreen({ course, onSelect, back, home }) {
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    axios.get(`/chapters/${course.id}`).then(res => setChapters(res.data));
  }, [course]);

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

  return (
    <div style={{ padding: '2rem' }}>
      <h2>{course.name}</h2>
      <button onClick={add} style={{ marginBottom: '1rem' }}>Add Chapter</button>
      <ul>
        {chapters.map(ch => (
          <li key={ch.id}>
            <button onClick={() => onSelect(ch)} style={{ marginRight: '0.5rem' }}>{ch.name}</button>
            <button onClick={() => edit(ch)} style={{ marginRight: '0.5rem' }}>Edit</button>
            <button onClick={() => remove(ch)}>Delete</button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={back} style={{ marginRight: '1rem' }}>Back</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default ChapterScreen;
