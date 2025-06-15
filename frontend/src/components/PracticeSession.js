import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

function PracticeSession({ user, language, cefr, module, instruction, questionCount, onComplete, home }) {
  const [sentence, setSentence] = useState('');
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
  const [errors, setErrors] = useState([]);
  const [checked, setChecked] = useState([]);
  const [sentenceId, setSentenceId] = useState(null);
  const [count, setCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [stage, setStage] = useState('question'); // 'question' or 'result'
  const [showModal, setShowModal] = useState(false);

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
          onComplete(correctCount);
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
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '1rem',
              maxWidth: '80%',
              maxHeight: '80%',
              overflow: 'auto',
            }}
          >
            <ReactMarkdown>{instruction}</ReactMarkdown>
            <button onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
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
        <button onClick={() => setShowModal(true)} style={{ marginRight: '1rem' }}>
          Instruction
        </button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default PracticeSession;
