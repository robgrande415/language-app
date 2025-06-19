from datetime import datetime
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    language = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    chapters = db.relationship(
        "Chapter", backref="course", cascade="all, delete-orphan", lazy=True
    )


class Chapter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("course.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    modules = db.relationship(
        "Module", backref="chapter", cascade="all, delete-orphan", lazy=True
    )

class Module(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    language = db.Column(db.String(20), nullable=False)
    chapter_id = db.Column(db.Integer, db.ForeignKey("chapter.id"))


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
    last_reviewed = db.Column(db.DateTime, nullable=True)
    last_reviewed_correctly = db.Column(db.DateTime, nullable=True)
    review_count = db.Column(db.Integer, default=0)
    correct_review_count = db.Column(db.Integer, default=0)


    sentence = db.relationship('Sentence', backref=db.backref('errors', lazy=True))
    module = db.relationship('Module', backref=db.backref('errors', lazy=True))


class ModuleResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    questions_answered = db.Column(db.Integer, nullable=False)
    questions_correct = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Float, nullable=False)

    user = db.relationship('User', backref=db.backref('module_results', lazy=True))
    module = db.relationship('Module', backref=db.backref('module_results', lazy=True))


class Instruction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False, unique=True)
    text = db.Column(db.Text, nullable=False)

    module = db.relationship('Module', backref=db.backref('instruction', uselist=False))


class VocabWord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    word = db.Column(db.String(120), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_reviewed = db.Column(db.DateTime)
    last_correct = db.Column(db.DateTime)
    review_count = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)

    user = db.relationship('User', backref=db.backref('vocab_words', lazy=True))
