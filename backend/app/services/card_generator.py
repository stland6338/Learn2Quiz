import re
import random
from typing import List, Dict, Tuple
from app.models.schemas import Card, CardCreate, QuestionType


class CardGenerator:
    """テキストからクイズカードを自動生成するクラス"""
    
    def __init__(self):
        self.min_answer_length = 1
        self.max_answer_length = 30
        
    def generate_cards(self, text: str, note_id: int, language: str = "auto", subject: str = "general") -> List[CardCreate]:
        """テキストからカードを自動生成"""
        cards = []
        
        # 改行やカンマで区切られた語彙リストの検出
        if self._is_vocabulary_list(text):
            cards.extend(self._generate_vocabulary_cards(text, note_id))
        
        # 条文・定義文の検出
        definition_cards = self._generate_definition_cards(text, note_id)
        cards.extend(definition_cards)
        
        # 箇条書きの検出
        list_cards = self._generate_list_cards(text, note_id)
        cards.extend(list_cards)
        
        # 一般テキストからの穴埋め問題生成
        if len(cards) < 5:  # 最低5問を目指す
            cloze_cards = self._generate_cloze_cards(text, note_id)
            cards.extend(cloze_cards)
        
        return cards[:20]  # 最大20問まで
    
    def _is_vocabulary_list(self, text: str) -> bool:
        """語彙リストかどうかを判定"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if len(lines) < 3:
            return False
        
        # 各行が短く、単語または「単語 - 意味」の形式
        for line in lines:
            if len(line) > 100:  # 長すぎる行があると語彙リストではない
                return False
            if not re.match(r'^[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-–—]+$', line):
                continue  # 特殊文字が含まれていても続行
        
        return True
    
    def _generate_vocabulary_cards(self, text: str, note_id: int) -> List[CardCreate]:
        """語彙リストからMCQカードを生成"""
        cards = []
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        vocabulary = []
        for line in lines:
            if ' - ' in line or ' – ' in line or ' — ' in line:
                # 単語 - 意味の形式
                parts = re.split(r'\s[-–—]\s', line, 1)
                if len(parts) == 2:
                    word, meaning = parts[0].strip(), parts[1].strip()
                    vocabulary.append((word, meaning))
            elif ',' in line:
                # カンマ区切り
                words = [w.strip() for w in line.split(',')]
                for word in words:
                    if word:
                        vocabulary.append((word, word))
            else:
                # 単語のみ
                vocabulary.append((line, line))
        
        # MCQ問題を生成
        for i, (word, meaning) in enumerate(vocabulary):
            if len(meaning) <= self.max_answer_length:
                # 誤選択肢を生成
                wrong_choices = self._generate_wrong_choices([v[1] for v in vocabulary], meaning, 3)
                
                choices = [meaning] + wrong_choices
                random.shuffle(choices)
                
                cards.append(CardCreate(
                    note_id=note_id,
                    type=QuestionType.MCQ,
                    prompt=f"「{word}」の意味として正しいものを選んでください。",
                    answer=meaning,
                    choices=choices,
                    tags=["vocabulary"],
                    rationale=f"語彙: {word} - {meaning}"
                ))
        
        return cards
    
    def _generate_definition_cards(self, text: str, note_id: int) -> List[CardCreate]:
        """定義文から○×問題を生成"""
        cards = []
        
        # 「〜とは」「〜である」などの定義パターンを検出
        definition_patterns = [
            r'(.+?)とは(.+?)である[。\.]',
            r'(.+?)は(.+?)である[。\.]',
            r'(.+?)とは(.+?)[。\.]'
        ]
        
        for pattern in definition_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                term = match.group(1).strip()
                definition = match.group(2).strip()
                
                if len(term) <= 30 and len(definition) <= 100:
                    # 正しい文
                    cards.append(CardCreate(
                        note_id=note_id,
                        type=QuestionType.TRUE_FALSE,
                        prompt=f"{term}は{definition}である。",
                        answer="true",
                        tags=["definition"],
                        rationale=f"原文: {match.group(0)}"
                    ))
                    
                    # 間違った文（否定形）
                    if len(cards) < 10:
                        cards.append(CardCreate(
                            note_id=note_id,
                            type=QuestionType.TRUE_FALSE,
                            prompt=f"{term}は{definition}ではない。",
                            answer="false",
                            tags=["definition"],
                            rationale=f"原文: {match.group(0)} (否定形で出題)"
                        ))
        
        return cards
    
    def _generate_list_cards(self, text: str, note_id: int) -> List[CardCreate]:
        """箇条書きから選択問題を生成"""
        cards = []
        
        # 箇条書きパターンを検出
        list_patterns = [
            r'^[・\-\*]\s*(.+)$',
            r'^\d+\.\s*(.+)$',
            r'^[a-zA-Z]\)\s*(.+)$'
        ]
        
        for pattern in list_patterns:
            items = []
            lines = text.split('\n')
            
            for line in lines:
                match = re.match(pattern, line.strip())
                if match:
                    item = match.group(1).strip()
                    if item and len(item) <= 50:
                        items.append(item)
            
            if len(items) >= 3:
                # 項目の並び替え問題を生成
                correct_item = random.choice(items)
                wrong_choices = [item for item in items if item != correct_item]
                
                # 他の項目から誤選択肢を追加
                while len(wrong_choices) < 3 and len(wrong_choices) < len(items) - 1:
                    candidate = random.choice([item for item in items if item != correct_item and item not in wrong_choices])
                    wrong_choices.append(candidate)
                
                choices = [correct_item] + wrong_choices[:3]
                random.shuffle(choices)
                
                cards.append(CardCreate(
                    note_id=note_id,
                    type=QuestionType.MCQ,
                    prompt=f"以下の項目のうち、リストに含まれているものを選んでください。",
                    answer=correct_item,
                    choices=choices,
                    tags=["list", "items"],
                    rationale="箇条書きリストからの出題"
                ))
                break
        
        return cards
    
    def _generate_cloze_cards(self, text: str, note_id: int) -> List[CardCreate]:
        """一般テキストから穴埋め問題を生成"""
        cards = []
        sentences = self._split_sentences(text)
        
        for sentence in sentences:
            # 固有名詞、数値、重要語句を抽出
            cloze_candidates = self._extract_cloze_candidates(sentence)
            
            for candidate in cloze_candidates[:2]:  # 1文につき最大2個
                if self._is_valid_cloze_answer(candidate):
                    cloze_text = sentence.replace(candidate, "{{" + candidate + "}}", 1)
                    
                    cards.append(CardCreate(
                        note_id=note_id,
                        type=QuestionType.CLOZE,
                        prompt=cloze_text,
                        answer=candidate,
                        tags=["cloze"],
                        rationale=f"原文: {sentence}"
                    ))
                    
                    if len(cards) >= 10:  # 最大10問まで
                        break
            
            if len(cards) >= 10:
                break
        
        return cards
    
    def _split_sentences(self, text: str) -> List[str]:
        """テキストを文に分割"""
        # 日本語の文区切り
        sentences = re.split(r'[。！？\.\!\?]\s*', text)
        return [s.strip() for s in sentences if s.strip() and len(s) > 10]
    
    def _extract_cloze_candidates(self, sentence: str) -> List[str]:
        """穴埋め候補を抽出"""
        candidates = []
        
        # 固有名詞（カタカナ語、英単語）
        katakana_words = re.findall(r'[ア-ン]+', sentence)
        candidates.extend([w for w in katakana_words if 2 <= len(w) <= 15])
        
        english_words = re.findall(r'[A-Za-z]+', sentence)
        candidates.extend([w for w in english_words if 2 <= len(w) <= 15])
        
        # 数値
        numbers = re.findall(r'\d+', sentence)
        candidates.extend([n for n in numbers if 1 <= len(n) <= 10])
        
        # 専門用語（括弧内の説明など）
        parentheses = re.findall(r'（([^）]+)）', sentence)
        candidates.extend([p for p in parentheses if 2 <= len(p) <= 20])
        
        return candidates
    
    def _is_valid_cloze_answer(self, answer: str) -> bool:
        """有効な穴埋め答えかどうかを判定"""
        if not answer or len(answer) < self.min_answer_length or len(answer) > self.max_answer_length:
            return False
        
        # 句読点を含まない
        if re.search(r'[、。，．,.]', answer):
            return False
            
        return True
    
    def _generate_wrong_choices(self, all_options: List[str], correct_answer: str, count: int) -> List[str]:
        """誤選択肢を生成"""
        wrong_choices = []
        candidates = [opt for opt in all_options if opt != correct_answer]
        
        # 類似のものを優先的に選択
        for candidate in candidates:
            if len(wrong_choices) >= count:
                break
            if candidate not in wrong_choices:
                wrong_choices.append(candidate)
        
        # 足りない場合は適当に選択
        while len(wrong_choices) < count and len(wrong_choices) < len(candidates):
            candidate = random.choice(candidates)
            if candidate not in wrong_choices:
                wrong_choices.append(candidate)
        
        return wrong_choices[:count]