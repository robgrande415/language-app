import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HomePage from './components/HomePage';
import LanguageSelector from './components/LanguageSelector';
import ModuleScreen from './components/ModuleScreen';
import PracticeSession from './components/PracticeSession';
import SessionSummary from './components/SessionSummary';

function App() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('');
  const [cefr, setCefr] = useState('A1');
  const [module, setModule] = useState('');
  const [screen, setScreen] = useState('home');

  switch (screen) {
    case 'home':
      return <HomePage onLogin={setUser} />;
    case 'select-language':
      return <LanguageSelector onSelect={setLanguage} next={() => setScreen('module')} />;
    case 'module':
      return (
        <ModuleScreen
          language={language}
          cefr={cefr}
          setCefr={setCefr}
          setModule={setModule}
          next={() => setScreen('practice')}
        />
      );
    case 'practice':
      return (
        <PracticeSession
          user={user}
          language={language}
          cefr={cefr}
          module={module}
          onComplete={() => setScreen('summary')}
        />
      );
    case 'summary':
      return <SessionSummary restart={() => setScreen('practice')} home={() => setScreen('home')} user={user} />;
    default:
      return null;
  }
}

export default App;
