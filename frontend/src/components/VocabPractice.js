import React, { useState, useEffect } from 'react';
import axios from 'axios';

function VocabPractice({ user, language, cefr, questionCount, onComplete, home }) {
  const [sentence, setSentence] = useState('');
  const [word, setWord] = useState('');
  const [wordId, setWordId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
  const [errors, setErrors] = useState([]);
  const [checked, setChecked] = useState([]);
  const [count, setCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [stage, setStage] = useState('question');
  const [correct, setCorrect] = useState(null);
  const [vocab, setVocab] = useState([]);

  useEffect(() => {
    fetchSentence();
  }, []);

  const fetchSentence = () => {
    axios.post('/vocab/session/generate', { user_id: user.id, language, cefr })
      .then(res => {
        setSentence(res.data.sentence);
        setWord(res.data.word);
        setWordId(res.data.word_id);
        setStage('question');
      });
  };

  const submit = () => {
    axios.post('/vocab/session/submit', {
      user_id: user.id,
      word_id: wordId,
      language,
      cefr,
      english: sentence,
      translation: answer,
    }).then(res => {
      setResponse(res.data.response);
      setErrors(res.data.errors || []);
      setChecked((res.data.errors || []).map(() => true));
      if (res.data.correct === 1) {
        setCorrectCount(c => c + 1);
      }
      setCorrect(res.data.correct === 1);
      setCount(c => c + 1);
      setStage('result');
    });
  };

  const toggleWord = (w) => {
    if (vocab.includes(w)) {
      setVocab(vocab.filter((x) => x !== w));
    } else {
      setVocab([...vocab, w]);
    }
  };

  const nextStep = () => {
    axios
      .post('/vocab/add', { user_id: user.id, language, words: vocab })
      .then(() => {
        if (count >= questionCount) {
          onComplete(correctCount);
        } else {
          setAnswer('');
          setResponse('');
          setErrors([]);
          setChecked([]);
          setVocab([]);
          setCorrect(null);
          fetchSentence();
        }
      });
  };

  return (
    <div style={{ padding: '2rem' }}>
      {stage === 'question' && (
        <>
          <h3>Translate the following sentence using '{word}':</h3>
          <p>{sentence}</p>
          <textarea
            spellCheck={true}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              marginBottom: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: '1.4',
              WebkitUserModify: 'read-write',
              userSelect: 'text',
            }}
            placeholder="Type your answer here..."
          />
          <button onClick={submit}>Submit</button>
        </>
      )}
      {stage === 'result' && (
        <>
          <h3>
            {correct ? 'Correct! 🎉' : 'Incorrect'}
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
      )}
      <div>Progress: {count}/{questionCount}</div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default VocabPractice;
