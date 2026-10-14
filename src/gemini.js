// Gemini の REST API を直接呼ぶ(週次の振り返り)。
// APIキーはこの端末の localStorage にだけ保存し、Google 以外には送らない。
const KEY = 'rowing_log_gemini_key';
// 提供されているモデルは時期によって変わる(古いモデルは新しい利用者に出さなくなる)ため、
// 新しい順に試し、使えたものを覚えておく。
const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
const MODEL_KEY = 'rowing_log_gemini_model';

export const getApiKey = () => localStorage.getItem(KEY) || '';
export const setApiKey = (k) => localStorage.setItem(KEY, k.trim());

// Gemini API(Google AI Studio)のキーは「AIza」で始まる。形が違うものは、送る前に気づけるようにする。
// (Google Cloud / Vertex AI のキー「AQ.…」を送ると、401「OAuth 2 access token が必要」になる)
export function keyProblem(key) {
  const k = key.trim();
  if (!k) return '';
  if (/\s/.test(k)) return 'キーの途中に空白や改行が入っています。貼り付け直してください。';
  if (k.startsWith('AQ.')) return 'このキーは Gemini API 用ではありません(Google Cloud / Vertex AI 用の形式です)。Google AI Studio で「AIza」から始まるキーを作ってください。';
  if (k.startsWith('ya29.')) return 'これはアクセストークンで、APIキーではありません。Google AI Studio で「AIza」から始まるキーを作ってください。';
  if (/^(sk-|sk_|xai-)/.test(k)) return 'これは Gemini 以外のサービスのキーです。Google AI Studio で「AIza」から始まるキーを作ってください。';
  if (!k.startsWith('AIza')) return 'Gemini のキーは通常「AIza」から始まります。Google AI Studio で作ったキーか確認してください。';
  return '';
}

/** 設定画面の「接続テスト」。キーが通るかを、画像を送らずに確かめる */
export async function testApiKey() {
  const key = getApiKey();
  if (!key) throw new Error('APIキーを入力してください。');
  const problem = keyProblem(key);
  if (problem) throw new Error(problem);
  let res;
  try {
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
  } catch {
    throw new Error('Google に接続できませんでした。電波の状態を確認してください。');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw describeError(res.status, body.error?.message, '接続テスト');
  return true;
}

// Gemini を呼んで本文を返す。キー未設定や API エラーは日本語メッセージの Error にする
async function generate(parts, generationConfig) {
  const key = getApiKey();
  if (!key) throw new Error('APIキーが未設定です。「設定」画面で Gemini APIキーを入力してください。');
  const problem = keyProblem(key);
  if (problem) throw new Error(problem);

  // 前回使えたモデルを先頭にして、使えないとき(モデルが無い・新規利用者には提供終了)だけ次を試す
  const remembered = localStorage.getItem(MODEL_KEY);
  const order = remembered ? [remembered, ...MODELS.filter((m) => m !== remembered)] : MODELS;
  let lastError = null;

  for (const model of order) {
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, ...generationConfig } }),
      });
    } catch {
      throw new Error('Google に接続できませんでした。電波の状態を確認して、もう一度試してください。');
    }
    const body = await res.json().catch(() => ({}));

    if (res.ok) {
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      if (!text && body.promptFeedback?.blockReason) throw new Error(`画像が処理できませんでした(${body.promptFeedback.blockReason})`);
      localStorage.setItem(MODEL_KEY, model);
      return text;
    }

    lastError = describeError(res.status, body.error?.message, model);
    const modelProblem = res.status === 404 || /no longer available|not found|not supported|deprecated|new users/i.test(body.error?.message ?? '');
    if (!modelProblem) break; // キーの誤り・上限超過などは、別のモデルを試しても直らない
  }
  throw lastError;
}

// 原因が分かる日本語にする。元のメッセージも末尾に残す(問い合わせ用)
function describeError(status, message = '', model) {
  const tail = ` [${status} ${model}${message ? `: ${message.slice(0, 120)}` : ''}]`;
  if (status === 400 && /api key/i.test(message)) return new Error(`APIキーが正しくありません。設定画面で入れ直してください。${tail}`);
  if (status === 401) return new Error(`このキーは Gemini API では認証できません。Google AI Studio(aistudio.google.com/apikey)で作る「AIza」から始まるキーを使ってください。${tail}`);
  if (status === 403) return new Error(`このAPIキーでは使えません。キーの制限(利用できるAPIやサイトの指定)や、Gemini API が有効なプロジェクトのキーかを確認してください。${tail}`);
  if (status === 429) return new Error(`無料枠の利用上限に達しています。しばらく待ってから試してください。${tail}`);
  if (status === 404) return new Error(`使えるモデルが見つかりませんでした。アプリの更新が必要かもしれません。${tail}`);
  if (status >= 500) return new Error(`Google 側で一時的なエラーが起きています。少し待って試してください。${tail}`);
  return new Error(`読み取りに失敗しました。${tail}`);
}

const REVIEW_PROMPT = `あなたはボート(ローイング)部のトレーニング記録を見るアシスタントです。
次の1週間の記録を読んで、日本語で3〜4文の振り返りを書いてください。
- 記録から読み取れる事実(量・強度配分・睡眠や疲労との関係)に基づく
- 良かった点を1つ、気をつける点を1つ、来週の具体的な提案を1つ
- 医療的な断定はしない。データが少なければ無理に結論を出さない
- 見出しや箇条書きは使わず、200字以内の文章で

記録:
`;

export async function reviewWeek(reportText) {
  const text = await generate([{ text: REVIEW_PROMPT + reportText }], { temperature: 0.4 });
  if (!text.trim()) throw new Error('振り返りを作れませんでした。もう一度試してください。');
  return text.trim();
}
