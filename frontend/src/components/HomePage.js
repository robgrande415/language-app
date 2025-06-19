import React, { useState, useEffect } from 'react';
import axios from 'axios';

function HomePage({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    axios.get('/users').then(res => setUsers(res.data));
  }, []);

const createUser = () => {
  axios.post('/users', { name })
    .then(res => {
      console.log("✅ Created user:", res.data);
      onLogin(res.data);
    })
    .catch(err => {
      console.error("❌ Error creating user:", err);
    });
};

  return (
    <div className="page">
      <h2>Select User</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <button className="btn-secondary" onClick={() => onLogin(u)}>
              {u.name}
            </button>
          </li>
        ))}
      </ul>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New user"
        style={{ marginRight: '0.5rem' }}
      />
      <button className="btn-primary" onClick={createUser}>
        Create
      </button>
    </div>
  );
}

export default HomePage;
