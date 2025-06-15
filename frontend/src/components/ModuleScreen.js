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
  startPersonalized,
  home,
}) {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");
  const [scores, setScores] = useState({});

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
      .then(() => next());
  };

  const personalized = () => {
    axios
      .post('/personalized/topics', { user_id: user.id, language })
      .then(res => {
        startPersonalized(res.data.topics || []);
      });
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Select Module</h2>
      <div>
        {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
          <label key={lvl} style={{ marginRight: "1rem" }}>
            <input
              type="radio"
              checked={cefr === lvl}
              onChange={() => setCefr(lvl)}
            />{" "}
            {lvl}
          </label>
        ))}
      </div>
      <div style={{ margin: "1rem 0" }}>
        <label>
          Number of questions:{" "}
          <input
            type="number"
            min="1"
            value={questionCount === null ? "" : questionCount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setQuestionCount(null); // allow clearing
              } else {
                const parsed = parseInt(value);
                if (!isNaN(parsed)) {
                  setQuestionCount(parsed);
                }
              }
            }}
          />
        </label>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
      />
      <button onClick={addModule} style={{ marginLeft: "1rem" }}>
        Add Module
      </button>
      <ul>
        {filtered.map((m) => (
          <li key={m} style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => chooseModule(m)} style={{ marginRight: "0.5rem" }}>{m}</button>
            <div style={{ display: "flex" }}>
              {(scores[m] || []).map((s, idx) => {
                const pct = Math.round(s * 100);
                let bg = "red";
                if (pct > 80) bg = "green";
                else if (pct >= 60) bg = "orange";
                return (
                  <span
                    key={idx}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: bg,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: 4,
                      fontSize: 12,
                    }}
                  >
                    {pct}
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: "1rem" }}>
        <button onClick={personalized} style={{ marginRight: "1rem" }}>
          Personalized Module based on Past errors
        </button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default ModuleScreen;
