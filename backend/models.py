from datetime import datetime
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Module(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    language = db.Column(db.String(20), nullable=False)


class Sentence(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    english_text = db.Column(db.Text, nullable=False)
    user_translation = db.Column(db.Text)
    openai_response = db.Column(db.Text)
    cefr_level = db.Column(db.String(2), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('sentences', lazy=True))
    module = db.relationship('Module', backref=db.backref('sentences', lazy=True))


class Error(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sentence_id = db.Column(db.Integer, db.ForeignKey('sentence.id'), nullable=False)
    error_text = db.Column(db.Text)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)

    sentence = db.relationship('Sentence', backref=db.backref('errors', lazy=True))
    module = db.relationship('Module', backref=db.backref('errors', lazy=True))
