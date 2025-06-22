import React from 'react';

function ResultView({ response, errors, checked, setChecked, vocab, toggleWord, nextStep, correct, toggleAssessment }) {
  return (
    <>
      <h3>
        {correct ? 'Correct! 🎉' : 'Incorrect'}
        {typeof toggleAssessment === 'function' && correct !== null && (
          <button
            onClick={toggleAssessment}
            style={{ marginLeft: '1rem', fontSize: '0.8rem' }}
          >
            Change assessment
          </button>
        )}
      </h3>
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {response.split(/(\s+|[.,!?;:"“”«»()])/).map((tok, idx) => {
          const visibleWord = tok;
          const cleaned = tok
            .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ'-]+/, '')
            .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'-]+$/, '');
          if (!cleaned) return tok;
          const selected = vocab.includes(cleaned);
          return (
            <span
              key={idx}
              onClick={() => toggleWord(cleaned)}
              style={{
                backgroundColor: selected ? 'lightblue' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {visibleWord}
            </span>
          );
        })}
      </div>
      {errors.length > 0 && (
        <div>
          <h4>Select errors to save:</h4>
          <ul>
            {errors.map((err, idx) => (
              <li key={idx}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked[idx]}
                    onChange={() => {
                      const list = [...checked];
                      list[idx] = !list[idx];
                      setChecked(list);
                    }}
                  />{' '}
                  {err}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {vocab.length > 0 && (
        <div>
          <h4>Vocab List (click word to add)</h4>
          <ul>
            {vocab.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={nextStep}>Next</button>
    </>
  );
}

export default ResultView;
