# content-ai service

Drafts lesson exercises with GPT-4 and generates Spanish audio with OpenAI TTS.
Deployed as its **own Vercel project** so that OpenAI credentials and long-running
model calls stay isolated from the web app.

## Why it's a separate service

- The web app never holds an `OPENAI_API_KEY`.
- Model calls are slow and failure-prone; keeping them behind a boundary means a
  provider outage degrades authoring without touching learners or telemetry.
- It scales and deploys on its own cadence — prompt changes don't require
  redeploying the platform.

## Endpoints

| Method | Path      | Purpose                                              |
| ------ | --------- | ---------------------------------------------------- |
| `GET`  | `/health` | Readiness plus which models and secrets are wired up |
| `POST` | `/draft`  | Author request → validated exercises                 |
| `POST` | `/speech` | Spanish text → base64 mp3                            |

`/draft` and `/speech` require `Authorization: Bearer $CONTENT_AI_TOKEN`.

## Schema self-repair

`/draft` asks the model for JSON, validates it with Pydantic, and on failure feeds
the validation error back for one corrective attempt before giving up. Invalid
exercises never leave the service, and the web app validates again on receipt.

## Local development

```bash
cd services/content-ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export OPENAI_API_KEY=sk-...
export CONTENT_AI_TOKEN=dev-local-token-change-me

uvicorn api.index:app --reload --port 8000
```

Then point the web app at it with `CONTENT_AI_URL=http://127.0.0.1:8000`.

## Deploying

```bash
cd services/content-ai
vercel --prod
```

Set `OPENAI_API_KEY`, `CONTENT_AI_TOKEN`, `OPENAI_MODEL`, and `OPENAI_TTS_MODEL`
in the project's environment variables. Use the same `CONTENT_AI_TOKEN` value in
the web project.
