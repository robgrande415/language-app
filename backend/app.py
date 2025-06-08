from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os

from models import db
from routes import api_blueprint

load_dotenv()

def create_app():
    app = Flask(__name__)

    # ✅ CORS must be applied here BEFORE blueprints
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    app.register_blueprint(api_blueprint)

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5050)
