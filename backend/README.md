# Backend Setup

This Flask backend powers the language learning app.

## Requirements
- Python 3.10+
- PostgreSQL

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### Database

Run the provided script to create a local database and `.env` file:

```bash
./setup_db.sh
```

Fill in your `OPENAI_API_KEY` in `backend/.env` after running the script.

### Running the Server

Start the development server on port 5000:

```bash
python app.py
```

CORS is enabled for the React frontend running on `http://localhost:3000`.
