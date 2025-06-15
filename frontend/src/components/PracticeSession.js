import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PracticeSession({ user, language, cefr, module, questionCount, onComplete, home }) {
  const [sentence, setSentence] = useState('');
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
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
      if (res.data.correct === 1) {
        setCorrectCount(c => c + 1);
      }
      setCount(c => c + 1);
      setStage('result');
    });
  };

  const nextStep = () => {
    if (count >= questionCount) {
      onComplete(correctCount);
    } else {
      setAnswer('');
      setResponse('');
      fetchSentence();
    }
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
