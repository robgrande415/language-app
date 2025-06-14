import os
from flask import Blueprint, request, jsonify, send_file, current_app
from openai import OpenAI
import csv
from io import StringIO, BytesIO
import re
import random
from dotenv import load_dotenv
from flask_cors import cross_origin
from collections import defaultdict

from models import (
    db,
    User,
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


@api_blueprint.route("/modules/<language>", methods=["GET"])
def modules(language):
    modules = Module.query.filter_by(language=language).all()
    names = [m.name for m in modules]
    return jsonify(names)


@api_blueprint.route("/modules", methods=["POST"])
def add_module():
    data = request.json
    name = data.get("name")
    language = data.get("language")
    if not name or not language:
        return jsonify({"error": "name and language required"}), 400
    module = Module(name=name, language=language)
    db.session.add(module)
    db.session.commit()
    return jsonify({"id": module.id, "name": module.name, "language": module.language})


@api_blueprint.route("/instruction", methods=["POST"])
def instruction():
    data = request.json
    module_name = data.get("module")
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


def generate_sentence_prompt(cefr, target_language, module):
    return (
        f"Generate a sentence in English for a student at the {cefr} level to translate into {target_language}. Randomize the topic."
        f"The sentence in {target_language} should cover the topic of: {module}."
    )


def generate_batch_prompt(cefr, target_language, module):
    return (
        f"Generate 20 short English sentences for a student at the {cefr} level to translate into {target_language}. "
        f"The sentences should cover the topic of: {module}. Number each sentence."
    )


def generate_sentence_batch(cefr, target_language, module):
    prompt = generate_batch_prompt(cefr, target_language, module)
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
    sentences = generate_sentence_batch(data["cefr"], data["language"], data["module"])
    SENTENCE_BATCHES[key] = sentences
    return jsonify({"count": len(sentences)})


@api_blueprint.route("/sentence/generate", methods=["POST"])
def generate_sentence():
    data = request.json
    key = (data["language"], data["module"], data["cefr"])
    batch = SENTENCE_BATCHES.get(key)
    if not batch:
        batch = generate_sentence_batch(data["cefr"], data["language"], data["module"])
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
        "Ignoring spelling or vocabulary mistakes, did the learner correctly "
        "convey the meaning and use the module concept? Respond only with 1 or 0."
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


@api_blueprint.route("/sentence/followup", methods=["POST"])
def followup():
    data = request.json
    error_text = data["error"]
    cefr = data["cefr"]
    language = data["language"]
    module = data["module"]
    prompt = (
        f"Generate a sentence in English for a student at the {cefr} level to translate into {language}. "
        f"Focus on the following error: {error_text}."
        f"The sentence should cover the topic of: {module}."
    )
    current_app.logger.info("OpenAI prompt: %s", prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    text = response.choices[0].message.content.strip()
    return jsonify({"sentence": text})


@api_blueprint.route("/errors/save", methods=["POST"])
def save_errors():
    data = request.json
    sentence_id = data.get("sentence_id")
    errors = data.get("errors", [])
    sentence = Sentence.query.get(sentence_id)
    if not sentence:
        return jsonify({"error": "Sentence not found"}), 404
    for line in errors:
        err = Error(sentence_id=sentence.id, error_text=line, module_id=sentence.module_id)
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

@api_blueprint.route("/personalized/topics", methods=["POST"])
def personalized_topics():
    data = request.json
    user_id = data.get("user_id")
    language = data.get("language")
    errors = (
        db.session.query(Error.error_text)
        .join(Sentence, Error.sentence_id == Sentence.id)
        .join(Module, Error.module_id == Module.id)
        .filter(Sentence.user_id == user_id, Module.language == language)
        .order_by(Sentence.timestamp.desc())
        .limit(20)
        .all()
    )
    texts = [e[0] for e in errors]
    if not texts:
        return jsonify({"topics": []})
    prompt = "Here are some student errors:\n" + "\n".join(texts) + "\nSummarize the 5 most common error topics as a numbered list."
    current_app.logger.info("OpenAI prompt: %s", prompt)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    current_app.logger.info(
        "OpenAI response: %s", response.choices[0].message.content.strip()
    )
    lines = [re.sub(r"^\d+[\).]\s*", "", l).strip() for l in response.choices[0].message.content.strip().splitlines() if l.strip()]
    return jsonify({"topics": lines[:5]})


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
    data = defaultdict(list)

    for res, name in rows:
        if len(data[name]) < 3:
            data[name].append(res.score)

    return jsonify(dict(data))


@api_blueprint.route("/vocab/add", methods=["POST"])
def add_vocab():
    data = request.json
    user_id = data.get("user_id")
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
        exists = VocabWord.query.filter_by(user_id=user_id, word=word).first()
        if exists:
            continue
        vw = VocabWord(user_id=user_id, word=word)
        db.session.add(vw)
        added += 1
    db.session.commit()
    return jsonify({"status": "ok", "count": added})


@api_blueprint.route("/vocab/<int:user_id>/export", methods=["GET"])
def export_vocab(user_id):
    words = VocabWord.query.filter_by(user_id=user_id).order_by(VocabWord.added_at).all()

    string_data = StringIO()
    writer = csv.writer(string_data)
    writer.writerow([
        "word",
        "added_at",
        "last_reviewed",
        "last_correct",
        "review_count",
        "correct_count",
    ])
    for w in words:
        writer.writerow([
            w.word,
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
