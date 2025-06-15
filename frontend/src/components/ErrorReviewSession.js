import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ErrorReviewSession({ user, language, cefr, errors, onComplete, home }) {
  const [index, setIndex] = useState(0);
  const [sentence, setSentence] = useState('');
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
  const [stage, setStage] = useState('question');
  const [correctCount, setCorrectCount] = useState(0);

  const currentError = errors[index];

  useEffect(() => {
    if (currentError) {
      axios
        .post('/personalized/error_sentence', {
          error_id: currentError.id,
          language,
          cefr,
        })
        .then(res => {
          setSentence(res.data.sentence);
          setStage('question');
        });
    }
  }, [index]);

  const submit = () => {
    axios
      .post('/personalized/error_submit', {
        user_id: user.id,
        error_id: currentError.id,
        language,
        cefr,
        english: sentence,
        translation: answer,
      })
      .then(res => {
        setResponse(res.data.response);
        if (res.data.correct === 1) {
          setCorrectCount(c => c + 1);
        }
        setStage('result');
      });
  };

  const next = () => {
    if (index + 1 >= errors.length) {
      onComplete(correctCount);
    } else {
      setIndex(i => i + 1);
      setAnswer('');
      setResponse('');
      setStage('question');
    }
  };

  if (!currentError) return null;

  return (
    <div style={{ padding: '2rem' }}>
      {stage === 'question' && (
        <>
          <h4>Practice error:</h4>
          <p>{sentence}</p>
          <input value={answer} onChange={e => setAnswer(e.target.value)} />
          <button onClick={submit}>Submit</button>
        </>
      )}
      {stage === 'result' && (
        <>
          <pre>{response}</pre>
          <button onClick={next}>Next</button>
        </>
      )}
      <div style={{ marginTop: '1rem' }}>Progress: {index}/{errors.length}</div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default ErrorReviewSession;
