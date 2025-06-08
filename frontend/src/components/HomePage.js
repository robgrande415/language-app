import React, { useState, useEffect } from 'react';
import axios from 'axios';

function HomePage({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/users').then(res => setUsers(res.data));
  }, []);

  const createUser = () => {
    axios.post('http://localhost:5000/users', { name }).then(res => {
      onLogin(res.data);
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select User</h2>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            <button onClick={() => onLogin(u)}>{u.name}</button>
          </li>
        ))}
      </ul>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="New user" />
      <button onClick={createUser}>Create</button>
    </div>
  );
}

export default HomePage;
