from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import models, schemas

router = APIRouter()


@router.post("/notes", response_model=schemas.Note)
def create_note(
    note: schemas.NoteCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ノートを作成"""
    db_note = models.Note(
        user_id=current_user.id,
        raw_text=note.raw_text,
        source_type=note.source_type.value,
        title=note.title or f"Note {len(current_user.notes) + 1}"
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    
    return db_note


@router.get("/notes", response_model=List[schemas.Note])
def get_notes(
    skip: int = 0,
    limit: int = 20,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ユーザーのノート一覧を取得"""
    notes = (
        db.query(models.Note)
        .filter(models.Note.user_id == current_user.id)
        .order_by(models.Note.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return notes


@router.get("/notes/{note_id}", response_model=schemas.Note)
def get_note(
    note_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """特定のノートを取得"""
    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    return note


@router.delete("/notes/{note_id}")
def delete_note(
    note_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """ノートを削除"""
    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    # 関連するカードも削除
    db.query(models.Card).filter(models.Card.note_id == note_id).delete()
    db.delete(note)
    db.commit()
    
    return {"message": "Note deleted successfully"}