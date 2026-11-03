// テスト用の小さな単元（validateUnit が [] を返す最小限の完全な教材）
// 2 領域・3 ステージ・3 概念。Task 2 のほか、Task 6・7 のテストでも使う。
// 領域 a（order 1）: s-a1（概念 c-a）、s-a2（概念 c-b）／領域 b（order 2）: s-b1（概念 c-c）
// 概念のつながり: c-a（basic なし）← c-b ← c-c

// 図: 選べる場所が 1 つだけの最小の場面
function regionFigure() {
  return { width: 320, height: 240, items: [{ type: 'region', id: 'r1', x: 100, y: 100, r: 24 }] };
}

// 2 択の choice 問題（正解は o1）
function choice(id, concept, prompt) {
  return {
    id, type: 'choice', concept, prompt, figure: null,
    explanation: '正しいのは「はい」です。', hint: '図を思い出そう。',
    options: [{ id: 'o1', text: 'はい' }, { id: 'o2', text: 'いいえ' }], answer: 'o1',
  };
}

// 語を選ぶ fill 問題（空らん b1 が 1 つ。words の先頭が正解）
function fill(id, concept, text, words) {
  return {
    id, type: 'fill', concept, prompt: '空らんに入る言葉を選ぼう。', figure: null,
    explanation: '正しい言葉は「' + words[0] + '」です。', hint: '学んだことを思い出そう。',
    text,
    blanks: [{ id: 'b1', kind: 'word', options: words, answer: words[0] }],
  };
}

// 図の場所を選ぶ figure-choice 問題（正解は r1）
function figureChoice(id, concept, prompt) {
  return {
    id, type: 'figure-choice', concept, prompt, figure: regionFigure(),
    explanation: '光が届くのはこの場所です。', hint: '光の出どころから線を引こう。',
    answer: 'r1',
  };
}

function card(id, text) { return { id, text, figure: null }; }

const unit = {
  id: 'u',
  title: 'テスト用の光の単元',
  concepts: [
    {
      id: 'c-a', title: '光の直進', basic: null, lessonStageId: 's-a1',
      checkPool: [
        choice('p-ca-k1', 'c-a', '光はまっすぐ進む？'),
        choice('p-ca-k2', 'c-a', '光は空気中をまっすぐ進む？'),
        choice('p-ca-k3', 'c-a', '影ができるのは光がまっすぐ進むから？'),
      ],
    },
    {
      id: 'c-b', title: '光の反射', basic: 'c-a', lessonStageId: 's-a2',
      checkPool: [
        choice('p-cb-k1', 'c-b', '鏡で光ははね返る？'),
        choice('p-cb-k2', 'c-b', '入射角と反射角は等しい？'),
        choice('p-cb-k3', 'c-b', '鏡に映る像は鏡の奥に見える？'),
      ],
    },
    {
      id: 'c-c', title: '光の屈折', basic: 'c-b', lessonStageId: 's-b1',
      checkPool: [
        choice('p-cc-k1', 'c-c', '水に入る光は曲がる？'),
        choice('p-cc-k2', 'c-c', '境目で光の道すじが折れる？'),
        choice('p-cc-k3', 'c-c', '水中の物は浮いて見える？'),
      ],
    },
  ],
  areas: [
    {
      id: 'a', title: '光の進み方', order: 1,
      stages: [
        {
          id: 's-a1', areaId: 'a', title: '光はまっすぐ進む', minutes: 5, concepts: ['c-a'],
          lessons: [card('card-a1-1', '光はまっすぐ進みます。'), card('card-a1-2', 'さえぎると影ができます。')],
          warmup: choice('p-a1-w', 'c-a', '電灯は光を出す？'),
          problems: [
            choice('p-a1-1', 'c-a', '光はまっすぐ進む？'),
            fill('p-a1-2', 'c-a', '光は[b1]進む', ['まっすぐ', '曲がって']),
            figureChoice('p-a1-3', 'c-a', '光が届く場所をタップしよう。'),
            choice('p-a1-4', 'c-a', '影は光の反対側にできる？'),
          ],
          retryPool: [
            choice('p-a1-r1', 'c-a', '光は曲がらずに進む？'),
            figureChoice('p-a1-r2', 'c-a', '影ができる場所をタップしよう。'),
          ],
        },
        {
          id: 's-a2', areaId: 'a', title: '鏡ではね返る光', minutes: 5, concepts: ['c-b'],
          lessons: [card('card-a2-1', '光は鏡ではね返ります。'), card('card-a2-2', '入射角と反射角は等しくなります。')],
          warmup: choice('p-a2-w', 'c-b', '鏡は光をはね返す？'),
          problems: [
            choice('p-a2-1', 'c-b', '鏡で光ははね返る？'),
            figureChoice('p-a2-2', 'c-b', 'はね返った光が届く場所をタップしよう。'),
            choice('p-a2-3', 'c-b', '入射角と反射角は等しい？'),
            fill('p-a2-4', 'c-b', '鏡に当たった光は[b1]', ['はね返る', '消える']),
          ],
          retryPool: [
            choice('p-a2-r1', 'c-b', '鏡に当たった光は戻ってくる？'),
            figureChoice('p-a2-r2', 'c-b', '光が当たる鏡の場所をタップしよう。'),
          ],
        },
      ],
    },
    {
      id: 'b', title: '光の屈折', order: 2,
      stages: [
        {
          id: 's-b1', areaId: 'b', title: '水の中で曲がる光', minutes: 5, concepts: ['c-c'],
          lessons: [card('card-b1-1', '光は水に入るときに曲がります。'), card('card-b1-2', 'この曲がり方を屈折といいます。')],
          warmup: choice('p-b1-w', 'c-c', '水は光を通す？'),
          problems: [
            figureChoice('p-b1-1', 'c-c', '曲がった光が届く場所をタップしよう。'),
            choice('p-b1-2', 'c-c', '水に入る光は曲がる？'),
            choice('p-b1-3', 'c-c', 'コップの中のストローは折れて見える？'),
            fill('p-b1-4', 'c-c', '境目で光が曲がることを[b1]という', ['屈折', '反射']),
          ],
          retryPool: [
            choice('p-b1-r1', 'c-c', '境目で光は折れる？'),
            figureChoice('p-b1-r2', 'c-c', '水の中の光が届く場所をタップしよう。'),
          ],
        },
      ],
    },
  ],
};

module.exports = { unit };
