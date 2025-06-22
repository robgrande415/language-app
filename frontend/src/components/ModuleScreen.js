import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import Breadcrumbs from "./Breadcrumbs";

function ModuleScreen({
  user,
  language,
  course,
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
  goCourse,
}) {
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState("");
  const [scores, setScores] = useState({});
  const [withInstruction, setWithInstruction] = useState(false);
  const [modal, setModal] = useState(null);
  const [formModal, setFormModal] = useState(null);
  const [sortOption, setSortOption] = useState('name-asc');

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

  const sorted = [...filtered].sort((a, b) => {
    const entryA = scores[a.name] || {};
    const entryB = scores[b.name] || {};
    const scoresA = Array.isArray(entryA) ? entryA : entryA.scores || [];
    const scoresB = Array.isArray(entryB) ? entryB : entryB.scores || [];
    const avgA = scoresA.length > 0 ? scoresA.reduce((x, y) => x + y, 0) / scoresA.length : 0;
    const avgB = scoresB.length > 0 ? scoresB.reduce((x, y) => x + y, 0) / scoresB.length : 0;
    const lastA = Array.isArray(entryA) ? null : entryA.last_reviewed;
    const lastB = Array.isArray(entryB) ? null : entryB.last_reviewed;

    switch (sortOption) {
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'progress':
        return avgA - avgB;
      case 'last-reviewed':
        if (!lastA && !lastB) return 0;
        if (!lastA) return -1;
        if (!lastB) return 1;
        return new Date(lastA) - new Date(lastB);
      case 'name-asc':
      default:
        return a.name.localeCompare(b.name);
    }
  });

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
          .post("/instruction", { language, module: m.name, module_description: m.description})
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
      <Breadcrumbs
        items={[
          { label: course.name, onClick: goCourse },
          { label: chapter.name, onClick: back },
          { label: "Select Module" },
        ]}
      />
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
      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        style={{ marginLeft: "1rem" }}
      >
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="progress">Progress</option>
        <option value="last-reviewed">Last Reviewed</option>
      </select>
      <button onClick={addModule} style={{ marginLeft: "1rem" }}>
        Add Module
      </button>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "1rem" }}>
        {sorted.map((m) => {
          const entry = scores[m.name] || {};
          const moduleScores = Array.isArray(entry) ? entry : entry.scores || [];
          const avg = moduleScores.length > 0 ? moduleScores.reduce((a, b) => a + b, 0) / moduleScores.length : null;

          return (
            <div
              key={m.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: "1rem",
                margin: "0.5rem",
                width: '100%',
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {/* Top right edit/delete */}
              <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: "0.5rem" }}>
                <span
                  onClick={() => setFormModal(m)}
                  style={{
                    color: "#007BFF",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  Edit
                </span>
                <span
                  onClick={() => {
                    if (window.confirm('Delete module?')) {
                      axios.delete(`/modules/${m.id}`).then(() => {
                        setModules(modules.filter((x) => x.id !== m.id));
                      });
                    }
                  }}
                  style={{ cursor: "pointer" }}
                  title="Delete"
                >
                  🗑️
                </span>
              </div>

              <div>
                <div className="module-name" style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                  {m.name}
                </div>

                {avg !== null && (
                  <>
                    <div className="progress-info" style={{ marginBottom: "0.25rem" }}>
                      Progress: {(avg*100).toFixed(0)}%
                    </div>
                    <div
                      className="progress-bar"
                      style={{ height: 10, background: "#eee", marginBottom: "0.5rem" }}
                    >
                      <div
                        className="progress-fill"
                        style={{
                          width: `${avg*100}%`,
                          background: "#ff9500",
                          height: "100%",
                        }}
                      />
                    </div>
                  </>
                )}

                {moduleScores.length > 0 && (
                  <div className="scores" style={{ display: "flex", marginBottom: "0.5rem" }}>
                    {moduleScores.slice(-3).map((s, idx) => {
                      let bgColor = "#ccc";
                      if (s * 100 >= 80) bgColor = "#4CAF50";
                      else if (s * 100 >= 60) bgColor = "#FFEB3B";
                      else bgColor = "#F44336";

                      return (
                        <div
                          key={idx}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: bgColor,
                            color: "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: "bold",
                            marginRight: 4,
                          }}
                        >
                          {(s * 100).toFixed(0)}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p>
                  {(m.description || "").slice(0, 80)}
                  {m.description && m.description.length > 80 && (
                    <>
                      ...{" "}
                      <span
                        style={{ color: "blue", cursor: "pointer" }}
                        onClick={() => setModal(m)}
                      >
                        see more
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Bottom right Start Study Session */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => chooseModule(m)}>Start Study Session</button>
              </div>
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
            zIndex: 1000,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: "white",
              padding: "1rem",
              maxWidth: 400,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
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
            zIndex: 1000,
          }}
          onClick={() => setFormModal(null)}
        >
          <div
            style={{
              background: "white",
              padding: "1rem",
              maxWidth: 400,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              width: "100%",
            }}
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
                style={{ width: "100%" }}
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
