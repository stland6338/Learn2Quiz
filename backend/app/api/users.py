from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.auth import authenticate_user, create_access_token, get_password_hash, get_current_user
from app.core.config import settings
from app.models import models, schemas

router = APIRouter()
security = HTTPBearer()


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """ユーザー登録"""
    # 既存ユーザーのチェック
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 新しいユーザーを作成
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=Token)
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    """ログイン"""
    user = authenticate_user(db, login_request.email, login_request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """現在のユーザー情報を取得"""
    return current_user


@router.get("/stats", response_model=schemas.UserStats)
def get_user_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ユーザー統計情報を取得"""
    from app.services.spaced_repetition import SM2Algorithm
    
    sm2 = SM2Algorithm()
    
    # 連続日数
    streak_days = sm2.calculate_study_streak(db, current_user.id)
    
    # 総カード数
    total_cards = db.query(models.Card).filter(models.Card.user_id == current_user.id).count()
    
    # 今日期限のカード数
    due_today = len(sm2.get_due_cards(db, current_user.id, limit=100))
    
    # 弱点タグ
    weak_tags = sm2.get_weak_tags(db, current_user.id)
    
    # 推奨学習時間（1問1分として計算）
    recommended_study_time = max(due_today, 10)  # 最低10分
    
    return schemas.UserStats(
        streak_days=streak_days,
        total_cards=total_cards,
        due_today=due_today,
        weak_tags=[
            schemas.TagStats(
                tag=tag['tag'],
                correct_count=tag['correct_count'],
                total_count=tag['total_count'],
                accuracy_rate=tag['accuracy_rate']
            ) for tag in weak_tags
        ],
        recommended_study_time=recommended_study_time
    )