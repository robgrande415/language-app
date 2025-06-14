import React, { useState } from "react";
import axios from "axios";
import HomePage from "./components/HomePage";
import LanguageSelector from "./components/LanguageSelector";
import ModuleScreen from "./components/ModuleScreen";
import PracticeSession from "./components/PracticeSession";
import SessionSummary from "./components/SessionSummary";
import ExportPage from "./components/ExportPage";
import PersonalizedTopics from "./components/PersonalizedTopics";
import InstructionModule from "./components/InstructionModule";

function App() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState("");
  const [cefr, setCefr] = useState("A1");
  const [module, setModule] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [screen, setScreen] = useState("home");
  const [topicOptions, setTopicOptions] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [instruction, setInstruction] = useState("");

  const regenerateInstruction = () =>
    axios
      .post("/instruction", { language, module, force: true })
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
          onSelect={setLanguage}
          next={() => setScreen("module")}
          goExport={() => setScreen("export")}
          home={() => setScreen("home")}
        />
      );
    case "module":
      return (
        <ModuleScreen
          user={user}
          language={language}
          cefr={cefr}
          setCefr={setCefr}
          setModule={setModule}
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          next={() => setScreen("practice")}
          showInstruction={(text) => {
            setInstruction(text);
            setScreen("instruction");
          }}
          storeInstruction={(text) => setInstruction(text)}
          startPersonalized={(topics) => {
            setTopicOptions(topics);
            setScreen("personalized-topics");
          }}
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
          instruction={instruction}
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
