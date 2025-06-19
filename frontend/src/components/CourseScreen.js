import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CourseScreen({ language, onSelect, home }) {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    axios.get(`/courses/${language}`).then(res => setCourses(res.data));
  }, [language]);

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

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Course</h2>
      <button onClick={add} style={{ marginBottom: '1rem' }}>Add Course</button>
      <ul>
        {courses.map(c => (
          <li key={c.id}>
            <button onClick={() => onSelect(c)} style={{ marginRight: '0.5rem' }}>{c.name}</button>
            <button onClick={() => edit(c)} style={{ marginRight: '0.5rem' }}>Edit</button>
            <button onClick={() => remove(c)}>Delete</button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default CourseScreen;
