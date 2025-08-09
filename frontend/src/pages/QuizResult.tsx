import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Quiz as QuizType } from '../types';

const QuizResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const quiz = location.state?.quiz as QuizType;

  if (!quiz) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">結果が見つかりません</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  const correctCount = quiz.quiz_items.filter(item => item.is_correct).length;
  const totalCount = quiz.quiz_items.length;
  const scorePercentage = (quiz.score || 0) * 100;
  const averageTime = quiz.quiz_items
    .filter(item => item.time_sec)
    .reduce((sum, item) => sum + (item.time_sec || 0), 0) / totalCount;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🎉';
    if (score >= 80) return '😊';
    if (score >= 60) return '🙂';
    return '😔';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return '素晴らしい結果です！';
    if (score >= 80) return 'とても良くできました！';
    if (score >= 60) return 'いい調子です！';
    return 'もう一度復習しましょう！';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Score Overview */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{getScoreEmoji(scorePercentage)}</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            クイズ完了！
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {getScoreMessage(scorePercentage)}
          </p>
          <div className={`text-5xl font-bold mb-2 ${getScoreColor(scorePercentage)}`}>
            {scorePercentage.toFixed(1)}%
          </div>
          <p className="text-gray-600">
            {correctCount} / {totalCount} 問正解
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      正答数
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      {correctCount}問
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">❌</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      誤答数
                    </dt>
                    <dd className="text-lg font-medium text-red-600">
                      {totalCount - correctCount}問
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⏱️</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      平均回答時間
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {averageTime.toFixed(1)}秒
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              詳細結果
            </h2>
            
            <div className="space-y-4">
              {quiz.quiz_items.map((item, index) => (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 ${
                    item.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">
                          {item.is_correct ? '✅' : '❌'}
                        </span>
                        <span className="text-sm font-medium text-gray-500">
                          問題 {index + 1}
                        </span>
                        {item.time_sec && (
                          <span className="ml-3 text-xs text-gray-400">
                            {item.time_sec}秒
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-2">
                        <div className="font-medium text-gray-900 mb-1">問題:</div>
                        <div className="text-gray-700">{item.card.prompt}</div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="font-medium text-gray-900 mb-1">正答:</div>
                          <div className="text-green-700 font-medium">{item.card.answer}</div>
                        </div>
                        
                        {item.user_answer && (
                          <div>
                            <div className="font-medium text-gray-900 mb-1">あなたの回答:</div>
                            <div className={`font-medium ${
                              item.is_correct ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {item.user_answer}
                            </div>
                          </div>
                        )}
                      </div>

                      {!item.is_correct && item.card.rationale && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="font-medium text-blue-900 mb-1">解説:</div>
                          <div className="text-blue-800 text-sm">{item.card.rationale}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            ホームに戻る
          </button>
          
          {scorePercentage < 80 && (
            <Link
              to={`/quiz/${quiz.id}`}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              もう一度挑戦
            </Link>
          )}
          
          <Link
            to="/history"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            学習履歴を見る
          </Link>
        </div>

        {/* Motivational Message */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">🎯 次のステップ</h3>
          <p className="text-blue-800 mb-3">
            継続的な学習で記憶の定着を図りましょう。間違えた問題は明日優先的に出題されます。
          </p>
          {scorePercentage >= 80 ? (
            <p className="text-green-700 font-medium">
              素晴らしい成績です！この調子で学習を続けましょう。
            </p>
          ) : (
            <p className="text-orange-700 font-medium">
              間違えた問題を復習して、次回はより良い成績を目指しましょう。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResult;