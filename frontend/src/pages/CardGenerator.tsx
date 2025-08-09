import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notesAPI, cardsAPI } from '../services/api';
import { Note, Card } from '../types';

const CardGenerator: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  
  const [note, setNote] = useState<Note | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!noteId) return;
      
      try {
        setLoading(true);
        const [noteData, cardsData] = await Promise.all([
          notesAPI.getOne(parseInt(noteId)),
          cardsAPI.getAll(0, 100, parseInt(noteId))
        ]);
        
        setNote(noteData);
        setCards(cardsData);
      } catch (error) {
        setError('データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [noteId]);

  const handleGenerate = async () => {
    if (!noteId) return;

    setGenerating(true);
    setError('');

    try {
      const newCards = await cardsAPI.generate(parseInt(noteId));
      setCards(newCards);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'カードの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (cardId: number) => {
    if (!confirm('このカードを削除しますか？')) return;

    try {
      await cardsAPI.delete(cardId);
      setCards(cards.filter(card => card.id !== cardId));
    } catch (error) {
      setError('削除に失敗しました');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return '🔤';
      case 'tf': return '✓✗';
      case 'cloze': return '📝';
      default: return '❓';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'mcq': return '選択問題';
      case 'tf': return '○×問題';
      case 'cloze': return '穴埋め問題';
      default: return '不明';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ノートが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            カード生成: {note.title || `ノート ${note.id}`}
          </h1>
          <p className="mt-2 text-gray-600">
            ノートからクイズカードを自動生成・管理します
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Note Preview */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">ノート内容</h2>
            <div className="bg-gray-50 rounded p-4 max-h-40 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {note.raw_text}
              </pre>
            </div>
          </div>
        </div>

        {/* Generation Controls */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  カード生成 ({cards.length}枚生成済み)
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  ノートの内容を解析して自動的にクイズカードを生成します
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {generating ? '生成中...' : cards.length > 0 ? '再生成' : 'カードを生成'}
                </button>
                {cards.length > 0 && (
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    学習を開始
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generated Cards */}
        {cards.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                生成されたカード
              </h2>
              
              <div className="space-y-4">
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{getTypeIcon(card.type)}</span>
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}. {getTypeName(card.type)}
                          </span>
                          {card.tags && card.tags.length > 0 && (
                            <div className="ml-3 flex flex-wrap gap-1">
                              {card.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="mb-3">
                          <div className="font-medium text-gray-900 mb-1">問題:</div>
                          <div className="text-gray-700">{card.prompt}</div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="font-medium text-gray-900 mb-1">答え:</div>
                          <div className="text-green-700 font-medium">{card.answer}</div>
                        </div>

                        {card.choices && card.choices.length > 0 && (
                          <div className="mb-3">
                            <div className="font-medium text-gray-900 mb-1">選択肢:</div>
                            <ul className="list-disc list-inside text-gray-700">
                              {card.choices.map((choice, choiceIndex) => (
                                <li key={choiceIndex} className={choice === card.answer ? 'text-green-700 font-medium' : ''}>
                                  {choice}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {card.rationale && (
                          <div className="mb-3">
                            <div className="font-medium text-gray-900 mb-1">根拠:</div>
                            <div className="text-gray-600 text-sm">{card.rationale}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => navigate(`/cards/${card.id}/edit`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {cards.length === 0 && !generating && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              カードを生成しましょう
            </h3>
            <p className="text-gray-500 mb-4">
              ノートの内容を解析して、自動的にクイズカードを生成します
            </p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              カードを生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardGenerator;