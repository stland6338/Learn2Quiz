export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface Note {
  id: number;
  user_id: number;
  raw_text: string;
  source_type: 'manual' | 'file' | 'url';
  title?: string;
  created_at: string;
}

export interface Card {
  id: number;
  user_id: number;
  note_id: number;
  type: 'mcq' | 'tf' | 'cloze';
  prompt: string;
  answer: string;
  choices?: string[];
  tags?: string[];
  rationale?: string;
  created_at: string;
}

export interface Quiz {
  id: number;
  user_id: number;
  title?: string;
  completed: boolean;
  score?: number;
  created_at: string;
  completed_at?: string;
  quiz_items: QuizItem[];
}

export interface QuizItem {
  id: number;
  card_id: number;
  card: Card;
  user_answer?: string;
  is_correct?: boolean;
  time_sec?: number;
}

export interface DailyQuiz {
  quiz: Quiz;
  remaining_count: number;
  streak_days: number;
}

export interface UserStats {
  streak_days: number;
  total_cards: number;
  due_today: number;
  weak_tags: TagStats[];
  recommended_study_time: number;
}

export interface TagStats {
  tag: string;
  correct_count: number;
  total_count: number;
  accuracy_rate: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface QuizSubmission {
  quiz_id: number;
  answers: {
    card_id: number;
    user_answer: string;
    time_sec?: number;
  }[];
}