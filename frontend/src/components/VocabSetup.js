import React from 'react';

function VocabSetup({ cefr, setCefr, questionCount, setQuestionCount, start, back, home }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Vocab Study</h2>
      <div>
        {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
          <label key={lvl} style={{ marginRight: '1rem' }}>
            <input
              type="radio"
              checked={cefr === lvl}
              onChange={() => setCefr(lvl)}
            />{' '}
            {lvl}
          </label>
        ))}
      </div>
      <div style={{ margin: '1rem 0' }}>
        <label>
          Number of questions:{' '}
          <input
            type="number"
            min="1"
            value={questionCount === null ? '' : questionCount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                setQuestionCount(null);
              } else {
                const parsed = parseInt(value);
                if (!isNaN(parsed)) {
                  setQuestionCount(parsed);
                }
              }
            }}
          />
        </label>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={start} style={{ marginRight: '1rem' }}>Start</button>
        <button onClick={back} style={{ marginRight: '1rem' }}>Back</button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default VocabSetup;
