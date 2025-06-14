import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PracticeSession({ user, language, cefr, module, onComplete }) {
  const [sentence, setSentence] = useState('');
  const [answer, setAnswer] = useState('');
  const [response, setResponse] = useState('');
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchSentence();
  }, []);

  const fetchSentence = () => {
    axios.post('/sentence/generate', { language, cefr, module })
      .then(res => setSentence(res.data.sentence));
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
      setCount(c => c + 1);
      if (count + 1 >= 2) {
        onComplete();
      } else {
        fetchSentence();
      }
    });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h3>Translate:</h3>
      <p>{sentence}</p>
      <input value={answer} onChange={e => setAnswer(e.target.value)} />
      <button onClick={submit}>Submit</button>
      <pre>{response}</pre>
      <div>Progress: {count}/5</div>
    </div>
  );
}

export default PracticeSession;
