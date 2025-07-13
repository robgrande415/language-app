import React, { useState, useEffect } from 'react';

function PersonalizedErrors({ errors, onNext, home }) {
  const [items, setItems] = useState(errors.map((e) => ({ ...e, checked: false })));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('error_text');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const toggle = (idx) => {
    const list = [...items];
    list[idx].checked = !list[idx].checked;
    setItems(list);
  };

  const next = () => {
    onNext(items.filter((i) => i.checked));
  };

  useEffect(() => {
    setPage(1);
  }, [search, items]);

  const filtered = items.filter((i) =>
    i.error_text.toLowerCase().includes(search.toLowerCase()),
  );

  const getValue = (item, key) => {
    if (key === 'last_reviewed' || key === 'last_reviewed_correctly') {
      return item[key] ? new Date(item[key]).getTime() : 0;
    }
    return item[key] ?? '';
  };

  const sorted = [...filtered].sort((a, b) => {
    const va = getValue(a, sortBy);
    const vb = getValue(b, sortBy);
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  const changeSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Errors</h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
        style={{ marginBottom: '1rem' }}
      />
      <table>
        <thead>
          <tr>
            <th></th>
            <th style={{ cursor: 'pointer' }} onClick={() => changeSort('error_text')}>
              Error {sortBy === 'error_text' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => changeSort('last_reviewed')}>
              Last Reviewed {sortBy === 'last_reviewed' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => changeSort('last_reviewed_correctly')}
            >
              Last Reviewed Correctly{' '}
              {sortBy === 'last_reviewed_correctly' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th style={{ cursor: 'pointer' }} onClick={() => changeSort('review_count')}>
              # Reviews {sortBy === 'review_count' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
            <th
              style={{ cursor: 'pointer' }}
              onClick={() => changeSort('correct_review_count')}
            >
              # Correct {sortBy === 'correct_review_count' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((e, idx) => (
            <tr key={e.id}>
              <td>
                <input
                  type="checkbox"
                  checked={e.checked}
                  onChange={() => toggle(items.indexOf(e))}
                />
              </td>
              <td>{e.error_text}</td>
              <td>{e.last_reviewed ? new Date(e.last_reviewed).toLocaleDateString() : ''}</td>
              <td>{
                e.last_reviewed_correctly
                  ? new Date(e.last_reviewed_correctly).toLocaleDateString()
                  : ''
              }</td>
              <td>{e.review_count}</td>
              <td>{e.correct_review_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: '0.5rem' }}>
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
          Prev
        </button>
        <span style={{ margin: '0 1rem' }}>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={next} style={{ marginRight: '1rem' }}>
          Start
        </button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default PersonalizedErrors;
