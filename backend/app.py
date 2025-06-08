from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

from models import db


load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


def create_app():
    db.init_app(app)
    with app.app_context():
        db.create_all()
    return app


from routes import api_blueprint
app.register_blueprint(api_blueprint)

if __name__ == '__main__':
    create_app().run(port=5000, debug=True)
