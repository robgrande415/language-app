import os
from flask import Blueprint, request, jsonify, send_file, current_app
from openai import OpenAI
import csv
from io import StringIO, BytesIO
import re
import random
from dotenv import load_dotenv
from flask_cors import cross_origin

from models import db, User, Module, Sentence, Error

api_blueprint = Blueprint("api", __name__)

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# hardcoded modules
MODULES = {
    "French": ["Simple present tense", "Imperfect", "Prepositions"],
    "Spanish": ["Ser vs Estar", "Nouns", "Preterite"],
}

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
    return jsonify(MODULES.get(language, []))


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
    prompt = (
        "Correct these, ignoring spelling errors.\n"
        "Respond in the format: \n"
        "<original french sentence> \n"
        "<correct french sentence with only the corrections in bold>\n"
        "<list of corrections with quick explanations, newline delimited>"
        "\n"
        "Ex. Our technical team is developing a secure digital portal for the bank’s lending services. - Notre equipe technique est en train de développer un interface digital securisé pour les services de prêt de la banque\n"
        "\n"
        "Notre equipe technique est en train de développer *une* interface *numérique* *sécurisée* pour les services de prêt de la banque\n"
        "Explanation:\n"
        "interface is feminine → une \n"
        "digital → numérique is preferred in formal/technical French\n"
        "securisé → sécurisée for feminine agreement"
        )
    prompt = f"{prompt}"
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

    # extract errors
    lines = text.splitlines()
    explanation_start = next((i for i, line in enumerate(lines) if line.strip().lower() == "explanation:"), None)
    explanation_lines = lines[explanation_start + 1:] if explanation_start is not None else []
    for line in explanation_lines:
        err = Error(sentence_id=sentence.id, error_text=line, module_id=module.id)
        db.session.add(err)
    db.session.commit()

    return jsonify({"response": text})


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
        writer.writerow(
            [
                s.timestamp,
                s.english_text,
                s.user_translation,
                s.openai_response.splitlines()[1] if s.openai_response else "",
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
