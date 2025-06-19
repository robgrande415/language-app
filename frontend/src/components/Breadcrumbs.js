import React from 'react';

function Breadcrumbs({ items }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {items.map((it, idx) => (
        <span key={idx}>
          {idx > 0 && ' / '}
          {it.onClick ? (
            <span style={{ color: 'blue', cursor: 'pointer' }} onClick={it.onClick}>{it.label}</span>
          ) : (
            <span>{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export default Breadcrumbs;
