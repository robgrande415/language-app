import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PracticeSession({ user, language, cefr, module, questionCount, onComplete, home }) {
  const [sentence, setSentence] = useState('');
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
  const [errors, setErrors] = useState([]);
  const [checked, setChecked] = useState([]);
  const [sentenceId, setSentenceId] = useState(null);
  const [count, setCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [stage, setStage] = useState('question'); // 'question' or 'result'

  useEffect(() => {
    fetchSentence();
  }, []);

  const fetchSentence = () => {
    axios.post('/sentence/generate', { language, cefr, module })
      .then(res => {
        setSentence(res.data.sentence);
        setStage('question');
      });
  };

  const submit = () => {
    axios.post('/sentence/submit', {
      user_id: user.id,
      language,
      cefr,
      module,
      english: sentence,
      translation: answer,
    }).then(res => {
      setResponse(res.data.response);

      setErrors(res.data.errors || []);
      setChecked((res.data.errors || []).map(() => true));
      setSentenceId(res.data.sentence_id);

      if (res.data.correct === 1) {
        setCorrectCount(c => c + 1);
      }

      setCount(c => c + 1);
      setStage('result');
    });
  };

  const nextStep = () => {
    const selected = errors.filter((_, idx) => checked[idx]);
    axios.post('/errors/save', { sentence_id: sentenceId, errors: selected })
      .then(() => {
        if (count >= questionCount) {
          onComplete();
        } else {
          setAnswer('');
          setResponse('');
          setErrors([]);
          setChecked([]);
          setSentenceId(null);
          fetchSentence();
        }
      });
  };

  return (
    <div style={{ padding: '2rem' }}>
      {stage === 'question' && (
        <>
          <h3>Translate:</h3>
          <p>{sentence}</p>
          <input value={answer} onChange={e => setAnswer(e.target.value)} />
          <button onClick={submit}>Submit</button>
        </>
      )}
      {stage === 'result' && (
        <>
          <pre>{response}</pre>
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

export default PracticeSession;
