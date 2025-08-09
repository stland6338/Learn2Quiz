from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.models.models import ReviewState, Card
import math


class SM2Algorithm:
    """SM-2間隔反復アルゴリズムの実装"""
    
    def __init__(self):
        self.initial_easiness = 2.5
        self.min_easiness = 1.3
        
    def calculate_next_review(self, review_state: ReviewState, quality: int) -> ReviewState:
        """
        次の復習日を計算してReviewStateを更新
        
        Args:
            review_state: 現在の復習状態
            quality: 解答品質 (0-5)
                0: 完全な失敗
                1: 不正解だが、正解が思い浮かんだ
                2: 不正解だが、思い出すのが簡単だった
                3: 正解だが、かなり苦労した
                4: 正解だが、少し迷った  
                5: 完璧な正解
        
        Returns:
            更新されたReviewState
        """
        now = datetime.utcnow()
        
        if quality < 3:
            # 不正解の場合
            review_state.repetition = 0
            review_state.interval_days = 1
            review_state.due_date = now + timedelta(days=1)
        else:
            # 正解の場合
            if review_state.repetition == 0:
                review_state.interval_days = 1
            elif review_state.repetition == 1:
                review_state.interval_days = 6
            else:
                review_state.interval_days = int(review_state.interval_days * review_state.easiness)
            
            review_state.repetition += 1
            review_state.due_date = now + timedelta(days=review_state.interval_days)
        
        # EF値の更新
        new_easiness = (
            review_state.easiness + 
            (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        )
        review_state.easiness = max(new_easiness, self.min_easiness)
        
        review_state.last_result = quality
        review_state.last_reviewed = now
        
        return review_state
    
    def get_due_cards(self, db: Session, user_id: int, limit: int = 10) -> List[Card]:
        """期限が来ているカードを取得"""
        now = datetime.utcnow()
        
        due_cards = (
            db.query(Card)
            .join(ReviewState)
            .filter(
                Card.user_id == user_id,
                ReviewState.due_date <= now
            )
            .order_by(ReviewState.due_date)
            .limit(limit)
            .all()
        )
        
        return due_cards
    
    def get_new_cards(self, db: Session, user_id: int, limit: int = 3) -> List[Card]:
        """新規カードを取得（ReviewStateが存在しないカード）"""
        new_cards = (
            db.query(Card)
            .outerjoin(ReviewState)
            .filter(
                Card.user_id == user_id,
                ReviewState.id.is_(None)  # ReviewStateが存在しない
            )
            .order_by(Card.created_at.desc())
            .limit(limit)
            .all()
        )
        
        return new_cards
    
    def create_initial_review_state(self, db: Session, user_id: int, card_id: int) -> ReviewState:
        """新規カードに対する初期ReviewStateを作成"""
        now = datetime.utcnow()
        
        review_state = ReviewState(
            user_id=user_id,
            card_id=card_id,
            easiness=self.initial_easiness,
            interval_days=1,
            repetition=0,
            due_date=now + timedelta(days=1)
        )
        
        db.add(review_state)
        return review_state
    
    def get_daily_cards(self, db: Session, user_id: int) -> List[Card]:
        """今日学習すべきカードを取得（復習 + 新規）"""
        # 復習カード（最大10枚）
        due_cards = self.get_due_cards(db, user_id, limit=10)
        
        # 新規カード（2-3枚）
        remaining_slots = max(0, 10 - len(due_cards))
        new_card_limit = min(3, remaining_slots + 2)  # 最低2枚、最大3枚
        new_cards = self.get_new_cards(db, user_id, limit=new_card_limit)
        
        # 新規カードに初期ReviewStateを作成
        for card in new_cards:
            existing_state = db.query(ReviewState).filter(
                ReviewState.user_id == user_id,
                ReviewState.card_id == card.id
            ).first()
            
            if not existing_state:
                self.create_initial_review_state(db, user_id, card.id)
        
        # 合計10枚まで
        all_cards = due_cards + new_cards
        return all_cards[:10]
    
    def calculate_study_streak(self, db: Session, user_id: int) -> int:
        """連続学習日数を計算"""
        # 過去の学習記録から連続日数を算出
        # 簡易実装：ReviewStateのlast_reviewedを使用
        now = datetime.utcnow().date()
        streak = 0
        
        # 今日から逆順に学習記録をチェック
        check_date = now
        while True:
            # その日に学習したレビュー記録があるかチェック
            next_day = check_date + timedelta(days=1)
            reviewed_count = (
                db.query(ReviewState)
                .filter(
                    ReviewState.user_id == user_id,
                    ReviewState.last_reviewed >= datetime.combine(check_date, datetime.min.time()),
                    ReviewState.last_reviewed < datetime.combine(next_day, datetime.min.time())
                )
                .count()
            )
            
            if reviewed_count > 0:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
                
            # 最大365日まで
            if streak >= 365:
                break
        
        return streak
    
    def get_weak_tags(self, db: Session, user_id: int, limit: int = 3) -> List[dict]:
        """弱点タグを取得"""
        # タグ別の正答率を計算
        from sqlalchemy import func
        from app.models.models import QuizItem, Quiz
        
        tag_stats = (
            db.query(
                func.json_extract(Card.tags, '$[0]').label('tag'),
                func.avg(func.cast(QuizItem.is_correct, func.Integer)).label('accuracy'),
                func.count(QuizItem.id).label('total_count')
            )
            .join(QuizItem, Card.id == QuizItem.card_id)
            .join(Quiz, QuizItem.quiz_id == Quiz.id)
            .filter(
                Card.user_id == user_id,
                Quiz.completed == True,
                Card.tags.isnot(None)
            )
            .group_by(func.json_extract(Card.tags, '$[0]'))
            .having(func.count(QuizItem.id) >= 3)  # 最低3回は出題されたタグ
            .order_by(func.avg(func.cast(QuizItem.is_correct, func.Integer)))
            .limit(limit)
            .all()
        )
        
        weak_tags = []
        for tag, accuracy, total_count in tag_stats:
            if tag and accuracy < 0.7:  # 70%未満を弱点とする
                weak_tags.append({
                    'tag': tag,
                    'accuracy_rate': float(accuracy),
                    'total_count': int(total_count),
                    'correct_count': int(total_count * accuracy)
                })
        
        return weak_tags