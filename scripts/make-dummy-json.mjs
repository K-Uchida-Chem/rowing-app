// ダミーデータを、アプリのバックアップ形式(JSON)で書き出す。
//   npm run dummy:json  →  dummy-backup.json
// 注意: アプリの「データを取り込む」は、今のデータをすべて置き換える。実際の記録がある端末では使わないこと。
// (開発サーバーの設定画面の「ダミーデータ: 入れる」は、実データを残したまま入れられる)
import { writeFileSync } from 'node:fs';
import { generateDummy } from '../src/dev/dummyData.js';
import { todayInTz } from '../src/report/week.js';

const data = generateDummy({ today: todayInTz() });
const out = {};
for (const [table, rows] of Object.entries(data)) {
  out[table] = table === 'weeklySchedule' || table === 'weekNotes' ? rows : rows.map((r, i) => ({ id: i + 1, ...r }));
}
for (const t of ['nutritionRecords', 'goals', 'dayNotes', 'workouts']) out[t] = [];
writeFileSync('dummy-backup.json', JSON.stringify(out));
console.log(`dummy-backup.json: ${Object.values(out).reduce((n, a) => n + a.length, 0)} 件`);
