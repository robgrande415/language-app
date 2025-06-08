import os
from flask import Blueprint, request, jsonify, send_file
from openai import OpenAI
import csv
from io import StringIO
import re
from dotenv import load_dotenv
from flask_cors import cross_origin

from models import db, User, Module, Sentence, Error

api_blueprint = Blueprint('api', __name__)

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# hardcoded modules
MODULES = {
    'French': ['Simple present tense', 'Imperfect', 'Prepositions'],
    'Spanish': ['Ser vs Estar', 'Nouns', 'Preterite'],
}


@api_blueprint.route('/users', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin(origin='http://localhost:3000')
def users():
    if request.method == 'POST':
        name = request.json.get('name')
        user = User(name=name)
        db.session.add(user)
        db.session.commit()
        return jsonify({'id': user.id, 'name': user.name})
    users = User.query.all()
    return jsonify([{'id': u.id, 'name': u.name} for u in users])


@api_blueprint.route('/modules/<language>', methods=['GET'])
def modules(language):
    return jsonify(MODULES.get(language, []))


def generate_sentence_prompt(cefr, target_language, module):
    return (
        f"Generate a sentence in English for a student at the {cefr} level to translate into {target_language}. "
        f"The sentence in {target_language} should cover the topic of: {module}."
    )


@api_blueprint.route('/sentence/generate', methods=['POST'])
def generate_sentence():
    data = request.json
    prompt = generate_sentence_prompt(data['cefr'], data['language'], data['module'])
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content.strip()
    return jsonify({'sentence': text})


@api_blueprint.route('/sentence/submit', methods=['POST'])
def submit_sentence():
    data = request.json
    user_id = data['user_id']
    module_name = data['module']
    language = data['language']
    cefr = data['cefr']
    english = data['english']
    translation = data['translation']

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

    prompt = (
        "Correct this translation in the format:\n"
        "<user submitted sentence>\n"
        "<corrected sentence with corrections in **boldface**>\n"
        "<list of corrections with explanations, newline delimited>"
    )
    prompt = f"{prompt}"
    user_message = f"{translation}\n{english}"
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt + "\n" + user_message}],
    )
    text = response.choices[0].message.content.strip()
    sentence.openai_response = text
    db.session.commit()

    # extract errors
    lines = text.splitlines()
    explanation_lines = lines[2:]
    for line in explanation_lines:
        err = Error(sentence_id=sentence.id, error_text=line, module_id=module.id)
        db.session.add(err)
    db.session.commit()

    return jsonify({'response': text})


@api_blueprint.route('/sentence/followup', methods=['POST'])
def followup():
    data = request.json
    error_text = data['error']
    cefr = data['cefr']
    language = data['language']
    module = data['module']
    prompt = (
        f"Generate a sentence in English for a student at the {cefr} level to translate into {language}. "
        f"Focus on the following error: {error_text}." 
        f"The sentence should cover the topic of: {module}."
    )
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message.content.strip()
    return jsonify({'sentence': text})


@api_blueprint.route('/session/<int:user_id>/export', methods=['GET'])
def export_session(user_id):
    sentences = Sentence.query.filter_by(user_id=user_id).all()
    csv_data = StringIO()
    writer = csv.writer(csv_data)
    writer.writerow(['timestamp', 'english', 'submitted', 'corrected', 'explanation', 'module', 'language', 'cefr'])
    for s in sentences:
        explanation = s.openai_response.replace('\n', ' ')
        writer.writerow([
            s.timestamp,
            s.english_text,
            s.user_translation,
            s.openai_response.splitlines()[1] if s.openai_response else '',
            explanation,
            s.module.name,
            s.module.language,
            s.cefr_level,
        ])
    csv_data.seek(0)
    return send_file(
        csv_data,
        mimetype='text/csv',
        as_attachment=True,
        download_name='session.csv',
    )
