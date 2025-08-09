from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import notes, cards, quiz, users
from app.core.database import engine
from app.models import models

# データベーステーブルを作成
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Learn2Quiz API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React開発サーバー
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(users.router, prefix="/api/v1")
app.include_router(notes.router, prefix="/api/v1")
app.include_router(cards.router, prefix="/api/v1")
app.include_router(quiz.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Learn2Quiz API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}