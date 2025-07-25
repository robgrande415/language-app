import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import ResultView from './ResultView';

function PracticeSession({ user, language, cefr, module, moduleDescription, instruction, questionCount, onComplete, home }) {
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
  const [correct, setCorrect] = useState(null);
  const [vocab, setVocab] = useState([]);

  const toggleAssessment = () => {
    if (correct === null) return;
    if (correct) {
      setCorrectCount(c => Math.max(0, c - 1));
    } else {
      setCorrectCount(c => c + 1);
    }
    setCorrect(!correct);
  };

  useEffect(() => {
    fetchSentence();
  }, []);

  const fetchSentence = () => {
    axios.post('/sentence/generate', { language, cefr, module, module_description: moduleDescription })
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

      setCorrect(res.data.correct === 1);
      setCount(c => c + 1);
      setStage('result');
    });
  };

  const toggleWord = (word) => {
    if (vocab.includes(word)) {
      setVocab(vocab.filter((w) => w !== word));
    } else {
      setVocab([...vocab, word]);
    }
  };

  const nextStep = () => {
    const selected = errors.filter((_, idx) => checked[idx]);
    axios
      .post('/errors/save', { sentence_id: sentenceId, errors: selected })
      .then(() =>
        axios.post('/vocab/add', { user_id: user.id, language, words: vocab })
      )
      .then(() => {
        if (count >= questionCount) {
          onComplete(correctCount);
        } else {
          setAnswer('');
          setResponse('');
          setErrors([]);
          setChecked([]);
          setSentenceId(null);
          setVocab([]);
          setCorrect(null);
          fetchSentence();
        }
      });
  };

  return (
    <div style={{ padding: '2rem' }}>
      {showModal && (
        <div
          onClick={() => setShowModal(false)}  // ← added
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
            onClick={(e) => e.stopPropagation()} 
            style={{
              position: 'relative',
              background: 'white',
              padding: '1rem',
              maxWidth: '80%',
              maxHeight: '80%',
              overflow: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* X button in top right */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: '1',
              }}
              aria-label="Close"
            >
              ×
            </button>

            <ReactMarkdown>{instruction}</ReactMarkdown>
          </div>
        </div>
      )}
      {stage === 'question' && (
        <>
          <h3>Translate:</h3>
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
        <button onClick={() => setShowModal(true)} style={{ marginRight: '1rem' }}>
          Instruction
        </button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default PracticeSession;
