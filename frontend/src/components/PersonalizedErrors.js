import React, { useState } from 'react';

function PersonalizedErrors({ errors, onNext, home }) {
  const [items, setItems] = useState(errors.map(e => ({ ...e, checked: true })));

  const toggle = idx => {
    const list = [...items];
    list[idx].checked = !list[idx].checked;
    setItems(list);
  };

  const next = () => {
    onNext(items.filter(i => i.checked));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Errors</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Error</th>
            <th>Last Reviewed</th>
            <th>Last Reviewed Correctly</th>
            <th># Reviews</th>
            <th># Correct</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e, idx) => (
            <tr key={e.id}>
              <td>
                <input
                  type="checkbox"
                  checked={e.checked}
                  onChange={() => toggle(idx)}
                />
              </td>
              <td>{e.error_text}</td>
              <td>{e.last_reviewed ? new Date(e.last_reviewed).toLocaleDateString() : ''}</td>
              <td>{e.last_reviewed_correctly ? new Date(e.last_reviewed_correctly).toLocaleDateString() : ''}</td>
              <td>{e.review_count}</td>
              <td>{e.correct_review_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={next} style={{ marginRight: '1rem' }}>Start</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default PersonalizedErrors;
