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
}) {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (language) {
      axios.get(`/modules/${language}`).then((res) => setModules(res.data));
    }
  }, [language]);

  const filtered = modules.filter((m) =>
    m.toLowerCase().includes(search.toLowerCase()),
  );

  const chooseModule = (m) => {
    setModule(m);
    axios
      .post("/sentence/preload", { language, cefr, module: m })
      .then(() => next());
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
      <ul>
        {filtered.map((m) => (
          <li key={m}>
            <button onClick={() => chooseModule(m)}>{m}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ModuleScreen;
