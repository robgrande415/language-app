import os
from flask import Blueprint, request, jsonify, send_file, current_app
from openai import OpenAI
import csv
from io import StringIO, BytesIO
import re
import random
from datetime import datetime
from dotenv import load_dotenv
from flask_cors import cross_origin
from collections import defaultdict

from models import (
    db,
    User,
    Course,
    Chapter,
    Module,
    Sentence,
    Error,
    ModuleResult,
    Instruction,
    VocabWord,
)

api_blueprint = Blueprint("api", __name__)

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# cache of pre-generated sentences per (language, module, cefr)
SENTENCE_BATCHES = {}
# cache for vocab practice sentences per (user_id, language)
VOCAB_BATCHES = {}


@api_blueprint.route("/users", methods=["GET", "POST", "OPTIONS"])
@cross_origin(origin="http://localhost:3000")
def users():
    if request.method == "POST":
        name = request.json.get("name")
        user = User(name=name)
        db.session.add(user)
        db.session.commit()
        return jsonify({"id": user.id, "name": user.name})
    users = User.query.all()
    return jsonify([{"id": u.id, "name": u.name} for u in users])


@api_blueprint.route("/courses/<language>", methods=["GET"])
def list_courses(language):
    courses = Course.query.filter_by(language=language).all()
    return jsonify([{"id": c.id, "name": c.name} for c in courses])


@api_blueprint.route("/courses", methods=["POST"])
def add_course():
    data = request.json
    name = data.get("name")
    language = data.get("language")
    if not name or not language:
        return jsonify({"error": "name and language required"}), 400
    course = Course(name=name, language=language)
    db.session.add(course)
    db.session.commit()
    return jsonify({"id": course.id, "name": course.name})


@api_blueprint.route("/courses/<int:course_id>", methods=["PUT", "DELETE"])
def modify_course(course_id):
    course = Course.query.get_or_404(course_id)
    if request.method == "DELETE":
        db.session.delete(course)
        db.session.commit()
        return jsonify({"status": "deleted"})
    data = request.json
    course.name = data.get("name", course.name)
    db.session.commit()
    return jsonify({"id": course.id, "name": course.name})


@api_blueprint.route("/chapters/<int:course_id>", methods=["GET"])
def list_chapters(course_id):
    chapters = Chapter.query.filter_by(course_id=course_id).all()
    return jsonify([{"id": ch.id, "name": ch.name} for ch in chapters])


@api_blueprint.route("/chapters", methods=["POST"])
def add_chapter():
    data = request.json
    name = data.get("name")
    course_id = data.get("course_id")
    if not name or not course_id:
        return jsonify({"error": "name and course_id required"}), 400
    chapter = Chapter(name=name, course_id=course_id)
    db.session.add(chapter)
    db.session.commit()
    return jsonify({"id": chapter.id, "name": chapter.name})


@api_blueprint.route("/chapters/<int:chapter_id>", methods=["PUT", "DELETE"])
def modify_chapter(chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    if request.method == "DELETE":
        db.session.delete(chapter)
        db.session.commit()
        return jsonify({"status": "deleted"})
    data = request.json
    chapter.name = data.get("name", chapter.name)
    db.session.commit()
    return jsonify({"id": chapter.id, "name": chapter.name})


@api_blueprint.route("/modules/by_chapter/<int:chapter_id>", methods=["GET"])
def modules_by_chapter(chapter_id):
    modules = Module.query.filter_by(chapter_id=chapter_id).all()
    return jsonify(
        [
            {"id": m.id, "name": m.name, "description": m.description or ""}
            for m in modules
        ]
    )


@api_blueprint.route("/modules/<language>", methods=["GET"])
def modules(language):
    modules = Module.query.filter(
        Module.language == language, Module.name.isnot(None), Module.name != ''
    ).all()
    names = [m.name for m in modules]
    return jsonify(names)


@api_blueprint.route("/modules", methods=["POST"])
def add_module():
    data = request.json
    name = data.get("name")
    language = data.get("language")
    chapter_id = data.get("chapter_id")
    description = data.get("description")
    if not name or not language or not chapter_id:
        return jsonify({"error": "name, language and chapter_id required"}), 400
    module = Module(
        name=name,
        language=language,
        chapter_id=chapter_id,
        description=description,
    )
    db.session.add(module)
    db.session.commit()
    return jsonify({"id": module.id, "name": module.name, "language": module.language})


@api_blueprint.route("/modules/<int:module_id>", methods=["PUT", "DELETE"])
def modify_module(module_id):
    module = Module.query.get_or_404(module_id)
    if request.method == "DELETE":
        db.session.delete(module)
        db.session.commit()
        return jsonify({"status": "deleted"})
    data = request.json
    module.name = data.get("name", module.name)
    module.description = data.get("description", module.description)
    module.chapter_id = data.get("chapter_id", module.chapter_id)
    db.session.commit()
    return jsonify({"id": module.id, "name": module.name})


@api_blueprint.route("/instruction", methods=["POST"])
def instruction():
    data = request.json
    module_name = data.get("module")
    module_description = data.get("module_description")
    language = data.get("language")
    force = data.get("force", False)
    if not module_name:
        return jsonify({"error": "module required"}), 400

    module = Module.query.filter_by(name=module_name, language=language).first()
    if not module:
        module = Module(name=module_name, language=language)
        db.session.add(module)
        db.session.commit()

    instr = Instruction.query.filter_by(module_id=module.id).first()
    if instr and not force:
        return jsonify({"instruction": instr.text})

    prompt = f"Provide a short instructional module for an English speaker learning about {module_name} in {language}. Provide instruction in English."
    current_app.logger.info("OpenAI prompt: %s", prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    text = response.choices[0].message.content.strip()
    if instr:
        instr.text = text
    else:
        instr = Instruction(module_id=module.id, text=text)
        db.session.add(instr)
    db.session.commit()
    return jsonify({"instruction": text})


def generate_batch_prompt(cefr, target_language, module, module_description=""):
    return (
        f"Generate 20 short English sentences for a student at the {cefr} level to translate into {target_language}. \n"
        f"The sentences should cover the topic of: {module}. More details about the module: {module_description}.\n"
        f"Number each sentence."
    )


def generate_sentence_batch(cefr, target_language, module, module_description=""):
    prompt = generate_batch_prompt(cefr, target_language, module, module_description)
    current_app.logger.info("OpenAI prompt: %s", prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    text = response.choices[0].message.content.strip()
    lines = [
        re.sub(r"^\d+[\).]\s*", "", l).strip() for l in text.splitlines() if l.strip()
    ]
    unique_lines = list(dict.fromkeys(lines[1:-1])) # remove chatgpt filler
    random.shuffle(unique_lines)
    return unique_lines[:5]


@api_blueprint.route("/sentence/preload", methods=["POST"])
def preload_sentences():
    data = request.json
    key = (data["language"], data["module"], data["cefr"])
    sentences = generate_sentence_batch(
        data["cefr"],
        data["language"],
        data["module"],
        data.get("module_description", ""),
    )
    SENTENCE_BATCHES[key] = sentences
    return jsonify({"count": len(sentences)})


@api_blueprint.route("/sentence/generate", methods=["POST"])
def generate_sentence():
    data = request.json
    key = (data["language"], data["module"], data["cefr"])
    batch = SENTENCE_BATCHES.get(key)
    if not batch:
        batch = generate_sentence_batch(
            data["cefr"],
            data["language"],
            data["module"],
            data.get("module_description", ""),
        )
        SENTENCE_BATCHES[key] = batch
    if not batch:
        return jsonify({"sentence": ""})
    sentence = batch.pop(0)
    return jsonify({"sentence": sentence})


@api_blueprint.route("/sentence/submit", methods=["POST"])
def submit_sentence():
    data = request.json
    user_id = data["user_id"]
    module_name = data["module"]
    language = data["language"]
    cefr = data["cefr"]
    english = data["english"]
    translation = data["translation"]

    module = Module.query.filter_by(name=module_name, language=language).first()
    if not module:
        module = Module(name=module_name, language=language)
        db.session.add(module)
        db.session.commit()

    sentence = Sentence(
        user_id=user_id,
        module_id=module.id,
        english_text=english,
        user_translation=translation,
        cefr_level=cefr,
    )
    db.session.add(sentence)
    db.session.commit()

    prompt_old = (
        "Correct the translation in the following format. Focus on word and grammar issues. Do not add list of corrections for spelling mistakes:\n"
        "<corrected sentence with only the corrections in **boldface**>\n"
        "<list of corrections with explanations, newline delimited>"
        ""
        #"Ex. "
    )
    prompt = f"""
            Correct these, ignoring spelling errors.
            Respond in the format:
            <original {language} sentence>
            <correct {language} sentence with only the corrections in bold>
            <list of corrections with quick explanations, newline delimited>
            If the response is correct, simply respond with "No corrections needed"

            Ex. Our technical team is developing a secure digital portal for the bank’s lending services. - Notre equipe technique est en train de développer un interface digital securisé pour les services de prêt de la banque

            Notre equipe technique est en train de développer *une* interface *numérique* *sécurisée* pour les services de prêt de la banque
            Explanation:
            interface is feminine → une
            digital → numérique is preferred in formal/technical French
            securisé → sécurisée for feminine agreement
            """

    user_message = f"{english} - {translation}."
    full_prompt = prompt + "\n New submission \n" + user_message
    current_app.logger.info("OpenAI prompt: %s", full_prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": full_prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    text = response.choices[0].message.content.strip()
    sentence.openai_response = text
    db.session.commit()

    # parse errors but do not save yet
    lines = text.splitlines()
    explanation_start = next(
        (i for i, line in enumerate(lines) if line.strip().lower() == "explanation:"),
        None,
    )
    explanation_lines = lines[explanation_start + 1 :] if explanation_start is not None else []

    # ask if translation is correct according to module topic
    judge_prompt = (
        f"Module topic: {module_name}.\n"
        f"English sentence: {english}\n"
        f"Learner translation: {translation}\n"
        "Ignoring all mistakes outside of {module_name} (ex. ignoring spelling, prepositions, number agreement, and articles outside of the core module), did the learner correctly "
        "convey the meaning and use the module concept {module_name}? If the user gets a spelling mistake within the {module_name}, respond with 0. Respond only with 1 (for yes) or 0 (for no)."
    )
    current_app.logger.info("OpenAI prompt: %s", judge_prompt)
    judge_resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": judge_prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", judge_resp.choices[0].message.content.strip()
    )
    correct_text = judge_resp.choices[0].message.content.strip()
    correct_val = 1 if correct_text.startswith("1") else 0

    return jsonify(
        {
            "response": text, 
            "correct": correct_val,
            "errors": explanation_lines,
            "sentence_id": sentence.id,
        }
    )


@api_blueprint.route("/errors/save", methods=["POST"])
def save_errors():
    data = request.json
    sentence_id = data.get("sentence_id")
    errors = data.get("errors", [])
    sentence = Sentence.query.get(sentence_id)
    if not sentence:
        return jsonify({"error": "Sentence not found"}), 404
    for line in errors:
        err = Error(sentence_id=sentence.id, 
            error_text=line, 
            module_id=sentence.module_id,
            last_reviewed=None,
            last_reviewed_correctly=None,
            review_count=0,
            correct_review_count=0
            )
        db.session.add(err)
    db.session.commit()
    return jsonify({"status": "ok", "count": len(errors)})


@api_blueprint.route("/session/<int:user_id>/export", methods=["GET"])
def export_session(user_id):
    sentences = Sentence.query.filter_by(user_id=user_id).all()

    # Write CSV to string
    string_data = StringIO()
    writer = csv.writer(string_data)
    writer.writerow(
        [
            "timestamp",
            "english",
            "submitted",
            "corrected",
            "explanation",
            "module",
            "language",
            "cefr",
        ]
    )
    for s in sentences:
        explanation = s.openai_response.replace("\n", " ")
        corrected = s.openai_response.split('.')[1] if (s.openai_response and len(s.openai_response.split('.')) > 1) else ""
        writer.writerow(
            [
                s.timestamp,
                s.english_text,
                s.user_translation,
                corrected,
                explanation,
                s.module.name,
                s.module.language,
                s.cefr_level,
            ]
        )
    string_data.seek(0)

    # Convert to binary for send_file
    bytes_data = BytesIO(string_data.getvalue().encode("utf-8"))

    return send_file(
        bytes_data,
        mimetype="text/csv",
        as_attachment=True,
        download_name="session.csv",
    )


@api_blueprint.route("/session/<int:user_id>/errors", methods=["GET"])
def export_errors(user_id):
    errors = (
        db.session.query(Error, Sentence.timestamp, Module.name)
        .join(Sentence, Error.sentence_id == Sentence.id)
        .join(Module, Error.module_id == Module.id)
        .filter(Sentence.user_id == user_id)
        .all()
    )

    string_data = StringIO()
    writer = csv.writer(string_data)
    writer.writerow([
        "timestamp",
        "module",
        "error_text",
    ])
    for err, ts, module_name in errors:
        writer.writerow([ts, module_name, err.error_text])
    string_data.seek(0)

    bytes_data = BytesIO(string_data.getvalue().encode("utf-8"))

    return send_file(
        bytes_data,
        mimetype="text/csv",
        as_attachment=True,
        download_name="errors.csv",
    )

@api_blueprint.route("/personalized/preload", methods=["POST"])
def personalized_preload():
    data = request.json
    topics = data.get("topics", [])
    language = data.get("language")
    cefr = data.get("cefr")
    prompt = (
        f"Generate 20 short English sentences for a student at the {cefr} level to translate into {language}. "
        f"The sentences should help practice the following topics: {', '.join(topics)}. Number each sentence."
    )
    current_app.logger.info("OpenAI prompt: %s", prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    lines = [re.sub(r"^\d+[\).]\s*", "", l).strip() for l in response.choices[0].message.content.strip().splitlines() if l.strip()]
    random.shuffle(lines)
    key = (language, "personalized", cefr)
    SENTENCE_BATCHES[key] = lines[:20]
    return jsonify({"count": len(SENTENCE_BATCHES[key])})


@api_blueprint.route("/session/complete", methods=["POST"])
def session_complete():
    data = request.json
    user_id = data.get("user_id")
    language = data.get("language")
    module_name = data.get("module")
    questions_answered = data.get("questions_answered", 0)
    questions_correct = data.get("questions_correct", 0)

    module = Module.query.filter_by(name=module_name, language=language).first()
    if not module:
        module = Module(name=module_name, language=language)
        db.session.add(module)
        db.session.commit()

    score = (
        questions_correct / questions_answered
        if questions_answered
        else 0
    )

    result = ModuleResult(
        user_id=user_id,
        module_id=module.id,
        questions_answered=questions_answered,
        questions_correct=questions_correct,
        score=score,
    )
    db.session.add(result)
    db.session.commit()
    return jsonify({"status": "ok"})


@api_blueprint.route("/results/<int:user_id>/<language>", methods=["GET"])
def module_results(user_id, language):
    rows = (
        db.session.query(ModuleResult, Module.name)
        .join(Module, ModuleResult.module_id == Module.id)
        .filter(ModuleResult.user_id == user_id, Module.language == language)
        .order_by(ModuleResult.timestamp.desc())
        .all()
    )
    data = defaultdict(lambda: {"scores": [], "last_reviewed": None})

    for res, name in rows:
        entry = data[name]
        if entry["last_reviewed"] is None:
            entry["last_reviewed"] = res.timestamp.isoformat()
        if len(entry["scores"]) < 3:
            entry["scores"].append(res.score)

    return jsonify({k: v for k, v in data.items()})



@api_blueprint.route("/personalized/errors", methods=["POST"])
def personalized_errors():
    data = request.json
    user_id = data.get("user_id")
    language = data.get("language")

    rows = (
        db.session.query(Error, Sentence.timestamp)
        .join(Sentence, Error.sentence_id == Sentence.id)
        .join(Module, Error.module_id == Module.id)
        .filter(Sentence.user_id == user_id, Module.language == language)
        .order_by(
            Error.last_reviewed_correctly.desc().nullsfirst(),
            Sentence.timestamp.desc(),
        )
        .limit(20)
        .all()
    )

    data_list = []
    for err, ts in rows:
        data_list.append(
            {
                "id": err.id,
                "error_text": err.error_text,
                "last_reviewed": err.last_reviewed.isoformat()
                if err.last_reviewed
                else None,
                "last_reviewed_correctly": err.last_reviewed_correctly.isoformat()
                if err.last_reviewed_correctly
                else None,
                "review_count": err.review_count,
                "correct_review_count": err.correct_review_count,
            }
        )

    return jsonify({"errors": data_list})


@api_blueprint.route("/personalized/error_sentence", methods=["POST"])
def personalized_error_sentence():
    data = request.json
    error_id = data.get("error_id")
    language = data.get("language")
    cefr = data.get("cefr")

    err = Error.query.get(error_id)
    if not err:
        return jsonify({"sentence": ""})

    module_name = err.module.name
    prompt = (
        f"Generate 10 short English sentences for a student at the B2 level to translate into {language}. "
        f"Focus on the following error: {err.error_text}. Number each sentence."
    )
    current_app.logger.info("OpenAI prompt: %s", prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    pattern = re.compile(r"^\s*\d+[\).:\-]?\s+")
    raw_text = response.choices[0].message.content.strip()
    lines = [
        re.sub(pattern, "", line).strip()
        for line in raw_text.splitlines()
        if pattern.match(line)
    ]
    if not lines:
        return jsonify({"sentence": ""})
    sentence = random.choice(lines)
    return jsonify({"sentence": sentence})


@api_blueprint.route("/personalized/error_submit", methods=["POST"])
def personalized_error_submit():
    data = request.json
    user_id = data.get("user_id")
    error_id = data.get("error_id")
    language = data.get("language")
    cefr = data.get("cefr")
    english = data.get("english")
    translation = data.get("translation")

    err = Error.query.get(error_id)
    if not err:
        return jsonify({"response": "", "correct": 0})

    prompt = f"""
            Correct these, ignoring spelling errors.
            Respond in the format:
            <original {language} sentence>
            <correct {language} sentence with only the corrections in bold>
            <list of corrections with quick explanations, newline delimited>
            If the response is correct, simply respond with "No corrections needed"
            """

    user_message = f"{english} - {translation}."
    full_prompt = prompt + "\n New submission \n" + user_message
    current_app.logger.info("OpenAI prompt: %s", full_prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": full_prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    text = response.choices[0].message.content.strip()

    judge_prompt = (
        f"Error to practice: {err.error_text}.\n"
        f"English sentence: {english}\n"
        f"Learner translation: {translation}\n"
        "Ignoring spelling or vocabulary mistakes, did the learner demonstrate understanding of the error? Respond only with 1 or 0."
    )
    current_app.logger.info("OpenAI prompt: %s", judge_prompt)
    judge_resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": judge_prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", judge_resp.choices[0].message.content.strip()
    )
    correct_text = judge_resp.choices[0].message.content.strip()
    correct_val = 1 if correct_text.startswith("1") else 0

    err.last_reviewed = datetime.utcnow()
    err.review_count = (err.review_count or 0) + 1
    if correct_val == 1:
        err.last_reviewed_correctly = datetime.utcnow()
        err.correct_review_count = (err.correct_review_count or 0) + 1
    db.session.commit()

    return jsonify({"response": text, "correct": correct_val})

@api_blueprint.route("/vocab/add", methods=["POST"])
def add_vocab():
    data = request.json
    user_id = data.get("user_id")
    language = data.get("language")
    words = data.get("words", [])
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    added = 0
    for w in words:
        word = w.strip()
        if not word:
            continue
        exists = VocabWord.query.filter_by(user_id=user_id, language=language, word=word).first()
        if exists:
            continue
        vw = VocabWord(user_id=user_id, language=language, word=word)
        db.session.add(vw)
        added += 1
    db.session.commit()
    return jsonify({"status": "ok", "count": added})


@api_blueprint.route("/vocab/<int:user_id>/<language>", methods=["GET"])
def list_vocab(user_id, language):
    """List all vocab words for a user and language."""
    words = VocabWord.query.filter_by(user_id=user_id, language=language).order_by(VocabWord.added_at.desc()).all()
    return jsonify([
        {
            "id": w.id,
            "word": w.word,
            "language": w.language,
            "added_at": w.added_at.isoformat() if w.added_at else None,
            "last_reviewed": w.last_reviewed.isoformat() if w.last_reviewed else None,
            "last_correct": w.last_correct.isoformat() if w.last_correct else None,
            "review_count": w.review_count,
            "correct_count": w.correct_count,
        }
        for w in words
    ])


@api_blueprint.route("/vocab/<int:word_id>", methods=["PUT"])
def update_vocab(word_id):
    """Update a vocab word (word text only)."""
    vw = VocabWord.query.get_or_404(word_id)
    data = request.json
    new_word = data.get("word")
    if not new_word:
        return jsonify({"error": "word is required"}), 400
    vw.word = new_word
    db.session.commit()
    return jsonify({"id": vw.id, "word": vw.word})


@api_blueprint.route("/vocab/<int:word_id>", methods=["DELETE"])
def delete_vocab(word_id):
    """Delete a vocab word by ID."""
    vw = VocabWord.query.get_or_404(word_id)
    db.session.delete(vw)
    db.session.commit()
    return jsonify({"status": "deleted"})


@api_blueprint.route("/vocab/<int:user_id>/export", methods=["GET"])
def export_vocab(user_id):
    words = VocabWord.query.filter_by(user_id=user_id).order_by(VocabWord.added_at).all()

    string_data = StringIO()
    writer = csv.writer(string_data)
    writer.writerow([
        "word",
        "language",
        "added_at",
        "last_reviewed",
        "last_correct",
        "review_count",
        "correct_count",
    ])
    for w in words:
        writer.writerow([
            w.word,
            w.language,
            w.added_at,
            w.last_reviewed or "",
            w.last_correct or "",
            w.review_count,
            w.correct_count,
        ])
    string_data.seek(0)
    bytes_data = BytesIO(string_data.getvalue().encode("utf-8"))

    return send_file(
        bytes_data,
        mimetype="text/csv",
        as_attachment=True,
        download_name="vocab.csv",
    )


@api_blueprint.route("/vocab/session/preload", methods=["POST"])
def vocab_preload():
    data = request.json
    user_id = data.get("user_id")
    language = data.get("language")
    cefr = data.get("cefr")
    count = int(data.get("count", 5))

    words = (
        VocabWord.query.filter_by(user_id=user_id, language=language)
        .order_by(VocabWord.last_correct.asc().nullsfirst())
        .limit(count)
        .all()
    )

    batch = []
    for w in words:
        prompt = (
            f"Generate 5 short English sentences for a student at the {cefr} level to translate into {language}. "
            f"The translation of each sentence should use the word '{w.word}'. Number each sentence."
        )
        current_app.logger.info("OpenAI prompt: %s", prompt)
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )
        current_app.logger.info(
            "OpenAI response: %s", resp.choices[0].message.content.strip()
        )
        lines = [
            re.sub(r"^\d+[\).]\s*", "", l).strip()
            for l in resp.choices[0].message.content.strip().splitlines()
            if l.strip() and re.match(r"^\d+[\).]\s*", l)
        ]
        if not lines:
            continue
        sentence = random.choice(lines)
        batch.append({"id": w.id, "word": w.word, "sentence": sentence})

    VOCAB_BATCHES[(user_id, language)] = batch
    return jsonify({"count": len(batch)})


@api_blueprint.route("/vocab/session/generate", methods=["POST"])
def vocab_generate():
    data = request.json
    user_id = data.get("user_id")
    language = data.get("language")
    key = (user_id, language)
    batch = VOCAB_BATCHES.get(key)
    if not batch:
        return jsonify({"sentence": "", "word": "", "word_id": None})
    item = batch.pop(0)
    return jsonify({"sentence": item["sentence"], "word": item["word"], "word_id": item["id"]})


@api_blueprint.route("/vocab/session/submit", methods=["POST"])
def vocab_submit():
    data = request.json
    user_id = data["user_id"]
    word_id = data["word_id"]
    language = data["language"]
    cefr = data["cefr"]
    english = data["english"]
    translation = data["translation"]

    vw = VocabWord.query.get(word_id)
    if not vw or vw.user_id != user_id:
        return jsonify({"error": "Word not found"}), 404

    prompt = f"""
            Correct these, ignoring spelling errors.
            Respond in the format:
            <original {language} sentence>
            <correct {language} sentence with only the corrections in bold>
            <list of corrections with quick explanations, newline delimited>
            If the response is correct, simply respond with "No corrections needed"
            """

    user_message = f"{english} - {translation}."
    full_prompt = prompt + "\n New submission \n" + user_message
    current_app.logger.info("OpenAI prompt: %s", full_prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": full_prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    text = response.choices[0].message.content.strip()

    lines = text.splitlines()
    explanation_start = next(
        (i for i, line in enumerate(lines) if line.strip().lower() == "explanation:"),
        None,
    )
    explanation_lines = lines[explanation_start + 1 :] if explanation_start is not None else []

    judge_prompt = (
        f"Vocabulary word: {vw.word}.\n"
        f"English sentence: {english}\n"
        f"Learner translation: {translation}\n"
        f"Did the learner correctly convey the meaning and use the word {vw.word}? Respond only with 1 or 0."
    )
    current_app.logger.info("OpenAI prompt: %s", judge_prompt)
    judge_resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": judge_prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", judge_resp.choices[0].message.content.strip()
    )
    correct_text = judge_resp.choices[0].message.content.strip()
    correct_val = 1 if correct_text.startswith("1") else 0

    prev_last_correct = vw.last_correct
    prev_correct_count = vw.correct_count or 0

    vw.last_reviewed = datetime.utcnow()
    vw.review_count = (vw.review_count or 0) + 1
    if correct_val == 1:
        vw.last_correct = datetime.utcnow()
        vw.correct_count = (vw.correct_count or 0) + 1
    db.session.commit()

    return jsonify({
        "response": text,
        "correct": correct_val,
        "errors": explanation_lines,
        "prev_last_correct": prev_last_correct.isoformat() if prev_last_correct else None,
        "prev_correct_count": prev_correct_count,
    })


@api_blueprint.route("/vocab/session/override", methods=["POST"])
def vocab_override():
    data = request.json
    word_id = data.get("word_id")
    new_correct = int(data.get("correct", 0))
    initial_correct = int(data.get("initial_correct", 0))
    prev_last_correct = data.get("prev_last_correct")
    prev_correct_count = int(data.get("prev_correct_count", 0))

    vw = VocabWord.query.get(word_id)
    if not vw:
        return jsonify({"error": "Word not found"}), 404

    if new_correct == 1 and initial_correct == 0:
        vw.last_correct = datetime.utcnow()
        vw.correct_count = prev_correct_count + 1
    elif new_correct == 0 and initial_correct == 1:
        vw.last_correct = datetime.fromisoformat(prev_last_correct) if prev_last_correct else None
        vw.correct_count = prev_correct_count

    db.session.commit()
    return jsonify({"status": "ok"})
