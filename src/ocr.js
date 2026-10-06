// Gemini の REST API を直接呼ぶ(写真の読み取り・週次レビュー)。
// APIキーはこの端末の localStorage にだけ保存し、Google 以外には送らない。
const KEY = 'rowing_log_gemini_key';
const MODEL = 'gemini-2.5-flash';

export const getApiKey = () => localStorage.getItem(KEY) || '';
export const setApiKey = (k) => localStorage.setItem(KEY, k.trim());

// 長辺 1280px の JPEG に縮小して送信サイズを抑える(縮小できない形式はそのまま送る)
async function toInlineData(file) {
  let blob = file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  } catch {
    /* そのまま送る */
  }
  const data = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  return { mime_type: blob.type || 'image/jpeg', data };
}

const PROMPT = `These images show a rowing workout: a Concept2 PM5 monitor and/or a smartwatch workout summary.
Read the values and return ONLY a JSON object with these keys (null when not visible):
{
  "distance": total distance in meters (number),
  "time": total time as "M:SS.T" or "H:MM:SS.T" (string),
  "watts": average watts (number),
  "rate": average stroke rate in strokes/min (number),
  "avgHR": average heart rate in bpm (number),
  "maxHR": maximum heart rate in bpm (number)
}
For interval workouts use the overall totals/averages, not a single piece.`;

// Gemini を呼んで本文を返す。キー未設定や API エラーは日本語メッセージの Error にする
async function generate(parts, generationConfig) {
  const key = getApiKey();
  if (!key) throw new Error('APIキーが未設定です。「設定」画面で Gemini APIキーを入力してください。');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0, ...generationConfig } }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || `通信に失敗しました (HTTP ${res.status})`);
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
}

/** @param {File[]} files @returns {Promise<{distance?:number,time?:string,watts?:number,rate?:number,avgHR?:number,maxHR?:number}>} */
export async function readWorkoutImages(files) {
  const images = await Promise.all(files.map(toInlineData));
  const text = await generate(
    [{ text: PROMPT }, ...images.map((inline_data) => ({ inline_data }))],
    { responseMimeType: 'application/json' }
  );
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('画像から数値を読み取れませんでした。画面全体が写った写真で試してください。');
  const parsed = JSON.parse(match[0]);

  // null / 空を除いた値だけ返す
  return Object.fromEntries(Object.entries(parsed).filter(([, v]) => v != null && v !== ''));
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
