import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

function ModuleScreen({
  user,
  language,
  chapter,
  cefr,
  setCefr,
  setModule,
  setModuleDescription,
  questionCount,
  setQuestionCount,
  next,
  showInstruction,
  storeInstruction,
  startPersonalized,
  home,
  back,
}) {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");
  const [scores, setScores] = useState({});
  const [withInstruction, setWithInstruction] = useState(false);
  const [modal, setModal] = useState(null);
  const [formModal, setFormModal] = useState(null);

  useEffect(() => {
    if (chapter) {
      axios.get(`/modules/by_chapter/${chapter.id}`).then((res) => setModules(res.data));
      axios
        .get(`/results/${user.id}/${language}`)
        .then((res) => setScores(res.data));
    }
  }, [language, user, chapter]);

  const filtered = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const addModule = () => {
    setFormModal({ id: null, name: "", description: "" });
  };

  const chooseModule = (m) => {
    setModule(m.name);
    setModuleDescription(m.description || "");
    axios
      .post("/sentence/preload", { language, cefr, module: m.name, module_description: m.description })
      .then(() => {
        axios
          .post("/instruction", { language, module: m.name })
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
      <div style={{ margin: "1rem 0" }}>
        <label>
          <input
            type="checkbox"
            checked={withInstruction}
            onChange={() => setWithInstruction(!withInstruction)}
          />{' '}
          Start with instruction
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
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "1rem" }}>
        {filtered.map((m) => {
          const moduleScores = scores[m.name] || [];
          const avg = moduleScores.length > 0 ? moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length : null;
          return (
            <div
              key={m.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: "1rem",
                margin: "0.5rem",
                width: 300,
              }}
            >
              <div className="module-header">
                <div className="module-name" style={{ fontWeight: "bold" }}>{m.name}</div>
              </div>
              <div className="module-meta" style={{ marginBottom: "0.5rem" }}>
                {avg !== null && (
                  <div className="progress-info">Progress: {avg.toFixed(0)}%</div>
                )}
              </div>
              {avg !== null && (
                <div className="progress-bar" style={{ height: 10, background: "#eee", marginBottom: "0.5rem" }}>
                  <div className="progress-fill" style={{ width: `${avg}%`, background: "#ff9500", height: "100%" }} />
                </div>
              )}
              {moduleScores.length > 0 && (
                <div className="scores" style={{ display: "flex", marginBottom: "0.5rem" }}>
                  {moduleScores.map((s, idx) => (
                    <div key={idx} className="score" style={{ marginRight: 4 }}>{s.toFixed(0)}</div>
                  ))}
                </div>
              )}
              <p>
                {(m.description || "").slice(0, 80)}
                {m.description && m.description.length > 80 && (
                  <>
                    ...{' '}
                    <span
                      style={{ color: "blue", cursor: "pointer" }}
                      onClick={() => setModal(m)}
                    >
                      see more
                    </span>
                  </>
                )}
              </p>
              <button onClick={() => chooseModule(m)} style={{ marginRight: '0.5rem' }}>Select</button>
              <button onClick={() => setFormModal(m)} style={{ marginRight: '0.5rem' }}>Edit</button>
              <button
                onClick={() => {
                  if (window.confirm('Delete module?')) {
                    axios.delete(`/modules/${m.id}`).then(() => {
                      setModules(modules.filter((x) => x.id !== m.id));
                    });
                  }
                }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
      {modal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ background: "white", padding: "1rem", maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{modal.name}</h3>
            <ReactMarkdown>{modal.description}</ReactMarkdown>
            <button onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
      {formModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setFormModal(null)}
        >
          <div
            style={{ background: "white", padding: "1rem", maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{formModal.id ? "Edit Module" : "Add Module"}</h3>
            <div style={{ marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder="Name"
                value={formModal.name}
                onChange={(e) =>
                  setFormModal({ ...formModal, name: e.target.value })
                }
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <textarea
                rows={5}
                placeholder="Description (markdown allowed)"
                value={formModal.description}
                onChange={(e) =>
                  setFormModal({ ...formModal, description: e.target.value })
                }
              />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Preview:</strong>
              <ReactMarkdown>{formModal.description}</ReactMarkdown>
            </div>
            <button
              onClick={() => {
                if (!formModal.name) return;
                if (formModal.id) {
                  axios
                    .put(`/modules/${formModal.id}`, {
                      name: formModal.name,
                      description: formModal.description,
                    })
                    .then(() => {
                      setModules(
                        modules.map((x) =>
                          x.id === formModal.id
                            ? { ...x, name: formModal.name, description: formModal.description }
                            : x
                        )
                      );
                      setFormModal(null);
                    });
                } else {
                  axios
                    .post("/modules", {
                      name: formModal.name,
                      language,
                      chapter_id: chapter.id,
                      description: formModal.description,
                    })
                    .then((res) => {
                      setModules([
                        ...modules,
                        { id: res.data.id, name: formModal.name, description: formModal.description },
                      ]);
                      setFormModal(null);
                    });
                }
              }}
              style={{ marginRight: "0.5rem" }}
            >
              Save
            </button>
            <button onClick={() => setFormModal(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={personalized} style={{ marginRight: "1rem" }}>
          Personalized Module based on Past errors
        </button>
        <button onClick={back} style={{ marginRight: "1rem" }}>
          Back
        </button>
        <button onClick={home}>Home</button>
      </div>
    </div>
  );
}

export default ModuleScreen;
