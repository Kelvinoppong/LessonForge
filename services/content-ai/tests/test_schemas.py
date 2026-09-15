"""Validation is this service's contract with the platform, so it's tested directly.

Every case here represents model output that looked plausible but would have
rendered as a broken exercise in front of a learner.
"""

import pytest
from pydantic import ValidationError

from api.schemas import Draft


def draft(*exercises: dict) -> dict:
    return {"message": "Drafted some exercises.", "exercises": list(exercises)}


def test_accepts_a_well_formed_mixed_draft() -> None:
    parsed = Draft.model_validate(
        draft(
            {
                "kind": "coordinate_plot",
                "prompt": "Plot the point (3, 2).",
                "target": {"x": 3, "y": 2},
                "gridRange": 10,
            },
            {
                "kind": "listening_choice",
                "prompt": "Listen. What did she say?",
                "audioText": "Hola, ¿cómo estás?",
                "choices": ["Hello, how are you?", "Goodbye"],
                "answerIndex": 0,
            },
        )
    )

    assert len(parsed.exercises) == 2
    assert parsed.exercises[0].kind == "coordinate_plot"


def test_rejects_answer_index_past_the_choices() -> None:
    with pytest.raises(ValidationError, match="out of range"):
        Draft.model_validate(
            draft(
                {
                    "kind": "listening_choice",
                    "prompt": "Listen.",
                    "audioText": "Hola.",
                    "choices": ["Hi", "Bye"],
                    "answerIndex": 5,
                }
            )
        )


def test_rejects_a_target_outside_the_grid() -> None:
    with pytest.raises(ValidationError, match="outside"):
        Draft.model_validate(
            draft(
                {
                    "kind": "coordinate_plot",
                    "prompt": "Plot the point (99, 0).",
                    "target": {"x": 99, "y": 0},
                    "gridRange": 10,
                }
            )
        )


def test_rejects_a_shown_point_outside_the_grid() -> None:
    with pytest.raises(ValidationError, match="outside"):
        Draft.model_validate(
            draft(
                {
                    "kind": "coordinate_read",
                    "prompt": "Name the point.",
                    "shown": {"x": 40, "y": 40},
                    "gridRange": 10,
                    "choices": ["(40, 40)", "(4, 4)"],
                    "answerIndex": 0,
                }
            )
        )


def test_rejects_a_single_choice_question() -> None:
    with pytest.raises(ValidationError):
        Draft.model_validate(
            draft(
                {
                    "kind": "listening_choice",
                    "prompt": "Listen.",
                    "audioText": "Hola.",
                    "choices": ["Hi"],
                    "answerIndex": 0,
                }
            )
        )


def test_rejects_an_empty_draft() -> None:
    with pytest.raises(ValidationError):
        Draft.model_validate(draft())


def test_strips_blank_accepted_answers() -> None:
    parsed = Draft.model_validate(
        draft(
            {
                "kind": "listening_type",
                "prompt": "Type what you hear.",
                "audioText": "La cuenta, por favor.",
                "accepted": ["La cuenta, por favor", "   ", ""],
            }
        )
    )

    assert parsed.exercises[0].accepted == ["La cuenta, por favor"]


def test_rejects_an_unknown_exercise_kind() -> None:
    with pytest.raises(ValidationError):
        Draft.model_validate(draft({"kind": "essay", "prompt": "Write an essay."}))
