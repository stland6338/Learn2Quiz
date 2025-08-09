from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    notes = relationship("Note", back_populates="user")
    cards = relationship("Card", back_populates="user")
    review_states = relationship("ReviewState", back_populates="user")
    quizzes = relationship("Quiz", back_populates="user")


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    source_type = Column(String(50), default="manual")  # manual, file, url
    title = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    user = relationship("User", back_populates="notes")
    cards = relationship("Card", back_populates="note")


class Card(Base):
    __tablename__ = "cards"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    type = Column(String(20), nullable=False)  # mcq, tf, cloze
    prompt = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    choices = Column(JSON)  # 選択肢（MCQの場合）
    tags = Column(JSON)  # タグリスト
    rationale = Column(Text)  # 根拠・解説
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # リレーション
    user = relationship("User", back_populates="cards")
    note = relationship("Note", back_populates="cards")
    review_state = relationship("ReviewState", back_populates="card", uselist=False)
    quiz_items = relationship("QuizItem", back_populates="card")


class ReviewState(Base):
    __tablename__ = "review_states"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    easiness = Column(Float, default=2.5)  # EF値
    interval_days = Column(Integer, default=1)
    repetition = Column(Integer, default=0)
    due_date = Column(DateTime, nullable=False)
    last_result = Column(Integer)  # 0-5
    last_reviewed = Column(DateTime)
    
    # リレーション
    user = relationship("User", back_populates="review_states")
    card = relationship("Card", back_populates="review_state")


class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200))
    completed = Column(Boolean, default=False)
    score = Column(Float)  # 正答率
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # リレーション
    user = relationship("User", back_populates="quizzes")
    quiz_items = relationship("QuizItem", back_populates="quiz")


class QuizItem(Base):
    __tablename__ = "quiz_items"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    user_answer = Column(Text)
    is_correct = Column(Boolean)
    time_sec = Column(Integer)  # 回答時間（秒）
    
    # リレーション
    quiz = relationship("Quiz", back_populates="quiz_items")
    card = relationship("Card", back_populates="quiz_items")


class Assignment(Base):
    __tablename__ = "assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    card_ids = Column(JSON)  # 出題するカードのIDリスト
    assignee_ids = Column(JSON)  # 受講者のIDリスト
    due_on = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)