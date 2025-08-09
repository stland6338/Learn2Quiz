import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesAPI, cardsAPI } from '../services/api';

const CreateNote: React.FC = () => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [sourceType, setSourceType] = useState<'manual' | 'file' | 'url'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('テキストを入力してください');
      return;
    }

    if (text.length < 50) {
      setError('もう少し長いテキストを入力してください（50文字以上）');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ノートを作成
      const note = await notesAPI.create({
        title: title.trim() || undefined,
        raw_text: text.trim(),
        source_type: sourceType
      });

      // 自動でカードを生成するかユーザーに確認
      const shouldGenerate = confirm('ノートが作成されました。すぐにカードを自動生成しますか？');
      
      if (shouldGenerate) {
        await cardsAPI.generate(note.id);
        navigate(`/notes/${note.id}/cards`);
      } else {
        navigate('/notes');
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'ノートの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // ペースト時の処理
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > 15000) {
      e.preventDefault();
      setError('テキストが長すぎます（最大15,000文字）');
    }
  };

  const exampleTexts = {
    vocabulary: `apple - りんご
banana - バナナ
cherry - さくらんぼ
orange - オレンジ
grape - ぶどう`,
    definition: `機械学習とは、コンピュータがデータから自動的にパターンを学習し、予測や判断を行う技術である。
深層学習は機械学習の一種で、人間の脳の神経回路を模倣したニューラルネットワークを多層化した手法である。`,
    list: `プログラミング言語の種類：
・Python - データ分析や機械学習に人気
・JavaScript - ウェブ開発に必須
・Java - エンタープライズ開発に広く使用
・C++ - システムプログラミングやゲーム開発
・Go - クラウド開発やマイクロサービス`
  };

  const insertExample = (type: keyof typeof exampleTexts) => {
    setText(exampleTexts[type]);
    setTitle(type === 'vocabulary' ? '英単語リスト' : 
             type === 'definition' ? '技術用語の定義' : 
             'プログラミング言語');
  };

  return (
    <div className="px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">新しいノート作成</h1>
          <p className="mt-2 text-gray-600">
            テキストを入力すると、自動的にクイズカードが生成されます
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                タイトル（任意）
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="ノートのタイトルを入力"
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="sourceType" className="block text-sm font-medium text-gray-700">
                ソースタイプ
              </label>
              <select
                id="sourceType"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="manual">手動入力</option>
                <option value="file">ファイル</option>
                <option value="url">URL</option>
              </select>
            </div>

            <div>
              <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                テキスト内容 <span className="text-red-500">*</span>
              </label>
              
              {/* サンプルテキストボタン */}
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => insertExample('vocabulary')}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  語彙リストサンプル
                </button>
                <button
                  type="button"
                  onClick={() => insertExample('definition')}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  定義文サンプル
                </button>
                <button
                  type="button"
                  onClick={() => insertExample('list')}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  箇条書きサンプル
                </button>
              </div>

              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={handlePaste}
                rows={15}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="学習したいテキストを入力してください。語彙リスト、定義文、箇条書きなど、様々な形式に対応しています。

例:
apple - りんご
banana - バナナ

機械学習とは、コンピュータがデータから自動的にパターンを学習する技術である。

・プログラミング言語の種類
・データベース管理システム"
                maxLength={15000}
                required
              />
              <div className="mt-1 text-sm text-gray-500 text-right">
                {text.length} / 15,000文字
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/notes')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '作成中...' : 'ノートを作成'}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 効果的なノート作成のコツ</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>語彙学習</strong>: 「単語 - 意味」の形式で入力すると選択問題が生成されます</li>
            <li>• <strong>定義学習</strong>: 「〜とは〜である」の形式で○×問題が生成されます</li>
            <li>• <strong>箇条書き</strong>: ・や-で始まる項目から選択問題が生成されます</li>
            <li>• <strong>一般テキスト</strong>: 重要な単語や数値から穴埋め問題が生成されます</li>
            <li>• 300文字以上入力すると、より多くの問題が生成されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateNote;