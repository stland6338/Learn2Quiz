from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import models, schemas
from app.services.card_generator import CardGenerator

router = APIRouter()


@router.post("/cards/generate", response_model=List[schemas.Card])
def generate_cards(
    request: schemas.GenerateCardsRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ノートからカードを自動生成"""
    # ノートの存在確認
    note = (
        db.query(models.Note)
        .filter(models.Note.id == request.note_id, models.Note.user_id == current_user.id)
        .first()
    )
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # カードを生成
    generator = CardGenerator()
    card_creates = generator.generate_cards(
        text=note.raw_text,
        note_id=request.note_id,
        language=request.language,
        subject=request.subject
    )
    
    # データベースに保存
    db_cards = []
    for card_create in card_creates:
        db_card = models.Card(
            user_id=current_user.id,
            note_id=card_create.note_id,
            type=card_create.type.value,
            prompt=card_create.prompt,
            answer=card_create.answer,
            choices=card_create.choices,
            tags=card_create.tags,
            rationale=card_create.rationale
        )
        db.add(db_card)
        db_cards.append(db_card)
    
    db.commit()
    
    # IDを設定するためにrefresh
    for card in db_cards:
        db.refresh(card)
    
    return db_cards


@router.get("/cards", response_model=List[schemas.Card])
def get_cards(
    skip: int = 0,
    limit: int = 50,
    note_id: int = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カード一覧を取得"""
    query = db.query(models.Card).filter(models.Card.user_id == current_user.id)
    
    if note_id:
        query = query.filter(models.Card.note_id == note_id)
    
    cards = (
        query
        .order_by(models.Card.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return cards


@router.get("/cards/{card_id}", response_model=schemas.Card)
def get_card(
    card_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """特定のカードを取得"""
    card = (
        db.query(models.Card)
        .filter(models.Card.id == card_id, models.Card.user_id == current_user.id)
        .first()
    )
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )
    
    return card


@router.patch("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    card_update: schemas.CardUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カードを更新"""
    card = (
        db.query(models.Card)
        .filter(models.Card.id == card_id, models.Card.user_id == current_user.id)
        .first()
    )
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )
    
    # 更新データを適用
    update_data = card_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)
    
    db.commit()
    db.refresh(card)
    
    return card


@router.delete("/cards/{card_id}")
def delete_card(
    card_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """カードを削除"""
    card = (
        db.query(models.Card)
        .filter(models.Card.id == card_id, models.Card.user_id == current_user.id)
        .first()
    )
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )
    
    # 関連するReviewStateも削除
    db.query(models.ReviewState).filter(models.ReviewState.card_id == card_id).delete()
    db.delete(card)
    db.commit()
    
    return {"message": "Card deleted successfully"}