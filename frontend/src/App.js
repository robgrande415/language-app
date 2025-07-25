import React, { useState } from "react";
import axios from "axios";
import HomePage from "./components/HomePage";
import LanguageSelector from "./components/LanguageSelector";
import CourseScreen from "./components/CourseScreen";
import ChapterScreen from "./components/ChapterScreen";
import ModuleScreen from "./components/ModuleScreen";
import PracticeSession from "./components/PracticeSession";
import SessionSummary from "./components/SessionSummary";
import ExportPage from "./components/ExportPage";
import PersonalizedTopics from "./components/PersonalizedTopics";
import PersonalizedErrors from "./components/PersonalizedErrors"
import ErrorReviewSession from "./components/ErrorReviewSession";
import InstructionModule from "./components/InstructionModule";
import VocabSetup from "./components/VocabSetup";
import VocabPractice from "./components/VocabPractice";
import VocabTable from "./components/VocabTable";

function App() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState("");
  const [course, setCourse] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [cefr, setCefr] = useState("A1");
  const [module, setModule] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [screen, setScreen] = useState("home");
  const [topicOptions, setTopicOptions] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [errorOptions, setErrorOptions] = useState([]);
  const [selectedErrors, setSelectedErrors] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [instruction, setInstruction] = useState("");
  const [showVocabTable, setShowVocabTable] = useState(false);
  // Make available globally for CourseScreen button
  window.setVocabTable = setShowVocabTable;


  const regenerateInstruction = () =>
    axios
      .post("/instruction", {
        language,
        module,
        module_description: moduleDescription,  // ✅ explicitly pass value
        force: true,
      })
      .then((res) => setInstruction(res.data.instruction || ""));


  const login = (selectedUser) => {
    setUser(selectedUser);
    setScreen("select-language");
  };

  switch (screen) {
    case "home":
      return <HomePage onLogin={login} />;
    case "select-language":
      return (
        <LanguageSelector
          onSelect={(lang) => {
            setLanguage(lang);
            setCourse(null);
            setChapter(null);
          }}
          next={() => setScreen("course")}
          goExport={() => setScreen("export")}
          home={() => setScreen("home")}
        />
      );
    case "course":
      if (showVocabTable) {
        return (
          <VocabTable
            user={user}
            language={language}
            onBack={() => setShowVocabTable(false)}
          />
        );
      }
      return (
        <CourseScreen
          user={user}
          language={language}
          onSelect={(c) => {
            setCourse(c);
            setChapter(null);
            setScreen("chapter");
          }}
          startVocab={() => setScreen("vocab-setup")}
          startPersonalized={() => {
            axios
              .post('/personalized/errors', { user_id: user.id, language })
              .then(res => {
                setErrorOptions(res.data.errors || []);
                setScreen('personalized-errors');
              });
          }}
          home={() => setScreen("home")}
        />
      );
    case "chapter":
      return (
        <ChapterScreen
          user={user}
          language={language}
          course={course}
          onSelect={(ch) => {
            setChapter(ch);
            setScreen("module");
          }}
          back={() => setScreen("course")}
          goCourse={() => setScreen("course")}
          home={() => setScreen("home")}
        />
      );
    case "module":
      return (
        <ModuleScreen
          user={user}
          language={language}
          course={course}
          chapter={chapter}
          cefr={cefr}
          setCefr={setCefr}
          setModule={setModule}
          setModuleDescription={setModuleDescription}
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          next={() => setScreen("practice")}
          showInstruction={(text) => {
            setInstruction(text);
            setScreen("instruction");
          }}
          storeInstruction={(text) => setInstruction(text)}
          startPersonalized={(errs) => {
            setErrorOptions(errs);
            setScreen("personalized-errors");
          }}
          back={() => setScreen("chapter")}
          goCourse={() => setScreen("course")}
          home={() => setScreen("home")}
        />
      );
    case "instruction":
      return (
        <InstructionModule
          text={instruction}
          regenerate={regenerateInstruction}
          next={() => setScreen("practice")}
          home={() => setScreen("home")}
        />
      );
    case "practice":
      return (
        <PracticeSession
          user={user}
          language={language}
          cefr={cefr}
          module={module}
          moduleDescription={moduleDescription}
          instruction={instruction}
          questionCount={questionCount}
          onComplete={(correct) => {
            setSessionStats({ correct, total: questionCount });
            setScreen("summary");
          }}
          home={() => setScreen("home")}
        />
      );
    case "vocab-setup":
      return (
        <VocabSetup
          cefr={cefr}
          setCefr={setCefr}
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          start={() => {
            axios
              .post('/vocab/session/preload', {
                user_id: user.id,
                language,
                cefr,
                count: questionCount,
              })
              .then(() => {
                setModule('vocab');
                setScreen('vocab-practice');
              });
          }}
          back={() => setScreen('course')}
          home={() => setScreen('home')}
        />
      );
    case "vocab-practice":
      return (
        <VocabPractice
          user={user}
          language={language}
          cefr={cefr}
          questionCount={questionCount}
          onComplete={(correct) => {
            setSessionStats({ correct, total: questionCount });
            setScreen("summary");
          }}
          home={() => setScreen("home")}
        />
      );
    case "personalized-topics":
      return (
        <PersonalizedTopics
          topics={topicOptions}
          onNext={(list) => {
            setSelectedTopics(list);
            axios
              .post("/personalized/preload", { language, cefr, topics: list })
              .then(() => {
                setModule("personalized");
                setScreen("practice");
              });
          }}
          home={() => setScreen("home")}
        />
      );
    case "personalized-errors":
      return (
        <PersonalizedErrors
          errors={errorOptions}
          onNext={(list) => {
            setSelectedErrors(list);
            setScreen("error-review");
          }}
          home={() => setScreen("home")}
        />
      );
    case "error-review":
      return (
        <ErrorReviewSession
          user={user}
          language={language}
          cefr={cefr}
          errors={selectedErrors}
          onComplete={(correct) => {
            setSessionStats({ correct, total: selectedErrors.length });
            setScreen("summary");
          }}
          home={() => setScreen("home")}
        />
      );
    case "export":
      return (
        <ExportPage
          home={() => setScreen("home")}
          user={user}
        />
      );
    case "summary":
      return (
        <SessionSummary
          restart={() => setScreen("practice")}
          home={() => setScreen("home")}
          user={user}
          stats={sessionStats}
          module={module}
          language={language}
        />
      );
    default:
      return null;
  }
}

export default App;
