import React, { useState } from 'react';

function PersonalizedTopics({ topics, onNext, home }) {
  const [items, setItems] = useState(topics.map(t => ({ text: t, checked: true })));
  const [newTopic, setNewTopic] = useState('');

  const toggle = index => {
    const list = [...items];
    list[index].checked = !list[index].checked;
    setItems(list);
  };

  const add = () => {
    const t = newTopic.trim();
    if (t) {
      setItems([...items, { text: t, checked: true }]);
      setNewTopic('');
    }
  };

  const next = () => {
    onNext(items.filter(i => i.checked).map(i => i.text));
  };

  return (
    <div className="page">
      <h2>Select Topics</h2>
      <ul>
        {items.map((item, idx) => (
          <li key={idx}>
            <label>
              <input type="checkbox" checked={item.checked} onChange={() => toggle(idx)} />{' '}
              {item.text}
            </label>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '1rem' }}>
        <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Add topic" />
        <button className="btn-secondary" onClick={add} style={{ marginLeft: '0.5rem' }}>Add</button>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button className="btn-primary" onClick={next} style={{ marginRight: '1rem' }}>Next</button>
        <button className="btn-secondary" onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default PersonalizedTopics;
