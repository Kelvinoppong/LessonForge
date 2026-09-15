"""LessonForge content-AI service.

A small, single-responsibility service: turn an author's plain-language request
into validated lesson exercises, and turn Spanish text into audio. It holds the
OpenAI credentials so the web app never needs them, and it is deployed as its own
Vercel project.
"""

import base64
import json
import logging
import os
import secrets
import time
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from openai import OpenAI, OpenAIError
from pydantic import ValidationError

from api.prompts import repair_prompt, system_prompt, user_prompt
from api.schemas import Draft, DraftRequest, SpeechRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("content-ai")

app = FastAPI(title="LessonForge content-ai", version="0.1.0")

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
TTS_MODEL = os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
EXPECTED_TOKEN = os.environ.get("CONTENT_AI_TOKEN", "")

_client: Optional[OpenAI] = None


def client() -> OpenAI:
    """Lazily construct the client so the module imports without a key present."""
    global _client
    if _client is None:
        if not os.environ.get("OPENAI_API_KEY"):
            raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")
        _client = OpenAI()
    return _client


def require_token(request: Request) -> None:
    """Shared-secret auth. This service must not be openly callable — it spends money."""
    if not EXPECTED_TOKEN:
        logger.warning("CONTENT_AI_TOKEN unset; refusing requests")
        raise HTTPException(status_code=503, detail="Service auth is not configured")

    header = request.headers.get("authorization", "")
    presented = header[7:] if header.startswith("Bearer ") else ""

    if not secrets.compare_digest(presented, EXPECTED_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid or missing bearer token")


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "model": MODEL,
        "ttsModel": TTS_MODEL,
        "openaiConfigured": bool(os.environ.get("OPENAI_API_KEY")),
        "authConfigured": bool(EXPECTED_TOKEN),
    }


@app.post("/draft", dependencies=[Depends(require_token)])
def draft(req: DraftRequest) -> dict[str, object]:
    """Draft exercises, with one self-repair attempt if the model breaks schema.

    Models occasionally emit a plausible-looking exercise with, say, an
    answerIndex past the end of the choices array. Rather than failing the
    author's turn, we hand the validation error back and let the model fix it.
    """
    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt(req.course)},
    ]
    for turn in req.history:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": user_prompt(req)})

    last_error: Optional[str] = None

    for attempt in range(2):
        if last_error:
            messages.append({"role": "user", "content": repair_prompt(last_error)})

        started = time.monotonic()
        try:
            completion = client().chat.completions.create(
                model=MODEL,
                messages=messages,  # type: ignore[arg-type]
                response_format={"type": "json_object"},
                temperature=0.7,
            )
        except OpenAIError as exc:
            logger.exception("OpenAI call failed")
            raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}") from exc

        elapsed_ms = int((time.monotonic() - started) * 1000)
        content = completion.choices[0].message.content or ""

        try:
            parsed = Draft.model_validate_json(content)
        except (ValidationError, json.JSONDecodeError) as exc:
            last_error = str(exc)[:1500]
            logger.warning("draft attempt %s failed validation: %s", attempt + 1, last_error)
            messages.append({"role": "assistant", "content": content})
            continue

        logger.info(
            "drafted %s exercises for %s/%s in %sms (attempt %s)",
            len(parsed.exercises),
            req.course,
            req.skill,
            elapsed_ms,
            attempt + 1,
        )
        return {
            "message": parsed.message,
            "exercises": [ex.model_dump(exclude_none=True) for ex in parsed.exercises],
            "model": MODEL,
            "latencyMs": elapsed_ms,
            "attempts": attempt + 1,
        }

    raise HTTPException(
        status_code=422,
        detail=f"Model could not produce valid exercises after 2 attempts: {last_error}",
    )


@app.post("/speech", dependencies=[Depends(require_token)])
def speech(req: SpeechRequest) -> dict[str, str]:
    """Text-to-speech for listening exercises.

    Returns base64 rather than a stream because the caller uploads the bytes to
    blob storage; streaming would just force it to buffer anyway.
    """
    try:
        result = client().audio.speech.create(
            model=TTS_MODEL,
            voice=req.voice,
            input=req.text,
            response_format="mp3",
            instructions="Read clearly in neutral Latin American Spanish, at a pace suitable for a language learner.",
        )
        audio_bytes = result.read()
    except OpenAIError as exc:
        logger.exception("TTS failed")
        raise HTTPException(status_code=502, detail=f"Speech synthesis failed: {exc}") from exc

    return {
        "audioBase64": base64.b64encode(audio_bytes).decode("ascii"),
        "contentType": "audio/mpeg",
        "model": TTS_MODEL,
    }
