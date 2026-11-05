// 先生画面の初期パスコードの salt と hash を作る（js/config.js の teacher.passcode に貼る）
// 使い方: node tools/teacher-passcode.js <4〜8 桁の数字> [salt]
//   salt を省くと新しく作る（16 バイトの乱数、16 進 32 文字）。
//   ハッシュは js/teacher-gate.js の JS 側（FNV 系、crypto.subtle を使わない）なので、どの開き方のブラウザでも照合できる。
//   出力した行をそのまま js/config.js に貼る。パスコードそのものはファイルに書かない（README・報告にも書かない）。
'use strict';

const crypto = require('node:crypto');
const gate = require('../js/teacher-gate.js');

// { algo, salt, hash } を返す（テストからも使う）
async function passcodeEntry(code, salt) {
  if (!gate.isValidCode(code)) throw new Error('パスコードは 4〜8 桁の数字です');
  const s = typeof salt === 'string' && salt !== '' ? salt : crypto.randomBytes(16).toString('hex');
  const h = await gate.hashCode(code, s, 'fnv');
  return { algo: h.algo, salt: s, hash: h.hash };
}

// js/config.js に貼る 1 行
function configLine(entry) {
  return `    teacher: { passcode: { algo: '${entry.algo}', salt: '${entry.salt}', hash: '${entry.hash}' } },`;
}

if (require.main === module) {
  passcodeEntry(process.argv[2], process.argv[3]).then((entry) => {
    console.log('// js/config.js の api に貼る（先生画面の初期パスコード）');
    console.log(configLine(entry));
  }, (err) => {
    console.error(err.message);
    console.error('使い方: node tools/teacher-passcode.js <4〜8 桁の数字> [salt]');
    process.exit(1);
  });
}

module.exports = { passcodeEntry, configLine };
