import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ResultView from './ResultView';

function VocabPractice({ user, language, cefr, questionCount, onComplete, home }) {
  const [showWord, setShowWord] = useState(false);
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
  const [prevLastCorrect, setPrevLastCorrect] = useState(null);
  const [prevCorrectCount, setPrevCorrectCount] = useState(0);
  const [initialCorrect, setInitialCorrect] = useState(null);

  const toggleAssessment = () => {
    if (correct === null) return;
    const newVal = !correct;
    axios
      .post('/vocab/session/override', {
        word_id: wordId,
        correct: newVal ? 1 : 0,
        initial_correct: initialCorrect ? 1 : 0,
        prev_last_correct: prevLastCorrect,
        prev_correct_count: prevCorrectCount,
      })
      .then(() => {
        if (correct) {
          setCorrectCount((c) => Math.max(0, c - 1));
        } else {
          setCorrectCount((c) => c + 1);
        }
        setCorrect(newVal);
      });
  };

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
      setShowWord(false);
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
      setPrevLastCorrect(res.data.prev_last_correct);
      setPrevCorrectCount(res.data.prev_correct_count);
      setInitialCorrect(res.data.correct === 1);
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
          setPrevLastCorrect(null);
          setPrevCorrectCount(0);
          setInitialCorrect(null);
          fetchSentence();
        }
      });
  };

  return (
    <div style={{ padding: '2rem' }}>
      {stage === 'question' && (
        <>
          <h3>
            Translate the following sentence using the word: 
            <span style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center' }} onClick={() => setShowWord(v => !v)}>
              {showWord ? "'" + word + "'" : '*'.repeat(word.length || 7)}
              <span style={{ marginLeft: 8, fontSize: '1.2em', color: '#888' }} title={showWord ? 'Hide word' : 'Show word'}>
                {showWord ? (
                  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22"/><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C7 19 2.73 15.11 1 12c.74-1.32 1.81-2.87 3.08-4.13M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-5.12"/><path d="M9.88 9.88a3 3 0 0 1 4.24 4.24"/><path d="M21 21L3 3"/></svg>
                ) : (
                  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </span>
            </span>
          </h3>
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
        <ResultView
          response={response}
          errors={errors}
          checked={checked}
          setChecked={setChecked}
          vocab={vocab}
          toggleWord={toggleWord}
          nextStep={nextStep}
          correct={correct}
          toggleAssessment={toggleAssessment}
        />
      )}
      <div>Progress: {count}/{questionCount}</div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default VocabPractice;
