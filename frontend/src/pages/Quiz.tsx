import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { Quiz as QuizType, QuizItem } from '../types';

const Quiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [cardId: number]: string }>({});
  const [timeSpent, setTimeSpent] = useState<{ [cardId: number]: number }>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) return;

      try {
        setLoading(true);
        // Note: 実際にはクイズIDからクイズを取得するAPIが必要
        // ここでは日次クイズを取得する代替手段を使用
        const dailyQuiz = await quizAPI.getDailyQuiz();
        setQuiz(dailyQuiz.quiz);
        setStartTime(Date.now());
      } catch (error: any) {
        setError('クイズの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId]);

  const currentItem = quiz?.quiz_items[currentIndex];

  const handleAnswer = (answer: string) => {
    if (!currentItem) return;

    const now = Date.now();
    const elapsed = Math.round((now - startTime) / 1000);

    setAnswers({ ...answers, [currentItem.card_id]: answer });
    setTimeSpent({ ...timeSpent, [currentItem.card_id]: elapsed });
    setStartTime(now);
  };

  const handleNext = () => {
    if (!quiz) return;

    if (currentIndex < quiz.quiz_items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    setSubmitting(true);

    try {
      const submission = {
        quiz_id: quiz.id,
        answers: Object.entries(answers).map(([cardIdStr, answer]) => ({
          card_id: parseInt(cardIdStr),
          user_answer: answer,
          time_sec: timeSpent[parseInt(cardIdStr)] || 0
        }))
      };

      const completedQuiz = await quizAPI.submit(submission);
      navigate(`/quiz/${quiz.id}/result`, { state: { quiz: completedQuiz } });
    } catch (error) {
      setError('クイズの提出に失敗しました');
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!currentItem) return;

    const { type } = currentItem.card;
    
    if (type === 'mcq' && currentItem.card.choices) {
      const keyPressed = e.key;
      const choiceIndex = ['1', '2', '3', '4'].indexOf(keyPressed);
      
      if (choiceIndex >= 0 && choiceIndex < currentItem.card.choices.length) {
        handleAnswer(currentItem.card.choices[choiceIndex]);
      }
    } else if (type === 'tf') {
      if (e.key === '1' || e.key.toLowerCase() === 't') {
        handleAnswer('true');
      } else if (e.key === '2' || e.key.toLowerCase() === 'f') {
        handleAnswer('false');
      }
    }

    if (e.key === 'Enter' && answers[currentItem.card_id]) {
      handleNext();
    }

    if (e.key === 'Escape') {
      handleSkip();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress as any);
    return () => document.removeEventListener('keydown', handleKeyPress as any);
  }, [currentItem, answers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  if (!quiz || !currentItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">クイズが見つかりません</p>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / quiz.quiz_items.length) * 100;
  const currentAnswer = answers[currentItem.card_id];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>問題 {currentIndex + 1} / {quiz.quiz_items.length}</span>
            <span>{Math.round(progress)}% 完了</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">
              {currentItem.card.type === 'mcq' ? '🔤' :
               currentItem.card.type === 'tf' ? '✓✗' : '📝'}
            </div>
            <div className="text-lg font-medium text-gray-900">
              {currentItem.card.prompt}
            </div>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {currentItem.card.type === 'mcq' && currentItem.card.choices && (
              <div className="space-y-3">
                {currentItem.card.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(choice)}
                    className={`w-full text-left p-4 border rounded-lg transition-colors ${
                      currentAnswer === choice
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-sm font-medium mr-3">
                        {index + 1}
                      </span>
                      {choice}
                    </div>
                  </button>
                ))}
                <div className="text-xs text-gray-500 text-center">
                  キーボード: 1-4キーで選択、Enterで次へ
                </div>
              </div>
            )}

            {currentItem.card.type === 'tf' && (
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => handleAnswer('true')}
                  className={`px-8 py-4 rounded-lg font-medium transition-colors ${
                    currentAnswer === 'true'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                >
                  ✓ 正しい
                </button>
                <button
                  onClick={() => handleAnswer('false')}
                  className={`px-8 py-4 rounded-lg font-medium transition-colors ${
                    currentAnswer === 'false'
                      ? 'bg-red-600 text-white'
                      : 'bg-white border border-red-600 text-red-600 hover:bg-red-50'
                  }`}
                >
                  ✗ 間違い
                </button>
                <div className="text-xs text-gray-500 absolute mt-16 text-center w-full">
                  キーボード: 1/Tで正しい、2/Fで間違い
                </div>
              </div>
            )}

            {currentItem.card.type === 'cloze' && (
              <div>
                <input
                  type="text"
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg text-center text-lg"
                  placeholder="答えを入力してください"
                  autoFocus
                />
                <div className="text-xs text-gray-500 text-center mt-2">
                  Enterで次へ、Escでスキップ
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-gray-600 disabled:text-gray-400"
          >
            ← 前の問題
          </button>

          <div className="flex space-x-3">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              スキップ
            </button>
            
            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? '提出中...' :
               currentIndex === quiz.quiz_items.length - 1 ? '提出' : '次へ →'}
            </button>
          </div>
        </div>

        {/* Tags */}
        {currentItem.card.tags && currentItem.card.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {currentItem.card.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;