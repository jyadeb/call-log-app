# Call Log

A full-stack app for logging sales calls. From my experience, call notes can vary from blurbs of broken sentences and very short quick notes. This app organizes and makes notes for you. Easily paste rough call notes, let an LLM turn them into a structured record, correct anything it got wrong, then save. Calls are listed and filterable by outcome, and grouped under the firm they belong to.

Built in October 2026 to solve the problem of unorganized call notes and learn Django REST Framework, React and TypeScript end to end.

**Stack:** Python, Django, Django REST Framework, SQLite · React, TypeScript, Vite · Anthropic API

## What it does

1. **Paste notes → Parse.** The notes go to `POST /api/calls/parse/`. Django sends them to the Anthropic API and returns a *preview*: firm, contact, role, outcome, reason, next action, follow-up date. Nothing is saved at this step.
2. **Review and edit.** The preview fills an editable form. If the firm name matches an existing firm, it is preselected; if not, the form offers to create it. The date defaults to today, and the form warns when a next action has no follow-up date (it would never appear in the due list).
3. **Save.** If the firm is new, the frontend creates it (`POST /api/firms/`), then saves the call (`POST /api/calls/`) with the original notes kept as `raw_notes`. The list refreshes on its own.
4. **Browse.** The call list can be filtered by outcome (`?outcome=booked`, etc.).

## How the AI part is designed

- **The model fills a form; a person saves it.** `/parse/` never writes to the database. Every field can be corrected before Save.
- **Forced output shape.** The request uses a JSON schema, so the reply always has the same seven fields. The allowed outcomes come from the `Call.Outcome` choices in `models.py`, so the prompt and the database cannot drift apart.
- **Checked twice.** The reply is validated again on the server by a DRF serializer before it reaches the browser. A reply that fails returns `422`.
- **"Not stated" is null, not a guess.** The prompt asks for `null` when the notes don't say something, and for vague timing ("next week") the follow-up date stays `null`. Today's date is passed in so phrases like "next Thursday" resolve to a real date.
- **Notes are treated as data.** They are wrapped in `<notes>` tags and the prompt tells the model to ignore instructions inside them. This reduces prompt-injection risk; it does not eliminate it, which is one more reason a person reviews before saving.
- **Two kinds of failure.** `502` means the AI service gave no usable reply (network, auth, timeout). `422` means it replied but the output was unusable or failed validation.

## API

| Method | Path | Purpose | Responses |
|---|---|---|---|
| GET | `/api/calls/` | List calls, newest first. Optional `?outcome=` filter | 200 |
| POST | `/api/calls/` | Create a call | 201, 400 |
| GET | `/api/calls/due/` | Calls with a follow-up date on or before today | 200 |
| POST | `/api/calls/parse/` | Notes → AI preview (never saves) | 200, 400, 422, 502 |
| GET / PATCH | `/api/calls/<id>/` | Read or update one call | 200, 400, 404 |
| GET | `/api/firms/` | List firms | 200 |
| POST | `/api/firms/` | Create a firm | 201, 400 |
| GET | `/api/firms/<id>/` | One firm with its full call history | 200, 404 |

## Run it locally

You need Python (built with 3.14), Node.js 20.19+ or 22.12+ (Vite's minimum), and an Anthropic API key.

**Backend** (terminal 1):

```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Before starting the server, open `backend/.env` and put your key after `ANTHROPIC_API_KEY=`. Without it, everything works except Parse, which returns `502`.

**Frontend** (terminal 2):

```
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. CORS only allows that exact origin, so other ports will be blocked.

## Testing

Tested by hand, not yet by an automated suite:

- List, outcome filter, and an empty filter result.
- Parse → edit → save for an existing firm and for a new firm, checked in the list and the Django request log.
- Error paths: blank notes (`400`), a POST without the trailing slash (`500`, shown on screen), wrong API prefix (`404`).
- TypeScript break tests: renaming a field in the type is caught at compile time; renaming it on the backend is not (the column goes blank at runtime).

## Known limits

- **Local development only.** `DEBUG` is on, there is no authentication, and the database is SQLite. The fallback `SECRET_KEY` in `settings.py` is for local use only; any deployment must set `DJANGO_SECRET_KEY`.
- **Firm matching is exact for now.** It ignores case but nothing else, so "Acme Ltd" and "Acme Limited" are different firms unless you pick the existing one in the form.
- **Creating a new firm and its call are two requests.** If the call fails to save, the firm already exists; the form switches to it so a retry does not create a duplicate.
- **No automated tests yet.**