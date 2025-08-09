from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import models, schemas
from app.services.spaced_repetition import SM2Algorithm

router = APIRouter()


@router.get("/daily-quiz", response_model=schemas.DailyQuiz)
def get_daily_quiz(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """今日の学習クイズを取得"""
    sm2 = SM2Algorithm()
    
    # 今日学習すべきカードを取得
    daily_cards = sm2.get_daily_cards(db, current_user.id)
    
    if not daily_cards:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No cards available for today"
        )
    
    # クイズを作成
    db_quiz = models.Quiz(
        user_id=current_user.id,
        title=f"Daily Quiz - {datetime.now().strftime('%Y-%m-%d')}"
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    # クイズアイテムを作成
    quiz_items = []
    for card in daily_cards:
        quiz_item = models.QuizItem(
            quiz_id=db_quiz.id,
            card_id=card.id
        )
        db.add(quiz_item)
        quiz_items.append(quiz_item)
    
    db.commit()
    
    # レスポンスを構築
    for item in quiz_items:
        db.refresh(item)
    
    # 統計情報を取得
    remaining_count = len(sm2.get_due_cards(db, current_user.id, limit=100)) - len(daily_cards)
    streak_days = sm2.calculate_study_streak(db, current_user.id)
    
    return schemas.DailyQuiz(
        quiz=schemas.Quiz(
            id=db_quiz.id,
            user_id=db_quiz.user_id,
            title=db_quiz.title,
            completed=db_quiz.completed,
            score=db_quiz.score,
            created_at=db_quiz.created_at,
            completed_at=db_quiz.completed_at,
            quiz_items=[
                schemas.QuizItem(
                    id=item.id,
                    card_id=item.card_id,
                    card=schemas.Card(
                        id=item.card.id,
                        user_id=item.card.user_id,
                        note_id=item.card.note_id,
                        type=schemas.QuestionType(item.card.type),
                        prompt=item.card.prompt,
                        answer=item.card.answer,
                        choices=item.card.choices,
                        tags=item.card.tags,
                        rationale=item.card.rationale,
                        created_at=item.card.created_at
                    )
                ) for item in quiz_items
            ]
        ),
        remaining_count=max(0, remaining_count),
        streak_days=streak_days
    )


@router.post("/submit-quiz", response_model=schemas.Quiz)
def submit_quiz(
    submission: schemas.QuizSubmission,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """クイズの回答を提出して採点"""
    # クイズの存在確認
    quiz = (
        db.query(models.Quiz)
        .filter(models.Quiz.id == submission.quiz_id, models.Quiz.user_id == current_user.id)
        .first()
    )
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    if quiz.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz already completed"
        )
    
    sm2 = SM2Algorithm()
    correct_count = 0
    total_count = len(submission.answers)
    
    # 各回答を採点してReviewStateを更新
    for answer in submission.answers:
        quiz_item = (
            db.query(models.QuizItem)
            .filter(
                models.QuizItem.quiz_id == submission.quiz_id,
                models.QuizItem.card_id == answer.card_id
            )
            .first()
        )
        
        if not quiz_item:
            continue
        
        # 採点
        card = quiz_item.card
        is_correct = _evaluate_answer(card, answer.user_answer)
        
        # QuizItemを更新
        quiz_item.user_answer = answer.user_answer
        quiz_item.is_correct = is_correct
        quiz_item.time_sec = answer.time_sec
        
        if is_correct:
            correct_count += 1
        
        # ReviewStateを更新（SM-2アルゴリズム）
        review_state = (
            db.query(models.ReviewState)
            .filter(
                models.ReviewState.user_id == current_user.id,
                models.ReviewState.card_id == answer.card_id
            )
            .first()
        )
        
        if review_state:
            # SM-2の品質スコアに変換（正解: 4-5, 不正解: 0-2）
            quality = 4 if is_correct else 1
            sm2.calculate_next_review(review_state, quality)
    
    # クイズを完了状態に
    quiz.completed = True
    quiz.score = correct_count / total_count if total_count > 0 else 0.0
    quiz.completed_at = datetime.utcnow()
    
    db.commit()
    
    # 更新されたクイズを返す
    db.refresh(quiz)
    quiz_items = (
        db.query(models.QuizItem)
        .filter(models.QuizItem.quiz_id == quiz.id)
        .all()
    )
    
    return schemas.Quiz(
        id=quiz.id,
        user_id=quiz.user_id,
        title=quiz.title,
        completed=quiz.completed,
        score=quiz.score,
        created_at=quiz.created_at,
        completed_at=quiz.completed_at,
        quiz_items=[
            schemas.QuizItem(
                id=item.id,
                card_id=item.card_id,
                card=schemas.Card(
                    id=item.card.id,
                    user_id=item.card.user_id,
                    note_id=item.card.note_id,
                    type=schemas.QuestionType(item.card.type),
                    prompt=item.card.prompt,
                    answer=item.card.answer,
                    choices=item.card.choices,
                    tags=item.card.tags,
                    rationale=item.card.rationale,
                    created_at=item.card.created_at
                ),
                user_answer=item.user_answer,
                is_correct=item.is_correct,
                time_sec=item.time_sec
            ) for item in quiz_items
        ]
    )


def _evaluate_answer(card: models.Card, user_answer: str) -> bool:
    """回答を採点"""
    if not user_answer:
        return False
    
    user_answer = user_answer.strip().lower()
    correct_answer = card.answer.strip().lower()
    
    if card.type == "tf":
        # True/False問題
        user_bool = user_answer in ["true", "t", "正", "○", "yes", "1"]
        correct_bool = correct_answer in ["true", "t", "正", "○", "yes", "1"]
        return user_bool == correct_bool
    
    elif card.type == "mcq":
        # 選択問題
        if card.choices and user_answer in [choice.lower() for choice in card.choices]:
            return user_answer == correct_answer
        return False
    
    elif card.type == "cloze":
        # 穴埋め問題 - 大小文字・全角半角を正規化
        import unicodedata
        
        def normalize(text):
            # Unicode正規化 + 全角半角変換
            text = unicodedata.normalize('NFKC', text)
            return text.strip().lower()
        
        normalized_user = normalize(user_answer)
        normalized_correct = normalize(correct_answer)
        
        return normalized_user == normalized_correct
    
    return user_answer == correct_answer


@router.get("/quiz-history", response_model=List[schemas.Quiz])
def get_quiz_history(
    skip: int = 0,
    limit: int = 20,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """クイズ履歴を取得"""
    quizzes = (
        db.query(models.Quiz)
        .filter(models.Quiz.user_id == current_user.id, models.Quiz.completed == True)
        .order_by(models.Quiz.completed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return [
        schemas.Quiz(
            id=quiz.id,
            user_id=quiz.user_id,
            title=quiz.title,
            completed=quiz.completed,
            score=quiz.score,
            created_at=quiz.created_at,
            completed_at=quiz.completed_at,
            quiz_items=[]  # 履歴では詳細は含めない
        ) for quiz in quizzes
    ]