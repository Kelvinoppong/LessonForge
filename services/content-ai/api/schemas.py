"""Exercise schemas.

These mirror `src/lib/types.ts` in the web app. The web app re-validates
everything it receives, so this file is the service's own guarantee that it never
emits a shape the platform can't render.
"""

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, field_validator, model_validator


class Point(BaseModel):
    x: float
    y: float


class CoordinatePlotExercise(BaseModel):
    kind: Literal["coordinate_plot"]
    prompt: str = Field(min_length=1)
    target: Point
    gridRange: int = Field(default=10, ge=4, le=20)
    tolerance: float = Field(default=0.4, ge=0.1, le=1.0)
    hint: str | None = None

    @model_validator(mode="after")
    def target_inside_grid(self) -> "CoordinatePlotExercise":
        if abs(self.target.x) > self.gridRange or abs(self.target.y) > self.gridRange:
            raise ValueError(
                f"target ({self.target.x}, {self.target.y}) falls outside a "
                f"±{self.gridRange} grid"
            )
        return self


class CoordinateReadExercise(BaseModel):
    kind: Literal["coordinate_read"]
    prompt: str = Field(min_length=1)
    shown: Point
    gridRange: int = Field(default=10, ge=4, le=20)
    choices: list[str] = Field(min_length=2, max_length=6)
    answerIndex: int = Field(ge=0)
    hint: str | None = None

    @model_validator(mode="after")
    def answer_in_range(self) -> "CoordinateReadExercise":
        if self.answerIndex >= len(self.choices):
            raise ValueError(
                f"answerIndex {self.answerIndex} is out of range for "
                f"{len(self.choices)} choices"
            )
        if abs(self.shown.x) > self.gridRange or abs(self.shown.y) > self.gridRange:
            raise ValueError("shown point falls outside the grid")
        return self


class ListeningChoiceExercise(BaseModel):
    kind: Literal["listening_choice"]
    prompt: str = Field(min_length=1)
    audioText: str = Field(min_length=1)
    choices: list[str] = Field(min_length=2, max_length=6)
    answerIndex: int = Field(ge=0)
    transcript: str | None = None

    @model_validator(mode="after")
    def answer_in_range(self) -> "ListeningChoiceExercise":
        if self.answerIndex >= len(self.choices):
            raise ValueError(
                f"answerIndex {self.answerIndex} is out of range for "
                f"{len(self.choices)} choices"
            )
        return self


class ListeningTypeExercise(BaseModel):
    kind: Literal["listening_type"]
    prompt: str = Field(min_length=1)
    audioText: str = Field(min_length=1)
    accepted: list[str] = Field(min_length=1, max_length=8)
    transcript: str | None = None

    @field_validator("accepted")
    @classmethod
    def non_empty_answers(cls, value: list[str]) -> list[str]:
        cleaned = [v.strip() for v in value if v.strip()]
        if not cleaned:
            raise ValueError("accepted must contain at least one non-empty answer")
        return cleaned


Exercise = Annotated[
    Union[
        CoordinatePlotExercise,
        CoordinateReadExercise,
        ListeningChoiceExercise,
        ListeningTypeExercise,
    ],
    Field(discriminator="kind"),
]


class Draft(BaseModel):
    """What the model is asked to return."""

    message: str = Field(min_length=1, description="Short note to the author")
    exercises: list[Exercise] = Field(min_length=1, max_length=12)


class HistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class DraftRequest(BaseModel):
    course: Literal["spanish", "math"]
    skill: str = Field(min_length=1, max_length=120)
    instruction: str = Field(min_length=1, max_length=2000)
    history: list[HistoryTurn] = Field(default_factory=list, max_length=20)
    currentExercises: list[Exercise] | None = None


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1200)
    voice: str = Field(default="nova", max_length=40)
