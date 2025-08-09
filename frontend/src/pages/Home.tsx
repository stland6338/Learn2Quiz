import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, quizAPI } from '../services/api';
import { UserStats, DailyQuiz } from '../types';

const Home: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 統計情報とデイリークイズを並行取得
        const [statsData, quizData] = await Promise.allSettled([
          authAPI.getStats(),
          quizAPI.getDailyQuiz()
        ]);

        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        }

        if (quizData.status === 'fulfilled') {
          setDailyQuiz(quizData.value);
        } else if (quizData.status === 'rejected' && quizData.reason?.response?.status !== 404) {
          setError('データの取得に失敗しました');
        }
      } catch (error) {
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            おかえりなさい、{user?.name}さん！
          </h1>
          <p className="mt-2 text-gray-600">
            今日も学習を続けましょう
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🔥</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        連続日数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.streak_days}日
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
                    <div className="text-2xl">📚</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        総カード数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.total_cards}枚
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
                    <div className="text-2xl">⏰</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        今日の課題
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.due_today}問
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
                        推奨学習時間
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.recommended_study_time}分
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Quiz Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📝 今日のクイズ
            </h2>
            
            {dailyQuiz ? (
              <div>
                <p className="text-gray-600 mb-4">
                  {dailyQuiz.quiz.quiz_items.length}問のクイズが用意されています
                </p>
                <Link
                  to={`/quiz/${dailyQuiz.quiz.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  クイズを開始
                </Link>
                {dailyQuiz.remaining_count > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    残り{dailyQuiz.remaining_count}問の復習があります
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  今日のクイズはまだありません。ノートを作成してカードを生成しましょう。
                </p>
                <Link
                  to="/notes/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  ノートを作成
                </Link>
              </div>
            )}
          </div>

          {/* Weak Points Section */}
          {stats && stats.weak_tags.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🎯 弱点タグ
              </h2>
              <div className="space-y-3">
                {stats.weak_tags.slice(0, 3).map((tag, index) => (
                  <div key={tag.tag} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {index + 1}. {tag.tag}
                      </span>
                      <p className="text-xs text-gray-500">
                        {tag.correct_count}/{tag.total_count}問正解
                      </p>
                    </div>
                    <div className="text-sm text-gray-900">
                      {(tag.accuracy_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🚀 クイックアクション
            </h2>
            <div className="space-y-3">
              <Link
                to="/notes/new"
                className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium">新しいノートを作成</div>
                <div className="text-sm text-gray-500">
                  テキストを入力してクイズを生成
                </div>
              </Link>
              <Link
                to="/cards"
                className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium">カードを確認・編集</div>
                <div className="text-sm text-gray-500">
                  生成済みカードの管理
                </div>
              </Link>
              <Link
                to="/history"
                className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium">学習履歴を確認</div>
                <div className="text-sm text-gray-500">
                  過去のクイズ結果を表示
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;