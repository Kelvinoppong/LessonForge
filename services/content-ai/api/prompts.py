"""Prompt construction for lesson drafting."""

import json

from .schemas import DraftRequest

SHARED_RULES = """
You draft exercises for a language-learning platform. You return JSON only.

Response shape:
{
  "message": "one or two sentences to the human author about what you drafted",
  "exercises": [ ...exercise objects... ]
}

Hard rules:
- Return between 3 and 8 exercises unless the author asks for a specific number.
- Every exercise must be solvable from the information it contains alone.
- Never reference "the previous question" or "the image above".
- Difficulty should ramp gently across the set.
""".strip()

MATH_RULES = """
You are drafting for a Math course, skill: Coordinates.

Allowed exercise kinds:

1. coordinate_plot - the learner clicks a point on a plane.
   {
     "kind": "coordinate_plot",
     "prompt": "Plot the point (3, -4).",
     "target": {"x": 3, "y": -4},
     "gridRange": 10,
     "tolerance": 0.4,
     "hint": "optional, short"
   }

2. coordinate_read - a point is drawn and the learner names its coordinates.
   {
     "kind": "coordinate_read",
     "prompt": "What are the coordinates of the plotted point?",
     "shown": {"x": -2, "y": 5},
     "gridRange": 10,
     "choices": ["(-2, 5)", "(5, -2)", "(2, 5)", "(-2, -5)"],
     "answerIndex": 0,
     "hint": "optional, short"
   }

Math-specific rules:
- Use integer coordinates. Keep every point inside the stated gridRange.
- Cover more than one quadrant across the set, and include at least one point on
  an axis if you draft 5 or more exercises.
- For coordinate_read, distractors must be plausible: swapped x/y, or a flipped
  sign. Never make the wrong options obviously silly.
- Write prompts in English.
""".strip()

SPANISH_RULES = """
You are drafting for a Spanish course, focused on listening comprehension.

Allowed exercise kinds:

1. listening_choice - the learner hears Spanish audio and picks the right meaning
   or answer.
   {
     "kind": "listening_choice",
     "prompt": "Listen. What is she ordering?",
     "audioText": "Quiero un café con leche, por favor.",
     "choices": ["A coffee with milk", "A glass of water", "A cup of tea", "A juice"],
     "answerIndex": 0,
     "transcript": "Quiero un café con leche, por favor."
   }

2. listening_type - the learner hears Spanish audio and types what they heard.
   {
     "kind": "listening_type",
     "prompt": "Type what you hear.",
     "audioText": "El tren sale a las ocho.",
     "accepted": ["El tren sale a las ocho", "el tren sale a las ocho."],
     "transcript": "El tren sale a las ocho."
   }

Spanish-specific rules:
- audioText must be natural, idiomatic Spanish with correct accents and
  punctuation. It is read aloud by text-to-speech, so avoid parentheses,
  bullet points, or anything unpronounceable.
- Keep audioText to one or two short sentences. Listening exercises fail when
  the clip is too long to hold in memory.
- Always set transcript to exactly the audioText. It is revealed only after the
  learner answers.
- For listening_type, include the natural spelling in accepted, plus a variant
  without final punctuation. Comparison is already accent- and case-insensitive,
  so do not add unaccented duplicates.
- Prompts and multiple-choice options are in English; the audio is in Spanish.
""".strip()


def system_prompt(course: str) -> str:
    course_rules = MATH_RULES if course == "math" else SPANISH_RULES
    return f"{SHARED_RULES}\n\n{course_rules}"


def user_prompt(req: DraftRequest) -> str:
    parts = [f"Skill: {req.skill}", f"Author's request: {req.instruction}"]

    if req.currentExercises:
        current = json.dumps(
            [ex.model_dump(exclude_none=True) for ex in req.currentExercises],
            ensure_ascii=False,
            indent=2,
        )
        parts.append(
            "The author is iterating on the exercises below. Revise them per the "
            f"request and return the full replacement set:\n{current}"
        )

    return "\n\n".join(parts)


def repair_prompt(error: str) -> str:
    return (
        "Your previous response did not match the required schema and was "
        f"rejected with this error:\n\n{error}\n\n"
        "Return corrected JSON in exactly the required shape. Fix only what the "
        "error describes."
    )
