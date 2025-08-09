import axios from 'axios';
import {
  User,
  Note,
  Card,
  Quiz,
  DailyQuiz,
  UserStats,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  QuizSubmission
} from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post('/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/me');
    return response.data;
  },

  getStats: async (): Promise<UserStats> => {
    const response = await api.get('/stats');
    return response.data;
  }
};

export const notesAPI = {
  create: async (data: { raw_text: string; title?: string; source_type?: string }): Promise<Note> => {
    const response = await api.post('/notes', data);
    return response.data;
  },

  getAll: async (skip = 0, limit = 20): Promise<Note[]> => {
    const response = await api.get(`/notes?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  getOne: async (id: number): Promise<Note> => {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}`);
  }
};

export const cardsAPI = {
  generate: async (noteId: number, language = 'auto', subject = 'general'): Promise<Card[]> => {
    const response = await api.post('/cards/generate', {
      note_id: noteId,
      language,
      subject
    });
    return response.data;
  },

  getAll: async (skip = 0, limit = 50, noteId?: number): Promise<Card[]> => {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    });
    if (noteId) {
      params.append('note_id', noteId.toString());
    }
    
    const response = await api.get(`/cards?${params.toString()}`);
    return response.data;
  },

  getOne: async (id: number): Promise<Card> => {
    const response = await api.get(`/cards/${id}`);
    return response.data;
  },

  update: async (id: number, data: Partial<Card>): Promise<Card> => {
    const response = await api.patch(`/cards/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/cards/${id}`);
  }
};

export const quizAPI = {
  getDailyQuiz: async (): Promise<DailyQuiz> => {
    const response = await api.get('/daily-quiz');
    return response.data;
  },

  submit: async (submission: QuizSubmission): Promise<Quiz> => {
    const response = await api.post('/submit-quiz', submission);
    return response.data;
  },

  getHistory: async (skip = 0, limit = 20): Promise<Quiz[]> => {
    const response = await api.get(`/quiz-history?skip=${skip}&limit=${limit}`);
    return response.data;
  }
};

export default api;