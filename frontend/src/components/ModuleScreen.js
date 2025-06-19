import React, { useState, useEffect } from "react";
import axios from "axios";

function ModuleScreen({
  user,
  language,
  cefr,
  setCefr,
  setModule,
  questionCount,
  setQuestionCount,
  next,
  showInstruction,
  storeInstruction,
  startPersonalized,
  home,
}) {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");
  const [scores, setScores] = useState({});
  const [withInstruction, setWithInstruction] = useState(false);

  useEffect(() => {
    if (language) {
      axios.get(`/modules/${language}`).then((res) => setModules(res.data));
      axios
        .get(`/results/${user.id}/${language}`)
        .then((res) => setScores(res.data));
    }
  }, [language, user]);

  const filtered = modules.filter((m) =>
    m.toLowerCase().includes(search.toLowerCase()),
  );

  const addModule = () => {
    const name = window.prompt('New module name');
    if (!name) return;
    axios.post('/modules', { name, language }).then(() => {
      setModules([...modules, name]);
    });
  };

  const chooseModule = (m) => {
    setModule(m);
    axios
      .post("/sentence/preload", { language, cefr, module: m })
      .then(() => {
        axios
          .post("/instruction", { language, module: m })
          .then((res) => {
            const text = res.data.instruction || "";
            storeInstruction(text);
            if (withInstruction) {
              showInstruction(text);
            } else {
              next();
            }
          });
      });
  };

  const personalized = () => {
    axios
      .post('/personalized/errors', { user_id: user.id, language })
      .then(res => {
        startPersonalized(res.data.errors || []);
      });
  };

  return (
    <>
      <div className="header">
        <div className="container">
          <h1>Select Module</h1>
        </div>
      </div>
      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Level</div>
            <div className="level-buttons">
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                <button
                  key={lvl}
                  className={`level-btn ${cefr === lvl ? "active" : ""}`}
                  onClick={() => setCefr(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-section">
            <div className="input-group">
              <label htmlFor="questions">Number of questions</label>
              <input
                id="questions"
                type="number"
                min="1"
                value={questionCount === null ? "" : questionCount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setQuestionCount(null);
                  } else {
                    const parsed = parseInt(value);
                    if (!isNaN(parsed)) setQuestionCount(parsed);
                  }
                }}
              />
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="instruction"
                checked={withInstruction}
                onChange={() => setWithInstruction(!withInstruction)}
              />
              <label htmlFor="instruction">Start with instruction</label>
            </div>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">Add Module</div>
            <input
              type="text"
              className="search-bar"
              placeholder="Search modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="add-module-btn" onClick={addModule}>
              Add Module
            </button>
          </div>
        </div>
        <div className="modules-section">
          {filtered.map((m) => {
            const list = scores[m] || [];
            const pct = list.length ? Math.round(list[list.length - 1] * 100) : 0;
            let progressClass = "progress-0";
            if (pct >= 100) progressClass = "progress-100";
            else if (pct >= 80) progressClass = "progress-80";
            else if (pct >= 60) progressClass = "progress-60";
            else if (pct >= 20) progressClass = "progress-20";
            return (
              <div
                key={m}
                className="module-item"
                onClick={() => chooseModule(m)}
              >
                <div className="module-header">
                  <div className="module-name">{m}</div>
                </div>
                <div className="module-meta">
                  <div className="progress-info">
                    Progress: {pct === 0 ? "Not started" : pct === 100 ? "Complete" : `${pct}%`}
                  </div>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${progressClass}`}></div>
                </div>
                {list.length > 0 && (
                  <div className="scores">
                    {list.map((s, idx) => {
                      const val = Math.round(s * 100);
                      let cls = "score-0";
                      if (val >= 100) cls = "score-100";
                      else if (val >= 80) cls = "score-80";
                      else if (val >= 60) cls = "score-60";
                      else if (val >= 20) cls = "score-20";
                      return (
                        <div key={idx} className={`score ${cls}`}>{val}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="bottom-section">
        <div className="action-buttons">
          <button className="btn-primary" onClick={personalized}>
            Personalized Module based on Past errors
          </button>
          <button className="btn-secondary" onClick={home}>Home</button>
        </div>
      </div>
    </>
  );
}

export default ModuleScreen;
