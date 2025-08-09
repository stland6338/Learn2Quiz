import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notesAPI } from '../services/api';
import { Note } from '../types';

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const notesData = await notesAPI.getAll();
        setNotes(notesData);
      } catch (error) {
        setError('ノートの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('このノートを削除しますか？関連するカードも削除されます。')) {
      return;
    }

    try {
      await notesAPI.delete(id);
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      setError('削除に失敗しました');
    }
  };

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ノート一覧</h1>
          <Link
            to="/notes/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            ＋ 新しいノート
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ノートがありません
            </h3>
            <p className="text-gray-500 mb-4">
              最初のノートを作成して、学習を始めましょう
            </p>
            <Link
              to="/notes/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              ノートを作成
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {note.title || `ノート ${note.id}`}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {note.source_type}
                    </span>
                  </div>
                  
                  <p className="text-gray-500 text-sm mb-4 line-clamp-3">
                    {note.raw_text.slice(0, 150)}
                    {note.raw_text.length > 150 ? '...' : ''}
                  </p>
                  
                  <div className="text-xs text-gray-400 mb-4">
                    作成日: {new Date(note.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Link
                      to={`/notes/${note.id}`}
                      className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                    >
                      詳細を見る
                    </Link>
                    <div className="flex space-x-2">
                      <Link
                        to={`/notes/${note.id}/cards`}
                        className="text-green-600 hover:text-green-500 text-sm font-medium"
                      >
                        カード生成
                      </Link>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-red-600 hover:text-red-500 text-sm font-medium"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notes;