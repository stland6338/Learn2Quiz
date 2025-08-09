from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime
from enum import Enum


class QuestionType(str, Enum):
    MCQ = "mcq"
    TRUE_FALSE = "tf"
    CLOZE = "cloze"


class SourceType(str, Enum):
    MANUAL = "manual"
    FILE = "file"
    URL = "url"


# User schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Note schemas
class NoteBase(BaseModel):
    raw_text: str
    source_type: SourceType = SourceType.MANUAL
    title: Optional[str] = None


class NoteCreate(NoteBase):
    pass


class Note(NoteBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Card schemas
class CardBase(BaseModel):
    type: QuestionType
    prompt: str
    answer: str
    choices: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    rationale: Optional[str] = None


class CardCreate(CardBase):
    note_id: int


class CardUpdate(BaseModel):
    prompt: Optional[str] = None
    answer: Optional[str] = None
    choices: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    rationale: Optional[str] = None


class Card(CardBase):
    id: int
    user_id: int
    note_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ReviewState schemas
class ReviewState(BaseModel):
    id: int
    user_id: int
    card_id: int
    easiness: float
    interval_days: int
    repetition: int
    due_date: datetime
    last_result: Optional[int] = None
    last_reviewed: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Quiz schemas
class QuizCreate(BaseModel):
    title: Optional[str] = None


class QuizItemAnswer(BaseModel):
    card_id: int
    user_answer: str
    time_sec: Optional[int] = None


class QuizSubmission(BaseModel):
    quiz_id: int
    answers: List[QuizItemAnswer]


class QuizItem(BaseModel):
    id: int
    card_id: int
    card: Card
    user_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    time_sec: Optional[int] = None
    
    class Config:
        from_attributes = True


class Quiz(BaseModel):
    id: int
    user_id: int
    title: Optional[str] = None
    completed: bool
    score: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    quiz_items: List[QuizItem] = []
    
    class Config:
        from_attributes = True


# Daily quiz response
class DailyQuiz(BaseModel):
    quiz: Quiz
    remaining_count: int
    streak_days: int


# Statistics schemas
class TagStats(BaseModel):
    tag: str
    correct_count: int
    total_count: int
    accuracy_rate: float


class UserStats(BaseModel):
    streak_days: int
    total_cards: int
    due_today: int
    weak_tags: List[TagStats]
    recommended_study_time: int  # minutes


# Generation request
class GenerateCardsRequest(BaseModel):
    note_id: int
    language: Optional[str] = "auto"
    subject: Optional[str] = "general"