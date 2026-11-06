// 「光の世界」教材データ（中学1年 理科）
// 文章と図はすべてこのアプリのための自作。形は共通資料の「共通のデータの形」を参照。
// 4 領域 × 2 ステージ（光の直進・反射・屈折・凸レンズ）と、概念 8 つ。
// Task 8: 直進・反射の 4 ステージと概念 3 つ。Task 10: 屈折・凸レンズの 4 ステージと概念 5 つ。
// 図（scene）の item は js/figures.js の定義に従う。座標は x 右向き・y 下向き、場面は 320×240。
// ray-draw / drag の samples は手計算した正解例・不正解例（tests/content-light.test.js で判定を確かめる）。
// 解説文の **語句** は大切な言葉（用語。js/richtext.js が分け、画面では強調する）。term: true の問題は、その用語を聞く用語問題。
(function (root) {
  'use strict';

  // ---- 書きやすくするための小さな道具 ----

  // 場面図（大きさはどの図も 320×240）
  function scene(items) { return { width: 320, height: 240, items }; }

  // 選択肢の文の配列 → [{ id: 'a', text }, ...]
  function options(texts) { return texts.map((text, i) => ({ id: 'abcd'[i], text })); }

  // 選択式。p.options は文の配列、p.answer は 'a'〜'd'
  function choice(p) {
    return Object.assign({ type: 'choice', figure: null }, p, { options: options(p.options) });
  }

  // 穴埋め（blanks はそのまま書く）
  function fill(p) { return Object.assign({ type: 'fill', figure: null }, p); }

  // 図の中を選ぶ・光線をかく・動かす（figure は必ず書く）
  function figureChoice(p) { return Object.assign({ type: 'figure-choice' }, p); }
  function rayDraw(p) { return Object.assign({ type: 'ray-draw' }, p); }
  function drag(p) { return Object.assign({ type: 'drag' }, p); }

  // 候補の向きを示す点線。region の中心の 24 手前で止め、ア・イ・ウの文字に重ならないようにする
  function guide(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const k = d > 0 ? Math.max(0, d - 24) / d : 0;
    return { type: 'ray', x1, y1, x2: x1 + (x2 - x1) * k, y2: y1 + (y2 - y1) * k, dashed: true };
  }

  function word(id, opts, answer) { return { id, kind: 'word', options: opts, answer }; }
  function number(id, answer, tolerance, unit) { return { id, kind: 'number', answer, tolerance, unit }; }

  // ================================================================
  // 領域 1: 光の直進
  // ================================================================

  // ---- ステージ straight-1: 光はまっすぐ進む（光源、光の道すじ、影） ----
  const straight1 = {
    id: 'straight-1', areaId: 'straight', title: '光はまっすぐ進む', minutes: 4, concepts: ['straight'],
    lessons: [
      {
        id: 'straight-1-c1',
        anim: 'rays-spread',
        text: '電球や太陽のように、自分で光を出すものを**光源**といいます。光源から出た光は、あらゆる向きへ進みます。光の進む道を**光の道すじ**といい、図では矢印のついた直線で表します。光は同じ物質の中ではまっすぐ進みます。',
        // 電球から四方へ出る光の道すじ
        figure: scene([
          { type: 'ray', x1: 80, y1: 120, x2: 300, y2: 120, arrow: true },
          { type: 'ray', x1: 80, y1: 120, x2: 280, y2: 30, arrow: true },
          { type: 'ray', x1: 80, y1: 120, x2: 280, y2: 210, arrow: true },
          { type: 'ray', x1: 80, y1: 120, x2: 20, y2: 40, arrow: true },
          { type: 'ray', x1: 80, y1: 120, x2: 20, y2: 200, arrow: true },
          { type: 'lamp', x: 80, y: 120 },
          { type: 'label', x: 56, y: 168, text: '光源' },
          { type: 'label', x: 200, y: 112, text: '光の道すじ' },
        ]),
      },
      {
        id: 'straight-1-c2',
        anim: 'shadow-forms',
        text: '光の通り道に、光を通さないものを置くと、その後ろには光が届きません。光はまっすぐ進み、ものの後ろへ回りこまないので、暗い部分ができます。これが**影**です。',
        // 物体の上下のはしを通る光と、スクリーンにできる影
        figure: scene([
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 51, arrow: true },
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 189, arrow: true },
          { type: 'object', x: 140, y: 149, height: 58, label: '物体' },
          { type: 'screen', x: 280, y1: 30, y2: 220 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'label', x: 290, y: 126, text: '影' },
        ]),
      },
      {
        id: 'straight-1-c3',
        anim: 'shadow-size',   // 動く図（js/anim.js）。figure は静止図として残す
        text: '**影**の形や大きさは、光源と物体のはしを結ぶ直線をのばすと分かります。物体を光源に近づけると、光をさえぎる範囲が広がるので、スクリーンにできる影は大きくなります。',
        // 物体を光源に近づけたときの影（大きくなる）
        figure: scene([
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 30, arrow: true },
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 210, arrow: true },
          { type: 'object', x: 100, y: 143, height: 45, label: '物体' },
          { type: 'screen', x: 280, y1: 30, y2: 220 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'label', x: 104, y: 232, text: '近づけると影は大きい' },
        ]),
      },
    ],
    warmup: choice({
      id: 'straight-1-w1', concept: 'straight',
      prompt: '予想しよう。電球から出た光は、何もない部屋の中をどのように進むと思う？',
      options: ['くねくね曲がりながら進む', 'まっすぐに進む', '少し進むと下に落ちる'],
      answer: 'b',
      explanation: '光は、さえぎるものがなければまっすぐに進みます。このステージで確かめていこう。',
      hint: '細い光のすじが見えるときの形を思い出そう。',
    }),
    problems: [
      choice({
        id: 'straight-1-p1', concept: 'straight',
        prompt: '次のうち、光源（自分で光を出すもの）はどれ？',
        options: ['月', '鏡', '太陽', '白い紙'],
        answer: 'c',
        explanation: '太陽は自分で光を出す光源です。月や鏡、白い紙は、ほかから来た光をはね返して明るく見えています。月が光源でないことに気づけると、ものの見え方が整理しやすくなります。',
        hint: '真っ暗な場所に置いても光っているのはどれか考えよう。',
      }),
      fill({
        id: 'straight-1-t1', concept: 'straight', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '光の進む道を[b1]という。光を通さないものの後ろにできる暗い部分を[b2]という。',
        blanks: [
          word('b1', ['光源', '光の道すじ', '影'], '光の道すじ'),
          word('b2', ['光源', '光の道すじ', '影'], '影'),
        ],
        explanation: '光の進む道が**光の道すじ**、光がさえぎられてできる暗い部分が**影**です。図では、光の道すじを矢印のついた直線でかきます。',
        hint: '「道」と「暗い部分」に合う言葉をさがそう。',
      }),
      fill({
        id: 'straight-1-p2', concept: 'straight',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '自分で光を出すものを[b1]という。[b1]から出た光は[b2]進む。',
        blanks: [
          word('b1', ['物体', '光源', '影'], '光源'),
          word('b2', ['まっすぐ', '曲がって', '回りこんで'], 'まっすぐ'),
        ],
        explanation: '自分で光を出すものは光源です。光源から出た光は、まっすぐ進みます。この 2 つが、影や見え方を考えるときの出発点になります。',
        hint: '電球や太陽のことを何とよんだか思い出そう。',
      }),
      figureChoice({
        id: 'straight-1-p3', concept: 'straight',
        prompt: '電球の光が物体に当たっています。スクリーンのア〜ウのうち、影ができるのはどこ？',
        // 光源 (40,120)、物体のはし (140,110)・(140,140) → スクリーン x=280 では y 96〜168 が影
        figure: scene([
          { type: 'object', x: 140, y: 140, height: 30, label: '物体' },
          { type: 'screen', x: 280, y1: 30, y2: 230 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'region', id: 'r1', x: 280, y: 56, r: 22, name: 'ア' },
          { type: 'label', x: 244, y: 62, text: 'ア' },
          { type: 'region', id: 'r2', x: 280, y: 132, r: 22, name: 'イ' },
          { type: 'label', x: 244, y: 138, text: 'イ' },
          { type: 'region', id: 'r3', x: 280, y: 208, r: 22, name: 'ウ' },
          { type: 'label', x: 244, y: 214, text: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '電球と物体の上のはし・下のはしを結ぶ直線をスクリーンまでのばすと、そのあいだのイに光が届かないことが分かります。光はまっすぐ進み、物体の後ろへ回りこまないので、イに影ができます。',
        hint: '電球から物体の上と下のはしを通る直線を、頭の中でスクリーンまでのばしてみよう。',
      }),
      choice({
        id: 'straight-1-p4', concept: 'straight',
        prompt: '光が当たると、ものの後ろに影ができるのはなぜ？',
        options: ['ものが光を吸いこんで黒い色を出すから', '光がまっすぐ進み、ものの後ろへ回りこまないから', 'ものが暗い色をしているから'],
        answer: 'b',
        explanation: '光はまっすぐ進むので、ものにさえぎられると、その後ろへは届きません。だから白いものでも透明でないものなら影ができます。影は「光がまっすぐ進む」ことの証拠です。',
        hint: '白い紙でも影ができることを思い出そう。',
      }),
      drag({
        id: 'straight-1-p5', concept: 'straight',
        prompt: 'スクリーンの 2 つの青い点のあいだに、ちょうど影ができるようにしたい。電球と青い点を結ぶ 2 本の点線のあいだに物体がちょうど入るように、物体を左右に動かして置こう。',
        // 光源 (40,120)、物体の高さ 40（y 100〜140）。スクリーン x=280 で影の高さ 120（y 60〜180）にするには
        // 40 × (280−40) / (x−40) = 120 → x = 120
        // 電球と青い点を結ぶ点線を案内に描く。x=120 で点線は y 100 と 140 を通り、物体の上下のはしと重なる
        figure: scene([
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 60, dashed: true },
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 180, dashed: true },
          { type: 'screen', x: 280, y1: 30, y2: 220 },
          { type: 'point', x: 280, y: 60 },
          { type: 'point', x: 280, y: 180 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'object', id: 'obj', x: 240, y: 140, height: 40, label: '物体' },
        ]),
        draggable: { itemId: 'obj', axis: 'x' },
        target: { x: 120, y: 140 },
        samples: { correct: { x: 120, y: 140 }, wrong: { x: 180, y: 140 } },
        explanation: '影のはしは、電球と物体のはしを結ぶ直線で決まります。だから、2 本の点線のあいだに物体の上下のはしがちょうど入る位置に置けば、影は青い点のあいだにできます。光がまっすぐ進むことを使うと、影の大きさも予想できます。',
        hint: '物体の上のはしと下のはしが、2 本の点線にちょうど重なる位置をさがそう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'straight-1-r1', concept: 'straight',
        prompt: '次のうち、光源ではないものはどれ？',
        options: ['ろうそくの炎', '電球', '太陽', '月'],
        answer: 'd',
        explanation: '月は自分では光を出さず、太陽の光をはね返して明るく見えています。ろうそくの炎、電球、太陽は自分で光を出す光源です。',
        hint: '自分で光を出しているかどうかで分けよう。',
      }),
      figureChoice({
        id: 'straight-1-r2', concept: 'straight',
        prompt: '電球の光が、電球より上にある物体に当たっています。スクリーンのア〜ウのうち、影ができるのはどこ？',
        // 光源 (40,120)、物体のはし (150,80)・(150,110) → スクリーン x=280 では y 33〜98 が影
        figure: scene([
          { type: 'object', x: 150, y: 110, height: 30, label: '物体' },
          { type: 'screen', x: 280, y1: 30, y2: 230 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'region', id: 'r1', x: 280, y: 66, r: 22, name: 'ア' },
          { type: 'label', x: 244, y: 72, text: 'ア' },
          { type: 'region', id: 'r2', x: 280, y: 140, r: 22, name: 'イ' },
          { type: 'label', x: 244, y: 146, text: 'イ' },
          { type: 'region', id: 'r3', x: 280, y: 210, r: 22, name: 'ウ' },
          { type: 'label', x: 244, y: 216, text: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '電球と物体の上下のはしを結ぶ直線をのばすと、スクリーンの上のほうのアに光が届きません。物体が電球より上にあるので、影もスクリーンの上のほうにできます。',
        hint: '電球から物体の上と下のはしを通る直線をのばしてみよう。',
      }),
      choice({
        id: 'straight-1-r3', concept: 'straight',
        prompt: '電球とスクリーンのあいだにある物体を、電球に近づけました。スクリーンにできる影はどうなる？',
        options: ['小さくなる', '大きくなる', '大きさは変わらない'],
        answer: 'b',
        explanation: '物体を電球に近づけると、電球と物体のはしを結ぶ直線が大きく開き、光をさえぎる範囲が広がります。そのため、影は大きくなります。',
        hint: '電球と物体のはしを結ぶ直線が、どう開くか考えよう。',
      }),
      choice({
        id: 'straight-1-t2', concept: 'straight', term: true,
        prompt: '次の説明に合う言葉はどれ？「光を通さないものの後ろにできる、光が届かない暗い部分」',
        options: ['光源', '光の道すじ', '影'],
        answer: 'c',
        explanation: '光はまっすぐ進み、ものの後ろへ回りこまないので、光が届かない暗い部分ができます。これが**影**です。',
        hint: '光がさえぎられるとできるものだよ。',
      }),
    ],
  };

  // ---- ステージ straight-2: ものが見えるしくみ（光源と物体、目に届く光） ----
  const straight2 = {
    id: 'straight-2', areaId: 'straight', title: 'ものが見えるしくみ', minutes: 4, concepts: ['straight'],
    lessons: [
      {
        id: 'straight-2-c1',
        anim: 'light-to-eye',
        text: '電球が見えるのは、電球から出た光がまっすぐ進んで、わたしたちの目に入るからです。目から何かが出ているわけではありません。光が目に入ったときに、ものが見えます。',
        // 電球 → 目
        figure: scene([
          { type: 'ray', x1: 70, y1: 120, x2: 240, y2: 120, arrow: true },
          { type: 'lamp', x: 60, y: 120 },
          { type: 'eye', x: 260, y: 120 },
          { type: 'label', x: 40, y: 168, text: '光源' },
          { type: 'label', x: 246, y: 160, text: '目' },
        ]),
      },
      {
        id: 'straight-2-c2',
        anim: 'bounce-to-eye',
        text: '本のように自分で光を出さないものも見えます。**光源**の光がものに当たってはね返り、その光が目に入るからです。光を出さないものは、光が当たらないと見えません。',
        // 電球 → 本 → 目
        figure: scene([
          { type: 'ray', x1: 60, y1: 60, x2: 158, y2: 160, arrow: true },
          { type: 'ray', x1: 162, y1: 160, x2: 255, y2: 92, arrow: true },
          { type: 'lamp', x: 50, y: 50 },
          { type: 'object', x: 160, y: 200, height: 40, label: '本' },
          { type: 'eye', x: 270, y: 80 },
          { type: 'label', x: 28, y: 100, text: '光源' },
        ]),
      },
      {
        id: 'straight-2-c3',
        text: '真っ暗な部屋では、ものに光が当たらず、はね返った光も目に届きません。だから、目をこらしても何も見えません。ものが見えるためには、光が目に入ることが必要です。',
        // 光がないので、本から目に届く光がない
        figure: scene([
          { type: 'object', x: 120, y: 190, height: 40, label: '本' },
          { type: 'eye', x: 250, y: 110 },
          { type: 'ray', x1: 130, y1: 160, x2: 235, y2: 118, dashed: true },
          { type: 'label', x: 40, y: 50, text: '真っ暗（光源がない）' },
          { type: 'label', x: 140, y: 110, text: '光が届かない' },
        ]),
      },
    ],
    warmup: choice({
      id: 'straight-2-w1', concept: 'straight',
      prompt: '予想しよう。光がまったく入らない真っ暗な部屋で、目がなれるまで待つと、白い紙は見えるようになると思う？',
      options: ['しばらく待てば見えるようになる', '光がまったくなければ、いくら待っても見えない'],
      answer: 'b',
      explanation: '紙から目に届く光がまったくないので、待っても見えません。理由をこのステージで考えよう。',
      hint: 'ものが見えるとき、何が目に入っているか考えよう。',
    }),
    problems: [
      choice({
        id: 'straight-2-p1', concept: 'straight',
        prompt: '明るい部屋で、机の上の本が見えるのはなぜ？',
        options: ['目から出た光が本に当たるから', '本が自分で光を出しているから', '本ではね返った光が目に入るから'],
        answer: 'c',
        explanation: '電灯や太陽の光が本に当たってはね返り、その光が目に入るので本が見えます。光は「もの → 目」の向きに進んでいます。「目から何かが出る」と考えたくなるのは自然なことなので、光の向きを図で確かめておこう。',
        hint: '光はどこから出て、どこに届くのか、順番に考えよう。',
      }),
      fill({
        id: 'straight-2-t1', concept: 'straight', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '本のように自分で光を出さないものは、[b1]の光が当たってはね返り、その光が目に入ることで見える。',
        blanks: [
          word('b1', ['光源', '影', '像'], '光源'),
        ],
        explanation: '本は自分で光を出しません。**光源**の光が本に当たってはね返り、その光が目に入るので見えます。',
        hint: '電球や太陽のように、自分で光を出すものを何とよんだかな。',
      }),
      figureChoice({
        id: 'straight-2-p2', concept: 'straight',
        prompt: '目と電球のあいだに、光を通さない板（スクリーン）があります。ア〜ウのどこに電球を置くと、目から電球が直接見える？',
        // 目 (40,120) と板のはし (150,100)・(150,170) を結ぶ直線: x=260 で y 80 より上なら見える
        figure: scene([
          { type: 'eye', x: 40, y: 120 },
          { type: 'screen', x: 150, y1: 100, y2: 170 },
          { type: 'region', id: 'r1', x: 260, y: 40, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 260, y: 130, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 210, y: 170, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '電球の光が目まで届くには、電球と目を結ぶ直線が板にさえぎられないことが必要です。アから目への直線は板の上を通るので、アの電球は見えます。イとウからの光は板に当たって目に届きません。',
        hint: 'ア〜ウそれぞれから目まで直線を引き、板に当たるかどうか調べよう。',
      }),
      fill({
        id: 'straight-2-p3', concept: 'straight',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '本のように自分で光を出さないものが見えるのは、光源の光が本で[b1]、その光が[b2]に入るからだ。',
        blanks: [
          word('b1', ['吸いこまれて', 'はね返って', '止まって'], 'はね返って'),
          word('b2', ['目', '光源', '影'], '目'),
        ],
        explanation: '光源の光が本に当たってはね返り、その光が目に入ると、本が見えます。光源でないものが見えるしくみは、いつもこの順番です。',
        hint: '光源 → 本 → 目 の順に、光がどう進むか考えよう。',
      }),
      choice({
        id: 'straight-2-p4', concept: 'straight',
        prompt: '昼間、部屋の電灯を消しても、本が見えるのはなぜ？',
        options: ['窓から入った太陽の光が本ではね返り、目に入るから', '本が少しだけ光を出しているから', '目がなれると、光がなくても見えるから'],
        answer: 'a',
        explanation: '電灯を消しても、窓から入る太陽の光が本に当たっています。本ではね返ったその光が目に入るので、本が見えます。光源は電灯だけとはかぎりません。',
        hint: '部屋の中に、電灯のほかに光が入ってくるところはないか考えよう。',
      }),
      figureChoice({
        id: 'straight-2-p5', concept: 'straight',
        prompt: '暗い部屋で、電球の光をオレンジの線のあいだだけに当てています。ア〜ウの 3 つのもののうち、目に見えるのはどれ？',
        // 光は (40,120) から (300,80)〜(300,160) の範囲だけ。x=230 では y 91〜149 に光が当たる
        figure: scene([
          { type: 'ray', x1: 40, y1: 120, x2: 300, y2: 80, arrow: true },
          { type: 'ray', x1: 40, y1: 120, x2: 300, y2: 160, arrow: true },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'eye', x: 80, y: 215 },
          { type: 'object', x: 200, y: 65, height: 30 },
          { type: 'object', x: 230, y: 135, height: 30 },
          { type: 'object', x: 160, y: 215, height: 30 },
          { type: 'region', id: 'r1', x: 200, y: 50, r: 26, name: 'ア' },
          { type: 'label', x: 230, y: 56, text: 'ア' },
          { type: 'region', id: 'r2', x: 230, y: 120, r: 26, name: 'イ' },
          { type: 'label', x: 260, y: 126, text: 'イ' },
          { type: 'region', id: 'r3', x: 160, y: 200, r: 26, name: 'ウ' },
          { type: 'label', x: 190, y: 206, text: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '光が当たっているのはイだけです。イではね返った光が目に入るので、イが見えます。アとウには光が当たらないので、はね返って目に届く光がなく、暗い部屋では見えません。',
        hint: 'まず、電球の光が当たっているものをさがそう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'straight-2-r1', concept: 'straight',
        prompt: '花が見えているとき、光はどの向きに進んでいる？',
        options: ['目 → 花', '花 → 目', 'どちらにも進んでいない'],
        answer: 'b',
        explanation: '光源の光が花に当たってはね返り、花から目に向かって進みます。光が目に入ったときに、花が見えます。',
        hint: '見えるために、光はどこに入る必要があったか思い出そう。',
      }),
      figureChoice({
        id: 'straight-2-r2', concept: 'straight',
        prompt: '目と電球のあいだに、光を通さない板（スクリーン）があります。ア〜ウのどこに電球を置くと、板にさえぎられて目から電球が見えない？',
        // 目 (40,160) と板のはし (160,60)・(160,130) を結ぶ直線: x=270 で y 102 より上は板にさえぎられる
        figure: scene([
          { type: 'eye', x: 40, y: 160 },
          { type: 'screen', x: 160, y1: 60, y2: 130 },
          { type: 'region', id: 'r1', x: 270, y: 40, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 270, y: 140, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 270, y: 210, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: 'アと目を結ぶ直線は板に当たるので、アの電球の光は目に届かず見えません。イとウから目への直線は板の下を通るので、光が届いて見えます。',
        hint: 'ア〜ウそれぞれから目まで直線を引いてみよう。',
      }),
      fill({
        id: 'straight-2-r3', concept: 'straight',
        prompt: '空らんに入る言葉を選ぼう。',
        text: 'ものが見えるのは、ものから出た光や、ものではね返った光が[b1]に入るからだ。',
        blanks: [word('b1', ['鏡', '目', '耳'], '目')],
        explanation: 'ものからの光が目に入ると、そのものが見えます。光が目に届かなければ、そこにものがあっても見えません。',
        hint: '光を受け取るのは体のどこか考えよう。',
      }),
      choice({
        id: 'straight-2-t2', concept: 'straight', term: true,
        prompt: '次の説明に合う言葉はどれ？「電球や太陽のように、自分で光を出すもの」',
        options: ['光源', '反射光', '影'],
        answer: 'a',
        explanation: '自分で光を出すものを**光源**といいます。光源がない真っ暗な部屋では、ものに光が当たらないので何も見えません。',
        hint: '光の「みなもと」という意味の言葉だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 2: 光の反射
  // ================================================================

  // ---- ステージ reflect-1: 反射の法則（入射角＝反射角） ----
  // 法線（長さ 120）は当たった点から鏡の表側へだけ描く（中心を当たった点から 60 ずらす）。角の文字は法線の横に置く
  const reflect1 = {
    id: 'reflect-1', areaId: 'reflect', title: '反射の法則', minutes: 5, concepts: ['reflect-law'],
    lessons: [
      {
        id: 'reflect-1-c1',
        anim: 'reflect-travel',
        text: '光が鏡に当たってはね返ることを、光の**反射**といいます。鏡に当たる光を**入射光**、はね返った光を**反射光**といいます。反射したあとも、光はまっすぐに進みます。',
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'ray', x1: 60, y1: 60, x2: 160, y2: 180, arrow: true },
          { type: 'ray', x1: 160, y1: 180, x2: 260, y2: 60, arrow: true },
          { type: 'lamp', x: 60, y: 60 },
          { type: 'label', x: 40, y: 140, text: '入射光' },
          { type: 'label', x: 230, y: 140, text: '反射光' },
          { type: 'label', x: 140, y: 222, text: '鏡' },
        ]),
      },
      {
        id: 'reflect-1-c2',
        anim: 'reflect-names',
        text: '光が鏡に当たった点に、鏡の面に垂直な線を引きます。この線を**法線**といいます。入射光と法線のなす角を**入射角**、反射光と法線のなす角を**反射角**といいます。',
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 60, y1: 60, x2: 160, y2: 180, arrow: true },
          { type: 'ray', x1: 160, y1: 180, x2: 260, y2: 60, arrow: true },
          { type: 'label', x: 166, y: 54, text: '法線' },
          { type: 'label', x: 100, y: 95, text: '入射角' },
          { type: 'label', x: 172, y: 95, text: '反射角' },
        ]),
      },
      {
        id: 'reflect-1-c3',
        anim: 'reflect-law',   // 動く図（js/anim.js）。figure は静止図として残す
        text: '入射角と反射角は、いつも等しくなります。これを**反射の法則**といいます。角度は鏡の面からではなく、法線から測ることに気をつけましょう。',
        // 入射角 30° → 反射角 30°
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 100, y1: 76, x2: 160, y2: 180, arrow: true },
          { type: 'ray', x1: 160, y1: 180, x2: 220, y2: 76, arrow: true },
          { type: 'label', x: 124, y: 100, text: '30°' },
          { type: 'label', x: 168, y: 100, text: '30°' },
          { type: 'label', x: 40, y: 40, text: '入射角 ＝ 反射角' },
        ]),
      },
    ],
    warmup: choice({
      id: 'reflect-1-w1', concept: 'reflect-law',
      prompt: '予想しよう。鏡にななめに光を当てると、はね返った光はどう進むと思う？',
      options: ['来た道をそのまま戻る', '来たときと同じかたむきで、反対側へ進む', '鏡の面にそってすべるように進む'],
      answer: 'b',
      explanation: '光は、来たときと同じかたむきで反対側へはね返ります。そのきまりをこのステージで学ぼう。',
      hint: 'ボールをななめに壁へ当てたときを思い出そう。',
    }),
    problems: [
      rayDraw({
        id: 'reflect-1-p1', concept: 'reflect-law',
        prompt: '電球の光が鏡に当たりました。はね返った光（反射光）の道すじを、当たった点から指で引こう。',
        // 入射の向き (100,120)。水平な鏡なので反射の向きは (100,−120)。入射角＝反射角＝約 39.8°
        figure: scene([
          { type: 'mirror', x1: 40, y1: 180, x2: 280, y2: 180 },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 60, y1: 60, x2: 160, y2: 180, arrow: true },
          { type: 'lamp', x: 60, y: 60 },
        ]),
        source: { x: 60, y: 60 },
        hit: { x: 160, y: 180 },
        surface: { kind: 'mirror', x1: 40, y1: 180, x2: 280, y2: 180 },
        expected: { kind: 'angle' },
        samples: { correct: { out: { x: 260, y: 60 } }, wrong: { out: { x: 160, y: 60 } } },
        explanation: '反射光は、法線をはさんで入射光と反対側へ、入射角と同じ角度で進みます。法線（点線）から入射光までの開きと、法線から反射光までの開きが同じになっていればよいです。',
        hint: '点線の法線から入射光までの角度と、同じ角度だけ反対側に開いて引こう。',
      }),
      fill({
        id: 'reflect-1-t1', concept: 'reflect-law', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '鏡に当たる光を[b1]、はね返った光を[b2]という。',
        blanks: [
          word('b1', ['入射光', '反射光', '法線'], '入射光'),
          word('b2', ['入射光', '反射光', '法線'], '反射光'),
        ],
        explanation: '鏡に当たる光が**入射光**、はね返った光が**反射光**です。言葉を区別できると、角度の話が分かりやすくなります。',
        hint: '「入射」は入ってくる、「反射」ははね返るという意味だよ。',
      }),
      fill({
        id: 'reflect-1-p2', concept: 'reflect-law',
        prompt: '空らんに入る数を入れよう。',
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 100, y1: 76, x2: 160, y2: 180, arrow: true },
          { type: 'label', x: 124, y: 100, text: '30°' },
          { type: 'label', x: 40, y: 40, text: '入射角 30°' },
        ]),
        text: '入射角が 30° のとき、反射角は[b1]になる。',
        blanks: [number('b1', 30, 2, '°')],
        explanation: '反射の法則により、反射角は入射角と同じ 30° です。どちらの角も法線から測っていることも確かめておこう。',
        hint: '入射角と反射角の関係を思い出そう。',
      }),
      figureChoice({
        id: 'reflect-1-p3', concept: 'reflect-law',
        prompt: '入射角はどこ？ 図のア〜ウから選んでタップしよう。',
        // 入射光は法線から約 50° かたむく。ア＝入射光と法線のあいだ、イ＝入射光と鏡のあいだ、ウ＝反射光と法線のあいだ
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 52, y1: 90, x2: 160, y2: 180, arrow: true },
          { type: 'ray', x1: 160, y1: 180, x2: 268, y2: 90, arrow: true },
          { type: 'region', id: 'r1', x: 137, y: 130, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 94, y: 156, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 183, y: 130, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '入射角は、入射光と法線のあいだの角なので、アです。イは入射光と鏡の面のあいだの角、ウは反射角です。角度は法線から測る、と覚えておくと迷いにくくなります。',
        hint: '入射角は「入射光」と「法線」のあいだの角です。',
      }),
      choice({
        id: 'reflect-1-p4', concept: 'reflect-law',
        prompt: '光を鏡の面に垂直に当てました（入射角 0°）。反射光はどう進む？',
        options: ['鏡の面にそって進む', '来た道をそのまま戻る', '45° かたむいて進む'],
        answer: 'b',
        explanation: '入射角が 0° なら、反射角も 0° です。反射光は法線にそって進むので、来た道をそのまま戻ります。反射の法則は、垂直に当てたときにも成り立ちます。',
        hint: '入射角が 0° なら、反射角は何度になるか考えよう。',
      }),
      rayDraw({
        id: 'reflect-1-p5', concept: 'reflect-law',
        prompt: '立てた鏡に光が当たりました。はね返った光の道すじを、当たった点から指で引こう。',
        // 縦の鏡 x=240。入射の向き (180,80) → 反射の向き (−180,80)。正解例は (60,220)
        figure: scene([
          { type: 'mirror', x1: 240, y1: 30, x2: 240, y2: 230 },
          { type: 'normal', x: 180, y: 140, angle: 90 },
          { type: 'ray', x1: 60, y1: 60, x2: 240, y2: 140, arrow: true },
          { type: 'lamp', x: 60, y: 60 },
        ]),
        source: { x: 60, y: 60 },
        hit: { x: 240, y: 140 },
        surface: { kind: 'mirror', x1: 240, y1: 30, x2: 240, y2: 230 },
        expected: { kind: 'angle' },
        samples: { correct: { out: { x: 60, y: 220 } }, wrong: { out: { x: 60, y: 60 } } },
        explanation: '鏡が立っていても、法線は鏡に垂直な横向きの線です。入射光は法線の上側から来ているので、反射光は法線の下側へ、同じ角度で進みます。',
        hint: '横向きの点線（法線）をはさんで、入射光と反対側に同じ角度で引こう。',
      }),
    ],
    retryPool: [
      rayDraw({
        id: 'reflect-1-r1', concept: 'reflect-law',
        prompt: '電球の光が鏡に当たりました。反射光の道すじを、当たった点から指で引こう。',
        // 入射の向き (90,120) → 反射の向き (90,−120)。正解例は (220,80)
        figure: scene([
          { type: 'mirror', x1: 30, y1: 200, x2: 290, y2: 200 },
          { type: 'normal', x: 130, y: 140, angle: 0 },
          { type: 'ray', x1: 40, y1: 80, x2: 130, y2: 200, arrow: true },
          { type: 'lamp', x: 40, y: 80 },
        ]),
        source: { x: 40, y: 80 },
        hit: { x: 130, y: 200 },
        surface: { kind: 'mirror', x1: 30, y1: 200, x2: 290, y2: 200 },
        expected: { kind: 'angle' },
        samples: { correct: { out: { x: 220, y: 80 } }, wrong: { out: { x: 250, y: 170 } } },
        explanation: '反射光は、法線をはさんで入射光と反対側へ、入射角と同じ角度で進みます。鏡の面からの角度ではなく、法線からの角度をそろえるのがポイントです。',
        hint: '点線の法線から入射光までと同じ角度だけ、反対側に開いて引こう。',
      }),
      fill({
        id: 'reflect-1-r2', concept: 'reflect-law',
        prompt: '空らんに入る数を入れよう。',
        text: '反射角が 25° のとき、入射角は[b1]である。',
        blanks: [number('b1', 25, 2, '°')],
        explanation: '入射角と反射角はいつも等しいので、入射角も 25° です。反対から考えても、反射の法則は同じように使えます。',
        hint: '入射角と反射角は、いつもどんな関係だったか思い出そう。',
      }),
      choice({
        id: 'reflect-1-r3', concept: 'reflect-law',
        prompt: '入射角とは、どの 2 つのあいだの角？',
        options: ['入射光と鏡の面', '入射光と反射光', '入射光と法線'],
        answer: 'c',
        explanation: '入射角は、入射光と法線のあいだの角です。反射角も、反射光と法線のあいだの角です。どちらも法線から測ります。',
        hint: '角度はどの線から測るきまりだったか思い出そう。',
      }),
      choice({
        id: 'reflect-1-t2', concept: 'reflect-law', term: true,
        prompt: '次の説明に合う言葉はどれ？「光が鏡に当たった点で、鏡の面に垂直に引いた線」',
        options: ['法線', '入射角', '反射光'],
        answer: 'a',
        explanation: '鏡の面に垂直な線を**法線**といいます。入射角も反射角も、鏡の面からではなく法線から測ります。',
        hint: '角度を測るときの基準になる線だよ。',
      }),
    ],
  };

  // ---- ステージ reflect-2: 鏡に映る像（像の位置、見える範囲） ----
  const reflect2 = {
    id: 'reflect-2', areaId: 'reflect', title: '鏡に映る像', minutes: 5, concepts: ['mirror-image'],
    lessons: [
      {
        id: 'reflect-2-c1',
        anim: 'mirror-image-distance',
        text: '鏡を見ると、鏡の向こう側にものがあるように見えます。これを**像**といいます。像は、鏡をはさんでものと反対側の、鏡からものまでと同じ距離のところにできます。',
        // もの x=90、鏡 x=160、像 x=230（どちらも鏡から 70）
        figure: scene([
          { type: 'mirror', x1: 160, y1: 40, x2: 160, y2: 210 },
          { type: 'object', x: 90, y: 190, height: 60, label: 'もの' },
          { type: 'object', x: 230, y: 190, height: 60, label: '像' },
          { type: 'ray', x1: 90, y1: 150, x2: 230, y2: 150, dashed: true },
          { type: 'label', x: 120, y: 144, text: 'a' },
          { type: 'label', x: 192, y: 144, text: 'a' },
          { type: 'label', x: 20, y: 30, text: '鏡からの距離はどちらも a' },
        ]),
      },
      {
        id: 'reflect-2-c2',
        anim: 'image-behind-mirror',
        text: 'ものから出た光は、鏡で反射して目に入ります。目は光がまっすぐ来たと感じるので、反射光を鏡の向こうへのばした先にものがあるように見えます。そこが**像**の位置です。',
        // もの (90,170) → 鏡 (160,125) → 目 (60,60)。像 (230,170) と目を結ぶ線が鏡と交わる点で反射する
        figure: scene([
          { type: 'mirror', x1: 160, y1: 30, x2: 160, y2: 220 },
          { type: 'object', x: 90, y: 200, height: 30, label: 'もの' },
          { type: 'object', x: 230, y: 200, height: 30, label: '像' },
          { type: 'ray', x1: 90, y1: 170, x2: 160, y2: 125, arrow: true },
          { type: 'ray', x1: 160, y1: 125, x2: 72, y2: 67, arrow: true },
          { type: 'ray', x1: 160, y1: 125, x2: 230, y2: 170, dashed: true },
          { type: 'eye', x: 60, y: 60 },
        ]),
      },
      {
        id: 'reflect-2-c3',
        anim: 'mirror-visible',
        text: '鏡に映って見えるかどうかは、**像**と目を結ぶ直線が鏡の面を通るかどうかで決まります。その直線が鏡の外を通るとき、そのものは鏡に映って見えません。',
        // 像 A' (210,100) と目を結ぶ線は鏡（y 80〜160）を通る。像 B' (200,30) は鏡の上を通る
        figure: scene([
          { type: 'mirror', x1: 160, y1: 80, x2: 160, y2: 160 },
          { type: 'eye', x: 60, y: 120 },
          { type: 'point', x: 210, y: 100, label: '像A' },
          { type: 'point', x: 200, y: 30, label: '像B' },
          { type: 'ray', x1: 60, y1: 120, x2: 210, y2: 100, dashed: true },
          { type: 'ray', x1: 60, y1: 120, x2: 200, y2: 30, dashed: true },
          { type: 'label', x: 30, y: 200, text: 'Aは見える・Bは見えない' },
        ]),
      },
    ],
    warmup: choice({
      id: 'reflect-2-w1', concept: 'mirror-image',
      prompt: '予想しよう。鏡の前に立って 1 歩下がると、鏡の中の自分（像）はどうなると思う？',
      options: ['像は鏡の面にはりついたまま動かない', '像は鏡に近づいてくる', '像も鏡から 1 歩ぶん遠ざかる'],
      answer: 'c',
      explanation: '像も鏡から 1 歩ぶん遠ざかって見えます。なぜそうなるのかを、このステージで調べよう。',
      hint: '鏡の中の部屋は、こちらの部屋と同じ広さに見えることを思い出そう。',
    }),
    problems: [
      drag({
        id: 'reflect-2-p1', concept: 'mirror-image',
        prompt: '鏡の前に「もの」があります。鏡に映る像ができる位置に、「像」を左右に動かして置こう。',
        // 鏡 x=160、もの x=100（鏡から 60）→ 像は x=220
        figure: scene([
          { type: 'mirror', x1: 160, y1: 40, x2: 160, y2: 210 },
          { type: 'object', x: 100, y: 190, height: 50, label: 'もの' },
          { type: 'object', id: 'img', x: 290, y: 190, height: 50, label: '像' },
        ]),
        draggable: { itemId: 'img', axis: 'x' },
        target: { x: 220, y: 190 },
        samples: { correct: { x: 220, y: 190 }, wrong: { x: 280, y: 190 } },
        explanation: '像は、鏡をはさんでものと反対側の、鏡から同じ距離のところにできます。ものから鏡までと、鏡から像までの長さが同じになっていればよいです。',
        hint: 'ものから鏡までの距離を測って、鏡の向こうに同じだけ進もう。',
      }),
      fill({
        id: 'reflect-2-t1', concept: 'mirror-image', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '鏡を見ると、鏡の向こう側にものがあるように見える。これを[b1]という。',
        blanks: [
          word('b1', ['像', '影', '反射光'], '像'),
        ],
        explanation: '鏡の向こう側に見えるものを**像**といいます。像は、鏡をはさんでものと反対側の、鏡からものまでと同じ距離のところにできます。',
        hint: '鏡に「映る」ものを何とよんだか思い出そう。',
      }),
      fill({
        id: 'reflect-2-p2', concept: 'mirror-image',
        prompt: '空らんに入る数を入れよう。',
        text: '鏡から 2 m はなれたところに立つと、自分と鏡の中の像との距離は[b1]になる。',
        blanks: [number('b1', 4, 0, 'm')],
        explanation: '像は鏡の向こう 2 m のところにできます。自分から鏡まで 2 m、鏡から像まで 2 m なので、合わせて 4 m です。',
        hint: '自分から鏡までと、鏡から像までの 2 つの距離を足そう。',
      }),
      figureChoice({
        id: 'reflect-2-p3', concept: 'mirror-image',
        prompt: 'ものの先から出た光が鏡で反射して目に届きます。光が鏡で反射する点はア〜ウのどこ？',
        // 鏡 x=200。ものの先 (120,60) → 像 (280,60)。目 (110,190) と像を結ぶ線は鏡の y≒121 を通る
        figure: scene([
          { type: 'mirror', x1: 200, y1: 30, x2: 200, y2: 220 },
          { type: 'object', x: 120, y: 90, height: 30, label: 'もの' },
          { type: 'eye', x: 110, y: 190 },
          { type: 'region', id: 'r1', x: 200, y: 60, r: 22, name: 'ア' },
          { type: 'label', x: 162, y: 66, text: 'ア' },
          { type: 'region', id: 'r2', x: 200, y: 121, r: 22, name: 'イ' },
          { type: 'label', x: 162, y: 127, text: 'イ' },
          { type: 'region', id: 'r3', x: 200, y: 182, r: 22, name: 'ウ' },
          { type: 'label', x: 162, y: 188, text: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'まず、鏡の向こうの同じ距離のところに像を考えます。像と目を結ぶ直線が鏡と交わるイで、光は反射して目に届きます。イでは入射角と反射角も等しくなっています。',
        hint: '先に像の位置を決めて、像と目を直線で結んでみよう。',
      }),
      choice({
        id: 'reflect-2-p4', concept: 'mirror-image',
        prompt: '鏡に映る像について、正しいものはどれ？',
        options: ['像は鏡の面の上にできる', '像は鏡の向こう側の、ものと同じ距離のところにできる', '像はものと鏡のあいだにできる'],
        answer: 'b',
        explanation: '像は、鏡をはさんでものと反対側の、鏡から同じ距離のところにできます。鏡の面に絵がかいてあるのではなく、鏡の奥にあるように見えるのがポイントです。',
        hint: '鏡の前で 1 歩下がると、像がどう動いたか思い出そう。',
      }),
      figureChoice({
        id: 'reflect-2-p5', concept: 'mirror-image',
        prompt: '目の前に小さな鏡があります。ア〜ウの位置にあるもののうち、この目から鏡に映って見えるのはどれ？',
        // 鏡 x=200, y 90〜150。目 (120,120)。像は x=400−x。像と目を結ぶ線が鏡を通るのはイだけ
        // ア (150,30): 鏡の位置で y≒65、イ (60,170): y≒138、ウ (150,212): y≒177
        // イから反射点 (200,138) へ向かう光は x=120 で y≒156 を通り、目の絵（y 110〜130）にかからない
        figure: scene([
          { type: 'mirror', x1: 200, y1: 90, x2: 200, y2: 150 },
          { type: 'eye', x: 120, y: 120 },
          { type: 'region', id: 'r1', x: 150, y: 30, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 60, y: 170, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 150, y: 212, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'ア〜ウの像は、それぞれ鏡の向こうの同じ距離のところにできます。像と目を結ぶ直線が鏡の面を通るのはイだけなので、鏡に映って見えるのはイです。鏡が小さいと、見える範囲もせまくなります。',
        hint: 'ア〜ウそれぞれの像の位置を考え、像と目を結ぶ直線が鏡を通るか調べよう。',
      }),
    ],
    retryPool: [
      drag({
        id: 'reflect-2-r1', concept: 'mirror-image',
        prompt: '鏡の前に「もの」があります。鏡に映る像ができる位置に、「像」を左右に動かして置こう。',
        // 鏡 x=180、もの x=120（鏡から 60）→ 像は x=240
        figure: scene([
          { type: 'mirror', x1: 180, y1: 40, x2: 180, y2: 210 },
          { type: 'object', x: 120, y: 190, height: 50, label: 'もの' },
          { type: 'object', id: 'img', x: 200, y: 190, height: 50, label: '像' },
        ]),
        draggable: { itemId: 'img', axis: 'x' },
        target: { x: 240, y: 190 },
        samples: { correct: { x: 240, y: 190 }, wrong: { x: 300, y: 190 } },
        explanation: '像は、鏡をはさんでものと反対側の、鏡から同じ距離のところにできます。鏡のすぐ後ろではなく、ものと鏡の距離と同じだけ奥にあります。',
        hint: 'ものから鏡までの距離を、鏡の向こうに同じだけとろう。',
      }),
      choice({
        id: 'reflect-2-r2', concept: 'mirror-image',
        prompt: '鏡から 30 cm のところに花を置きました。花の像は、鏡の向こう何 cm のところにできる？',
        options: ['15 cm', '60 cm', '30 cm'],
        answer: 'c',
        explanation: '像は、鏡から同じ距離のところにできるので、鏡の向こう 30 cm です。花と像のあいだは 60 cm になります。',
        hint: '像は鏡から、ものと同じ距離のところにできたね。',
      }),
      figureChoice({
        id: 'reflect-2-r3', concept: 'mirror-image',
        prompt: 'ものの先から出た光が鏡で反射して目に届きます。光が鏡で反射する点はア〜ウのどこ？',
        // 鏡 x=200。ものの先 (140,180) → 像 (260,180)。目 (100,60) と像を結ぶ線は鏡の y=135 を通る
        figure: scene([
          { type: 'mirror', x1: 200, y1: 30, x2: 200, y2: 220 },
          { type: 'object', x: 140, y: 210, height: 30, label: 'もの' },
          { type: 'eye', x: 100, y: 60 },
          { type: 'region', id: 'r1', x: 200, y: 70, r: 22, name: 'ア' },
          { type: 'label', x: 162, y: 76, text: 'ア' },
          { type: 'region', id: 'r2', x: 200, y: 135, r: 22, name: 'イ' },
          { type: 'label', x: 162, y: 141, text: 'イ' },
          { type: 'region', id: 'r3', x: 200, y: 190, r: 22, name: 'ウ' },
          { type: 'label', x: 162, y: 196, text: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '鏡の向こうの同じ距離のところに像を考え、像と目を直線で結ぶと、鏡とはイで交わります。光はイで反射して目に届きます。',
        hint: '先に像の位置を決めて、像と目を結んでみよう。',
      }),
      choice({
        id: 'reflect-2-t2', concept: 'mirror-image', term: true,
        prompt: '次の説明に合う言葉はどれ？「反射光を鏡の向こうへまっすぐのばした先に見える、ものの姿」',
        options: ['影', '像', '法線'],
        answer: 'b',
        explanation: '目は光がまっすぐ来たと感じるので、反射光をのばした先にものがあるように見えます。これが**像**です。',
        hint: '鏡に映って見えるものの名前だよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 3: 光の屈折
  // ================================================================
  // 屈折の図の約束: boundary は y より下を lower の物質で塗る。空気→水・ガラスは光源を境界より上（y が小さい）、
  // 水・ガラス→空気は光源を境界より下に置く。屈折の角度は図をそれらしく見せるための目安で、生徒には数値を出さない。
  // 判定は向きだけ（法線に近づく / 離れる）。垂直に入る光は判定で向きが決まらないので ray-draw にしない。

  // ---- ステージ refract-1: 屈折の向き（空気⇄水・ガラス） ----
  const refract1 = {
    id: 'refract-1', areaId: 'refract', title: '屈折の向き', minutes: 5, concepts: ['refract-dir'],
    lessons: [
      {
        id: 'refract-1-c1',
        anim: 'refract-in',
        text: '光が空気から水へななめに進むとき、**境界面**で折れ曲がって進みます。これを光の**屈折**といいます。空気から水やガラスへ進む光は、境界面に垂直な線（**法線**）に近づくように折れ曲がります。',
        // 入射光は法線から 45°、水の中では約 32°（点線はまっすぐ進んだときの道）
        figure: scene([
          { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
          { type: 'normal', x: 140, y: 120, angle: 0 },
          { type: 'ray', x1: 140, y1: 120, x2: 220, y2: 200, dashed: true },
          { type: 'ray', x1: 50, y1: 30, x2: 140, y2: 120, arrow: true },
          { type: 'ray', x1: 140, y1: 120, x2: 202, y2: 220, arrow: true },
          { type: 'label', x: 146, y: 72, text: '法線' },
        ]),
      },
      {
        id: 'refract-1-c2',
        anim: 'refract-out',
        text: '水やガラスから空気へ進む光は、反対に**法線**から離れるように折れ曲がります。光の道すじは逆向きにたどることもできるので、空気から水へ進むときと同じ道すじを、向きだけ逆にして進みます。',
        // 水の中で法線から約 32° → 空気中で 45°（点線はまっすぐ進んだときの道）
        figure: scene([
          { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
          { type: 'normal', x: 140, y: 120, angle: 0 },
          { type: 'ray', x1: 140, y1: 120, x2: 190, y2: 40, dashed: true },
          { type: 'ray', x1: 78, y1: 220, x2: 140, y2: 120, arrow: true },
          { type: 'ray', x1: 140, y1: 120, x2: 230, y2: 30, arrow: true },
          { type: 'label', x: 100, y: 70, text: '法線' },
        ]),
      },
      {
        id: 'refract-1-c3',
        anim: 'vertical-vs-oblique',
        text: '**境界面**に垂直に入る光は、折れ曲がらずにそのまままっすぐ進みます。折れ曲がるのは、ななめに入る光だけです。ガラスと空気の境界面でも、水のときと同じ向きに屈折します。',
        // 左: 垂直に入る光。右: 空気→ガラスでななめに入る光（法線に近づく）
        figure: scene([
          { type: 'boundary', y: 110, upper: 'air', lower: 'glass' },
          { type: 'normal', x: 240, y: 110, angle: 0 },
          { type: 'ray', x1: 110, y1: 20, x2: 110, y2: 220, arrow: true },
          { type: 'ray', x1: 190, y1: 30, x2: 240, y2: 110, arrow: true },
          { type: 'ray', x1: 240, y1: 110, x2: 282, y2: 220, arrow: true },
          { type: 'label', x: 118, y: 70, text: '垂直' },
          { type: 'label', x: 196, y: 24, text: 'ななめ' },
        ]),
      },
    ],
    warmup: choice({
      id: 'refract-1-w1', concept: 'refract-dir',
      prompt: '予想しよう。光が空気から水の中へななめに入るとき、光はどう進むと思う？',
      options: ['向きを変えずにまっすぐ進む', '水面（境界面）で折れ曲がって進む', '水面ですべてはね返る'],
      answer: 'b',
      explanation: '光は、空気と水の境界面で折れ曲がって進みます。どちらに曲がるのかを、このステージで調べよう。',
      hint: '水の入ったコップにさしたストローの見え方を思い出そう。',
    }),
    problems: [
      rayDraw({
        id: 'refract-1-p1', concept: 'refract-dir',
        prompt: '空気中の電球から出た光が、水面に当たりました。水の中へ進む光の道すじを、当たった点から指で引こう。',
        // 光源は境界（y=120）より上の空気中。入射の向き (100,80) は法線から約 51°。
        // 正解例 out (223,220) → 向き (73,100) は法線から約 36°（法線に近づく）。
        // 不正解例 out (300,190) → 向き (150,70) は法線から約 65°（法線から離れる）
        figure: scene([
          { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
          { type: 'normal', x: 150, y: 120, angle: 0 },
          { type: 'ray', x1: 50, y1: 40, x2: 150, y2: 120, arrow: true },
          { type: 'lamp', x: 50, y: 40 },
        ]),
        source: { x: 50, y: 40 },
        hit: { x: 150, y: 120 },
        surface: { kind: 'boundary', y: 120, from: 'air', to: 'water' },
        expected: { kind: 'direction' },
        samples: { correct: { out: { x: 223, y: 220 } }, wrong: { out: { x: 300, y: 190 } } },
        explanation: '空気から水へ進む光は、法線に近づくように折れ曲がります。点線の法線と、入射光をまっすぐのばした線とのあいだを通るように引けていれば大丈夫です。',
        hint: '入射光をそのまままっすぐのばした線より、点線（法線）に近い側へ引こう。',
      }),
      fill({
        id: 'refract-1-t1', concept: 'refract-dir', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '空気と水のように、ちがう物質が接している面を[b1]という。[b1]に垂直な線を[b2]といい、光の折れ曲がる向きはこの線をもとに考える。',
        blanks: [
          word('b1', ['境界面', '法線', '屈折'], '境界面'),
          word('b2', ['境界面', '法線', '屈折'], '法線'),
        ],
        explanation: 'ちがう物質が接している面が**境界面**、境界面に垂直な線が**法線**です。屈折の向きは「法線に近づく」「法線から離れる」で表します。',
        hint: '「境界」は物質と物質のさかい目のこと。もう 1 つは反射のときにも出てきた線だよ。',
      }),
      fill({
        id: 'refract-1-p2', concept: 'refract-dir',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '光がちがう物質の境界面へななめに進むと、境界面で折れ曲がる。これを光の[b1]という。空気からガラスへ進む光は、法線に[b2]ように折れ曲がる。',
        blanks: [
          word('b1', ['反射', '屈折', '直進'], '屈折'),
          word('b2', ['近づく', '離れる'], '近づく'),
        ],
        explanation: '境界面で光が折れ曲がることを屈折といいます。空気から水やガラスへ進むときは、法線に近づくように曲がります。鏡ではね返る「反射」と区別しておこう。',
        hint: '空気から水へ進むときと同じ向きに曲がるよ。',
      }),
      rayDraw({
        id: 'refract-1-p3', concept: 'refract-dir',
        prompt: '水の中の点 A から出た光が、水面に当たりました。空気中へ出ていく光の道すじを、当たった点から指で引こう。',
        // 点 A は境界（y=110）より下の水の中。入射の向き (80,−90) は法線から約 42°。
        // 正解例 out (290,30) → 向き (150,−80) は法線から約 62°（法線から離れる）。
        // 不正解例 out (180,20) → 向き (40,−90) は法線から約 24°（法線に近づく）
        figure: scene([
          { type: 'boundary', y: 110, upper: 'air', lower: 'water' },
          { type: 'normal', x: 140, y: 110, angle: 0 },
          { type: 'ray', x1: 60, y1: 200, x2: 140, y2: 110, arrow: true },
          { type: 'point', x: 60, y: 200 },
          { type: 'label', x: 40, y: 206, text: 'A' },
        ]),
        source: { x: 60, y: 200 },
        hit: { x: 140, y: 110 },
        surface: { kind: 'boundary', y: 110, from: 'water', to: 'air' },
        expected: { kind: 'direction' },
        samples: { correct: { out: { x: 290, y: 30 } }, wrong: { out: { x: 180, y: 20 } } },
        explanation: '水から空気へ進む光は、法線から離れるように折れ曲がります。空気から水へ進むときとは反対の向きです。入射光をまっすぐのばした線より、水面に近い側へ引けていれば大丈夫です。',
        hint: '空気から水へ進むときと反対に、法線から遠ざかる側へ引こう。',
      }),
      figureChoice({
        id: 'refract-1-p4', concept: 'refract-dir',
        prompt: '空気中から、ガラスへななめに光が当たりました。ガラスの中へ進む光は、ア〜ウのどの向きに進む？',
        // 入射の向き (90,80) は法線から約 48°。ア＝法線に近づく（約 30°）、イ＝まっすぐのばした向き、ウ＝法線から離れる（約 71°）
        figure: scene([
          { type: 'boundary', y: 110, upper: 'air', lower: 'glass' },
          { type: 'normal', x: 140, y: 110, angle: 0 },
          { type: 'ray', x1: 50, y1: 30, x2: 140, y2: 110, arrow: true },
          { type: 'lamp', x: 50, y: 30 },
          guide(140, 110, 192, 200),
          guide(140, 110, 241, 200),
          guide(140, 110, 240, 145),
          { type: 'region', id: 'r1', x: 192, y: 200, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 241, y: 200, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 240, y: 145, r: 22, label: 'ウ' },
        ]),
        answer: 'r1',
        explanation: '空気からガラスへ進む光は、法線に近づくように折れ曲がるので、アの向きに進みます。イはまっすぐ進んだときの向き、ウは法線から離れる向きです。水のときと同じ向きに曲がると覚えておこう。',
        hint: '点線の法線に近いのはア〜ウのどれか、比べてみよう。',
      }),
      choice({
        id: 'refract-1-p5', concept: 'refract-dir',
        prompt: '光を水面に垂直に当てました（境界面に垂直に入る光）。水の中で光はどう進む？',
        options: ['法線に近づくように曲がる', '法線から離れるように曲がる', '折れ曲がらずにまっすぐ進む'],
        answer: 'c',
        explanation: '境界面に垂直に入る光は、折れ曲がらずにそのまままっすぐ進みます。屈折して折れ曲がるのは、ななめに入る光です。',
        hint: '垂直に入る光は、はじめから法線と重なっているね。',
      }),
    ],
    retryPool: [
      rayDraw({
        id: 'refract-1-r1', concept: 'refract-dir',
        prompt: '空気中の電球から出た光が、ガラスに当たりました。ガラスの中へ進む光の道すじを、当たった点から指で引こう。',
        // 光源は境界（y=130）より上。入射の向き (90,80) は法線から約 48°。
        // 正解例 out (185,230) → 約 29°（法線に近づく）。不正解例 out (240,160) → 約 75°（法線から離れる）
        figure: scene([
          { type: 'boundary', y: 130, upper: 'air', lower: 'glass' },
          { type: 'normal', x: 130, y: 130, angle: 0 },
          { type: 'ray', x1: 40, y1: 50, x2: 130, y2: 130, arrow: true },
          { type: 'lamp', x: 40, y: 50 },
        ]),
        source: { x: 40, y: 50 },
        hit: { x: 130, y: 130 },
        surface: { kind: 'boundary', y: 130, from: 'air', to: 'glass' },
        expected: { kind: 'direction' },
        samples: { correct: { out: { x: 185, y: 230 } }, wrong: { out: { x: 240, y: 160 } } },
        explanation: '空気からガラスへ進む光は、法線に近づくように折れ曲がります。入射光をまっすぐのばした線と、法線とのあいだへ引けば大丈夫です。',
        hint: '入射光をそのままのばした線より、点線（法線）に近い側へ引こう。',
      }),
      choice({
        id: 'refract-1-r2', concept: 'refract-dir',
        prompt: 'ガラスの中から空気中へ、ななめに光が出ていきます。光は境界面でどう折れ曲がる？',
        options: ['法線に近づくように曲がる', '法線から離れるように曲がる', '必ず全部はね返る'],
        answer: 'b',
        explanation: 'ガラスや水から空気へ進む光は、法線から離れるように折れ曲がります。空気からガラスへ進むときの道すじを、逆向きにたどった形です。',
        hint: '空気からガラスへ進むときの反対を考えよう。',
      }),
      figureChoice({
        id: 'refract-1-r3', concept: 'refract-dir',
        prompt: '水の中の点 A から出た光が、水面に当たりました。空気中へ出た光は、ア〜ウのどの向きに進む？',
        // 入射の向き (70,−80) は法線から約 41°。ア＝法線に近づく（15°）、イ＝まっすぐのばした向き（41°）、ウ＝法線から離れる（66°）
        figure: scene([
          { type: 'boundary', y: 150, upper: 'air', lower: 'water' },
          { type: 'normal', x: 150, y: 150, angle: 0 },
          { type: 'ray', x1: 80, y1: 230, x2: 150, y2: 150, arrow: true },
          { type: 'point', x: 80, y: 230 },
          { type: 'label', x: 40, y: 228, text: 'A' },
          guide(150, 150, 178, 44),
          guide(150, 150, 222, 67),
          guide(150, 150, 250, 105),
          { type: 'region', id: 'r1', x: 178, y: 44, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 222, y: 67, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 250, y: 105, r: 22, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '水から空気へ進む光は、法線から離れるように折れ曲がるので、ウの向きに進みます。アは法線に近づく向き、イはまっすぐ進んだときの向きです。',
        hint: '水から空気へ出るときは、法線から遠ざかる向きに曲がったね。',
      }),
      choice({
        id: 'refract-1-t2', concept: 'refract-dir', term: true,
        prompt: '次の説明に合う言葉はどれ？「光がちがう物質の境界面へななめに進むとき、境界面で折れ曲がること」',
        options: ['反射', '屈折', '全反射'],
        answer: 'b',
        explanation: '光が境界面で折れ曲がることを、光の**屈折**といいます。鏡などではね返る「反射」と区別しましょう。',
        hint: '「折れ曲がる」ことを表す言葉をさがそう。',
      }),
    ],
  };

  // ---- ステージ refract-2: 水中のものの見え方と全反射 ----
  const refract2 = {
    id: 'refract-2', areaId: 'refract', title: '水中のものの見え方と全反射', minutes: 5, concepts: ['refract-view', 'total-reflect'],
    lessons: [
      {
        id: 'refract-2-c1',
        anim: 'coin-lift',
        text: '水の底のコインではね返った光は、水面で法線から離れるように折れ曲がって目に届きます。目は光がまっすぐ来たと感じるので、コインは実際の位置より浮き上がって見えます。',
        // コイン (110,200) → 水面 (160,100)、水の中で約 27° → 空気中で約 37°。
        // 目に届く光を逆にのばした点線と、コインの真上の線の交わる (110,168) が見える位置
        figure: scene([
          { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
          { type: 'ray', x1: 160, y1: 100, x2: 110, y2: 168, dashed: true },
          { type: 'ray', x1: 110, y1: 200, x2: 160, y2: 100, arrow: true },
          { type: 'ray', x1: 160, y1: 100, x2: 205, y2: 39, arrow: true },
          { type: 'eye', x: 214, y: 27 },
          { type: 'point', x: 110, y: 200 },
          { type: 'point', x: 110, y: 168 },
          { type: 'label', x: 50, y: 206, text: 'コイン' },
          { type: 'label', x: 8, y: 172, text: '浮いて見える' },
        ]),
      },
      {
        id: 'refract-2-c2',
        anim: 'stick-lift',
        text: '水に入れた棒をななめ上から見ると、水の中の部分が浮き上がって短く見えます。棒の先からの光が水面で折れ曲がって目に届くためです。ななめに入れた棒が水面で折れて見えるのも、同じ理由です。',
        // 棒の先 (100,210) → 水面 (150,100) → 目。逆にのばした点線が棒と交わる (100,176) が見える位置
        figure: scene([
          { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
          { type: 'object', x: 100, y: 210, height: 170, label: '棒の先' },
          { type: 'ray', x1: 150, y1: 100, x2: 100, y2: 176, dashed: true },
          { type: 'ray', x1: 100, y1: 210, x2: 150, y2: 100, arrow: true },
          { type: 'ray', x1: 150, y1: 100, x2: 188, y2: 42, arrow: true },
          { type: 'eye', x: 196, y: 30 },
          { type: 'point', x: 100, y: 176 },
          { type: 'label', x: 14, y: 182, text: '見える位置' },
        ]),
      },
      {
        id: 'refract-2-c3',
        anim: 'total-reflection',
        text: '水やガラスから空気へ進む光は、入射角が大きくなると、空気中へ出られなくなり、境界面ですべて反射します。これを**全反射**といいます。全反射でも、入射角と反射角は等しくなります。',
        // 水中の光源 (40,200) → 水面 (180,100)。入射角は約 54° と大きいので、空気中へ出ずにすべて反射する
        figure: scene([
          { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
          { type: 'normal', x: 180, y: 100, angle: 0 },
          { type: 'ray', x1: 40, y1: 200, x2: 180, y2: 100, arrow: true },
          { type: 'ray', x1: 180, y1: 100, x2: 290, y2: 179, arrow: true },
          { type: 'lamp', x: 40, y: 200 },
          { type: 'label', x: 60, y: 80, text: 'すべて反射する' },
        ]),
      },
    ],
    warmup: choice({
      id: 'refract-2-w1', concept: 'refract-view',
      prompt: '予想しよう。水を入れたコップの底にコインを置き、ななめ上から見ると、コインはどこにあるように見えると思う？',
      options: ['実際の位置より浮き上がって見える', '実際の位置より深く沈んで見える', '実際と同じ位置に見える'],
      answer: 'a',
      explanation: 'コインは、実際より浮き上がって見えます。光が水面で折れ曲がることと関係があります。このステージで確かめよう。',
      hint: 'お風呂やプールの底が、どう見えるか思い出そう。',
    }),
    problems: [
      figureChoice({
        id: 'refract-2-p1', concept: 'refract-view',
        prompt: '水の底のコインからの光が、水面で折れ曲がって目に届きました。目からは、コインがア〜ウのどこにあるように見える？',
        // コイン (90,210) → 水面 (170,70)、空気中の向き (0.66,−0.75)。目に届く光を逆にのばすと x=90 で y≒161 → イ
        figure: scene([
          { type: 'boundary', y: 70, upper: 'air', lower: 'water' },
          { type: 'ray', x1: 90, y1: 210, x2: 170, y2: 70, arrow: true },
          { type: 'ray', x1: 170, y1: 70, x2: 202, y2: 34, arrow: true },
          { type: 'eye', x: 212, y: 24 },
          { type: 'point', x: 90, y: 210 },
          { type: 'label', x: 118, y: 234, text: 'コイン' },
          { type: 'region', id: 'r1', x: 90, y: 104, r: 22, name: 'ア' },
          { type: 'label', x: 50, y: 110, text: 'ア' },
          { type: 'region', id: 'r2', x: 90, y: 161, r: 22, name: 'イ' },
          { type: 'label', x: 50, y: 167, text: 'イ' },
          { type: 'region', id: 'r3', x: 90, y: 212, r: 22, name: 'ウ' },
          { type: 'label', x: 50, y: 218, text: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '目は、光がまっすぐ来たと感じます。目に届いた光を水の中へまっすぐ逆にのばすと、コインの真上のイを通ります。だから、コインは実際（ウ）より浮き上がったイに見えます。',
        hint: '目に届いた光を、水面から水の中へまっすぐ逆にのばしてみよう。',
      }),
      fill({
        id: 'refract-2-t1', concept: 'total-reflect', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '水やガラスから空気へ進む光は、入射角が大きくなると空気中へ出られず、境界面ですべて反射する。これを[b1]という。',
        blanks: [
          word('b1', ['屈折', '全反射', '反射の法則'], '全反射'),
        ],
        explanation: '入射角が大きくなり、光が空気中へ出られずにすべて反射することを**全反射**といいます。光ファイバーは全反射を利用しています。',
        hint: '「すべて反射する」ことを表す言葉だよ。',
      }),
      choice({
        id: 'refract-2-p2', concept: 'refract-view',
        prompt: '水の入ったプールの底は、実際の深さと比べてどう見える？',
        options: ['実際より深く見える', '実際と同じ深さに見える', '実際より浅く見える'],
        answer: 'c',
        explanation: '底からの光が水面で法線から離れるように折れ曲がって目に届くので、底は浮き上がって見え、プールは実際より浅く見えます。見た目より深いことがあるので、水に入るときは気をつけよう。',
        hint: '水の底のコインが、どう見えたか思い出そう。',
      }),
      rayDraw({
        id: 'refract-2-p3', concept: 'refract-view',
        prompt: '水の底のコインからの光が、水面に当たりました。空気中へ出て目に向かう光の道すじを、当たった点から指で引こう。',
        // コインは境界（y=110）より下。入射の向き (50,−90) は法線から約 29°。
        // 正解例 out (208,19) → 約 41°（法線から離れる）。不正解例 out (150,20) → 約 13°（法線に近づく）
        figure: scene([
          { type: 'boundary', y: 110, upper: 'air', lower: 'water' },
          { type: 'normal', x: 130, y: 110, angle: 0 },
          { type: 'ray', x1: 80, y1: 200, x2: 130, y2: 110, arrow: true },
          { type: 'point', x: 80, y: 200 },
          { type: 'label', x: 18, y: 206, text: 'コイン' },
        ]),
        source: { x: 80, y: 200 },
        hit: { x: 130, y: 110 },
        surface: { kind: 'boundary', y: 110, from: 'water', to: 'air' },
        expected: { kind: 'direction' },
        samples: { correct: { out: { x: 208, y: 19 } }, wrong: { out: { x: 150, y: 20 } } },
        explanation: 'コインからの光は、水から空気へ出るときに法線から離れるように折れ曲がります。この光が目に入るので、コインは浮き上がって見えます。入射光をまっすぐのばした線より、水面に近い側へ引けていれば大丈夫です。',
        hint: '水から空気へ出る光は、法線から遠ざかる側へ曲がったね。',
      }),
      figureChoice({
        id: 'refract-2-p4', concept: 'total-reflect',
        prompt: '水の中の電球から、水面に大きくかたむけて光を当てました（入射角が大きい）。光はア〜ウのどこへ進む？',
        // 入射の向き (140,−100) は法線から約 54°。入射角が大きいので全反射してウへ。
        // ア＝まっすぐのばした向き、イ＝法線に近づく向き（どちらも空気中へ出る）
        figure: scene([
          { type: 'boundary', y: 100, upper: 'air', lower: 'water' },
          { type: 'normal', x: 180, y: 100, angle: 0 },
          { type: 'ray', x1: 40, y1: 200, x2: 180, y2: 100, arrow: true },
          { type: 'lamp', x: 40, y: 200 },
          guide(180, 100, 250, 50),
          guide(180, 100, 200, 28),
          guide(180, 100, 278, 170),
          { type: 'region', id: 'r1', x: 250, y: 50, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 200, y: 28, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 278, y: 170, r: 22, label: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '水から空気へ進む光は、入射角が大きいと空気中へ出られず、水面ですべて反射します（全反射）。だからウへ進みます。このとき、入射角と反射角は等しくなっています。',
        hint: '水から空気へ進む光で、入射角がとても大きいときに起こることを思い出そう。',
      }),
      choice({
        id: 'refract-2-p5', concept: 'total-reflect',
        prompt: '全反射について、正しいものはどれ？',
        options: ['空気から水へ進む光で起こる', '水やガラスから空気へ進む光で、入射角が大きいときに起こる', 'どんな向きの光でも、必ず起こる'],
        answer: 'b',
        explanation: '全反射は、水やガラスから空気へ進む光で、入射角が大きいときに起こります。空気から水へ進む光は、法線に近づくように曲がって水の中へ入るので、全反射は起こりません。',
        hint: '空気中へ「出られなくなる」のは、どちら向きに進む光か考えよう。',
      }),
    ],
    retryPool: [
      choice({
        id: 'refract-2-r1', concept: 'refract-view',
        prompt: '水を入れたコップに、ストローをななめに入れました。横から見ると、ストローはどう見える？',
        options: ['水面のところで折れ曲がって見える', 'まっすぐのまま見える', '水の中の部分が見えなくなる'],
        answer: 'a',
        explanation: '水の中の部分からの光が、水面で折れ曲がって目に届きます。そのため水の中の部分が浮き上がって見え、ストローは水面のところで折れて見えます。',
        hint: '水の中のものは、浮き上がって見えたね。',
      }),
      figureChoice({
        id: 'refract-2-r2', concept: 'refract-view',
        prompt: '水の底のコインからの光が、水面で折れ曲がって目に届きました。目からは、コインがア〜ウのどこにあるように見える？',
        // コイン (100,210) → 水面 (188,70)、空気中の向き (0.71,−0.71)。逆にのばすと x=100 で y≒158 → ウ
        figure: scene([
          { type: 'boundary', y: 70, upper: 'air', lower: 'water' },
          { type: 'ray', x1: 100, y1: 210, x2: 188, y2: 70, arrow: true },
          { type: 'ray', x1: 188, y1: 70, x2: 220, y2: 38, arrow: true },
          { type: 'eye', x: 230, y: 28 },
          { type: 'point', x: 100, y: 210 },
          { type: 'label', x: 128, y: 234, text: 'コイン' },
          { type: 'region', id: 'r1', x: 100, y: 212, r: 22, name: 'ア' },
          { type: 'label', x: 60, y: 218, text: 'ア' },
          { type: 'region', id: 'r2', x: 100, y: 102, r: 22, name: 'イ' },
          { type: 'label', x: 60, y: 108, text: 'イ' },
          { type: 'region', id: 'r3', x: 100, y: 158, r: 22, name: 'ウ' },
          { type: 'label', x: 60, y: 164, text: 'ウ' },
        ]),
        answer: 'r3',
        explanation: '目に届いた光を水の中へまっすぐ逆にのばすと、コインの真上のウを通ります。目は光がまっすぐ来たと感じるので、コインは実際（ア）より浮き上がったウに見えます。',
        hint: '目に届いた光を、水の中へまっすぐ逆にのばしてみよう。',
      }),
      fill({
        id: 'refract-2-r3', concept: 'refract-view',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '水の底のコインは、実際より[b1]見える。コインからの光が、水面で[b2]からだ。',
        blanks: [
          word('b1', ['浮き上がって', '沈んで', '小さく'], '浮き上がって'),
          word('b2', ['折れ曲がる', '止まる', 'すべてはね返る'], '折れ曲がる'),
        ],
        explanation: 'コインからの光は、水面で法線から離れるように折れ曲がって目に届きます。目は光がまっすぐ来たと感じるので、コインは浮き上がって見えます。',
        hint: '水から空気へ出る光は、水面で屈折するね。',
      }),
      choice({
        id: 'refract-2-r4', concept: 'total-reflect',
        prompt: '細いガラスの線（光ファイバー）の中を、光が外へもれずに遠くまで伝わります。これは何を利用している？',
        options: ['光の直進だけ', '全反射', '影ができるしくみ'],
        answer: 'b',
        explanation: '光ファイバーの中の光は、ガラスと外の境界面に大きな入射角で当たり、全反射をくり返して進みます。だから外へもれずに遠くまで届きます。',
        hint: 'ガラスから外へ「出られない」光は、どうなったか思い出そう。',
      }),
      figureChoice({
        id: 'refract-2-r5', concept: 'total-reflect',
        prompt: 'ガラスの中の点 A から、ガラスと空気の境界面に大きくかたむけて光を当てました。光はア〜ウのどこへ進む？',
        // 入射の向き (150,−100) は法線から約 56° と大きい → 全反射してイへ。ア＝まっすぐのばした向き、ウ＝法線に近づく向き
        figure: scene([
          { type: 'boundary', y: 110, upper: 'air', lower: 'glass' },
          { type: 'normal', x: 200, y: 110, angle: 0 },
          { type: 'ray', x1: 50, y1: 210, x2: 200, y2: 110, arrow: true },
          { type: 'point', x: 50, y: 210 },
          { type: 'label', x: 30, y: 216, text: 'A' },
          guide(200, 110, 270, 63),
          guide(200, 110, 290, 170),
          guide(200, 110, 215, 38),
          { type: 'region', id: 'r1', x: 270, y: 63, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 290, y: 170, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 215, y: 38, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'ガラスから空気へ進む光は、入射角が大きいと空気中へ出られず、境界面ですべて反射します。これが全反射なので、光はイへ進みます。',
        hint: '入射角がとても大きいとき、光は空気中へ出られるかな。',
      }),
      choice({
        id: 'refract-2-r6', concept: 'total-reflect',
        prompt: '水の中から水面に向けて光を当て、入射角を少しずつ大きくしていきます。どうなる？',
        options: ['空気中へ出る光が、いつまでも強くなっていく', 'ある大きさをこえると、光が空気中へ出られずに、すべて反射する', '光が水の中で消えてしまう'],
        answer: 'b',
        explanation: '入射角を大きくしていくと、ある大きさをこえたところで、光は空気中へ出られなくなり、水面ですべて反射します。これが全反射です。',
        hint: '全反射が起こるのは、入射角が大きいときだったね。',
      }),
      choice({
        id: 'refract-2-t2', concept: 'total-reflect', term: true,
        prompt: '次の説明に合う言葉はどれ？「水やガラスから空気へ進む光が、境界面で空気中へ出ずに、全部はね返ること」',
        options: ['屈折', '全反射', '直進'],
        answer: 'b',
        explanation: '光が全部はね返ることを**全反射**といいます。水やガラスから空気へ進む光で、入射角が大きいときに起こります。',
        hint: '屈折して出ていく光がなくなり、「全部」反射するよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 4: 凸レンズ
  // ================================================================
  // レンズの図の約束: 物体・光源はレンズの左。lens item は F（左）・F'（右）を cx∓f に描く。
  // 像の位置はレンズの式で計算して図に置くが、生徒には式を出さず「焦点の外 / 内」「焦点距離の 2 倍」で説明する。

  // ---- ステージ lens-1: 焦点と光の集まり方（平行光、焦点距離） ----
  const lens1 = {
    id: 'lens-1', areaId: 'lens', title: '焦点と光の集まり方', minutes: 5, concepts: ['focus'],
    lessons: [
      {
        id: 'lens-1-c1',
        anim: 'lens-parallel-rays',
        text: '**凸レンズ**は、まん中が厚くふくらんだレンズです。**光軸**（レンズの中心を通り、レンズに垂直な線）に平行な光を当てると、光はレンズで屈折して 1 点に集まります。この点を**焦点**といいます。',
        // レンズ cx=160、焦点距離 60 → 焦点 F' (220,120) に平行な光が集まる
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
          { type: 'ray', x1: 20, y1: 80, x2: 160, y2: 80, arrow: true },
          { type: 'ray', x1: 20, y1: 120, x2: 160, y2: 120, arrow: true },
          { type: 'ray', x1: 20, y1: 160, x2: 160, y2: 160, arrow: true },
          { type: 'ray', x1: 160, y1: 80, x2: 280, y2: 160, arrow: true },
          { type: 'ray', x1: 160, y1: 120, x2: 290, y2: 120, arrow: true },
          { type: 'ray', x1: 160, y1: 160, x2: 280, y2: 80, arrow: true },
          { type: 'label', x: 10, y: 112, text: '光軸' },
          { type: 'label', x: 206, y: 166, text: '焦点' },
        ]),
      },
      {
        id: 'lens-1-c2',
        anim: 'focal-length',
        text: 'レンズの中心から焦点までの距離を、**焦点距離**といいます。焦点はレンズの両側に 1 つずつあり、どちらも同じ焦点距離のところにあります。ふくらみの大きいレンズほど、焦点距離は短くなります。',
        // 焦点 F (100,110)・F' (220,110)。下の点線と青い点で、中心から両側の焦点までの距離を示す
        figure: scene([
          { type: 'axis', y: 110 },
          { type: 'lens', cx: 160, cy: 110, height: 140, f: 60 },
          { type: 'ray', x1: 20, y1: 70, x2: 160, y2: 70, arrow: true },
          { type: 'ray', x1: 160, y1: 70, x2: 280, y2: 150, arrow: true },
          { type: 'normal', x: 160, y: 212, angle: 90 },
          { type: 'point', x: 100, y: 212 },
          { type: 'point', x: 160, y: 212 },
          { type: 'point', x: 220, y: 212 },
          { type: 'label', x: 96, y: 203, text: '焦点距離' },
          { type: 'label', x: 164, y: 236, text: '焦点距離' },
        ]),
      },
      {
        id: 'lens-1-c3',
        anim: 'lens-special-rays',
        text: 'レンズの中心を通る光は、屈折せずにそのまままっすぐ進みます。また、**焦点**を通ってからレンズに入った光は、レンズで屈折したあと、光軸に平行に進みます。',
        // 中心を通る光: (40,60) → (160,120) → (280,180)。焦点 F (100,120) を通る光: (60,150) → (160,75) → 光軸に平行
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
          { type: 'ray', x1: 40, y1: 60, x2: 160, y2: 120, arrow: true },
          { type: 'ray', x1: 160, y1: 120, x2: 280, y2: 180, arrow: true },
          { type: 'ray', x1: 60, y1: 150, x2: 160, y2: 75, arrow: true },
          { type: 'ray', x1: 160, y1: 75, x2: 300, y2: 75, arrow: true },
          { type: 'label', x: 200, y: 214, text: 'まっすぐ' },
          { type: 'label', x: 196, y: 64, text: '光軸に平行' },
        ]),
      },
    ],
    warmup: choice({
      id: 'lens-1-w1', concept: 'focus',
      prompt: '予想しよう。虫めがね（凸レンズ）で日光を紙に当て、レンズと紙の距離を変えていくと、どうなると思う？',
      options: ['光はいつも広がったままで、紙全体が暗くなる', 'ある距離で光が小さな点に集まり、明るくなる', '距離を変えても何も変わらない'],
      answer: 'b',
      explanation: 'ある距離で、光が小さな明るい点に集まります。その点が「焦点」です。目を傷めるので、レンズで太陽を直接見てはいけません。レンズで集めた日光は紙をこがすほど熱くなるので、目や手に向けないようにしましょう。',
      hint: '虫めがねで光を集めて遊んだときのことを思い出そう。',
    }),
    problems: [
      rayDraw({
        id: 'lens-1-p1', concept: 'focus',
        prompt: '光軸に平行な光が、凸レンズに当たりました。レンズを通ったあとの光の道すじを、当たった点から指で引こう。',
        // レンズ cx=160, cy=120, f=60 → 焦点 F' (220,120)。正解例 out (280,160) は (160,80)→(220,120) の直線上。
        // 不正解例 out (280,80) はまっすぐのまま（焦点から 40px はなれる）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
          { type: 'ray', x1: 20, y1: 80, x2: 160, y2: 80, arrow: true },
        ]),
        source: { x: 20, y: 80 },
        hit: { x: 160, y: 80 },
        surface: { kind: 'lens', cx: 160, cy: 120, f: 60 },
        expected: { kind: 'lens', ray: 'parallel' },
        samples: { correct: { out: { x: 280, y: 160 } }, wrong: { out: { x: 280, y: 80 } } },
        explanation: '光軸に平行な光は、レンズで屈折して、反対側の焦点 F\' を通ります。当たった点と F\' を結ぶ直線をのばせば大丈夫です。',
        hint: 'レンズの右側にある焦点 F\' を通るように引こう。',
      }),
      fill({
        id: 'lens-1-t1', concept: 'focus', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'レンズの中心を通り、レンズに垂直な線を[b1]という。[b1]に平行な光が凸レンズを通って集まる点を[b2]という。',
        blanks: [
          word('b1', ['光軸', '焦点', '焦点距離'], '光軸'),
          word('b2', ['光軸', '焦点', '焦点距離'], '焦点'),
        ],
        explanation: 'レンズの中心を通りレンズに垂直な線が**光軸**、光軸に平行な光が凸レンズで屈折して集まる点が**焦点**です。',
        hint: '「軸」は中心を通る線、もう 1 つは光が集まる「点」だよ。',
      }),
      drag({
        id: 'lens-1-p2', concept: 'focus',
        prompt: '光軸に平行な光が凸レンズを通りました。光がいちばん小さな点に集まる位置まで、スクリーンを左右に動かそう。',
        // レンズ cx=130、焦点距離 70 → 光が集まる点（焦点）は x=200。
        // レンズを出た光は途中までだけ描く（向きをのばして集まる点を考える）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 130, cy: 120, height: 140 },
          { type: 'ray', x1: 20, y1: 80, x2: 130, y2: 80, arrow: true },
          { type: 'ray', x1: 20, y1: 120, x2: 130, y2: 120, arrow: true },
          { type: 'ray', x1: 20, y1: 160, x2: 130, y2: 160, arrow: true },
          { type: 'ray', x1: 130, y1: 80, x2: 165, y2: 100, arrow: true },
          { type: 'ray', x1: 130, y1: 120, x2: 165, y2: 120, arrow: true },
          { type: 'ray', x1: 130, y1: 160, x2: 165, y2: 140, arrow: true },
          { type: 'screen', id: 'scr', x: 270, y1: 40, y2: 200 },
        ]),
        draggable: { itemId: 'scr', axis: 'x' },
        target: { x: 200, y: 120 },
        samples: { correct: { x: 200, y: 120 }, wrong: { x: 250, y: 120 } },
        explanation: 'レンズを出た光の向きをのばすと、レンズの右側の 1 点で集まります。ここが焦点です。スクリーンを焦点に置くと、光がいちばん小さく明るい点になります。',
        hint: 'レンズを出た 3 本の光をまっすぐのばして、交わるところをさがそう。',
      }),
      choice({
        id: 'lens-1-p3', concept: 'focus',
        prompt: '「焦点距離」とは、どこからどこまでの距離？',
        options: ['レンズの厚いところの厚さ', 'レンズの中心から焦点まで', 'レンズからいちばん遠くのスクリーンまで'],
        answer: 'b',
        explanation: '焦点距離は、レンズの中心から焦点までの距離です。焦点はレンズの両側にあり、どちらも同じ焦点距離のところにあります。',
        hint: '名前のとおり「焦点」までの距離だよ。どこから測るか考えよう。',
      }),
      figureChoice({
        id: 'lens-1-p4', concept: 'focus',
        prompt: 'レンズの中心に向かって光が進んでいます。レンズを通ったあと、光はア〜ウのどの向きに進む？',
        // 入射の向き (120,60)。中心を通る光はまっすぐ進むので (262,176) のイ。ア (270,120)＝光軸に平行、ウ＝下へ大きく曲がる
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 150, cy: 120, height: 140, f: 60 },
          { type: 'ray', x1: 30, y1: 60, x2: 150, y2: 120, arrow: true },
          guide(150, 120, 270, 120),
          guide(150, 120, 262, 176),
          guide(150, 120, 215, 205),
          { type: 'region', id: 'r1', x: 270, y: 120, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 262, y: 176, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 215, y: 205, r: 22, label: 'ウ' },
        ]),
        answer: 'r2',
        explanation: 'レンズの中心を通る光は、屈折せずにそのまままっすぐ進みます。入射光をまっすぐのばした向きのイです。アのように光軸に平行になるのは、焦点を通ってからレンズに入った光です。',
        hint: '入射光をそのまままっすぐのばすと、どこへ行くかな。',
      }),
      fill({
        id: 'lens-1-p5', concept: 'focus',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '光軸に平行な光は、凸レンズを通ると[b1]に集まる。レンズの中心から[b1]までの距離を[b2]という。',
        blanks: [
          word('b1', ['焦点', '光源', '像'], '焦点'),
          word('b2', ['焦点距離', '入射角', '光の道すじ'], '焦点距離'),
        ],
        explanation: '光軸に平行な光は、凸レンズで屈折して焦点に集まります。レンズの中心から焦点までの距離が焦点距離です。',
        hint: '虫めがねで日光を集めた明るい点の名前を思い出そう。',
      }),
    ],
    retryPool: [
      rayDraw({
        id: 'lens-1-r1', concept: 'focus',
        prompt: '光軸の下を、光軸に平行に進む光が凸レンズに当たりました。レンズを通ったあとの光の道すじを引こう。',
        // レンズ cx=150, cy=120, f=70 → 焦点 F' (220,120)。正解例 out (290,70) は (150,170)→(220,120) の直線上。
        // 不正解例 out (290,170) はまっすぐのまま（焦点から 50px）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 150, cy: 120, height: 140, f: 70 },
          { type: 'ray', x1: 20, y1: 170, x2: 150, y2: 170, arrow: true },
        ]),
        source: { x: 20, y: 170 },
        hit: { x: 150, y: 170 },
        surface: { kind: 'lens', cx: 150, cy: 120, f: 70 },
        expected: { kind: 'lens', ray: 'parallel' },
        samples: { correct: { out: { x: 290, y: 70 } }, wrong: { out: { x: 290, y: 170 } } },
        explanation: '光軸の下を通る光も、光軸に平行なら、レンズで屈折して反対側の焦点 F\' を通ります。今度は上向きに曲がって F\' を通ればよいです。',
        hint: '当たった点から、右側の焦点 F\' を通る線を引こう。',
      }),
      choice({
        id: 'lens-1-r2', concept: 'focus',
        prompt: '虫めがねで日光を集めて、紙の上の光をいちばん小さく明るい点にしたい。紙はどこに置けばよい？',
        options: ['レンズにぴったりくっつける', 'レンズの焦点の位置', 'できるだけレンズから遠く'],
        answer: 'b',
        explanation: '日光はほぼ平行な光なので、レンズを通ると焦点に集まります。紙を焦点の位置に置くと、光がいちばん小さく明るい点になります。レンズで集めた日光は紙をこがすほど熱くなるので、目や手に向けないようにしましょう。',
        hint: '平行な光が集まる点の名前を思い出そう。',
      }),
      drag({
        id: 'lens-1-r3', concept: 'focus',
        prompt: '光軸に平行な光が凸レンズを通りました。光が 1 点に集まる位置まで、スクリーンを左右に動かそう。',
        // レンズ cx=110、焦点距離 60 → 光が集まる点（焦点）は x=170
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 110, cy: 120, height: 140 },
          { type: 'ray', x1: 20, y1: 85, x2: 110, y2: 85, arrow: true },
          { type: 'ray', x1: 20, y1: 120, x2: 110, y2: 120, arrow: true },
          { type: 'ray', x1: 20, y1: 155, x2: 110, y2: 155, arrow: true },
          { type: 'ray', x1: 110, y1: 85, x2: 140, y2: 102.5, arrow: true },
          { type: 'ray', x1: 110, y1: 120, x2: 140, y2: 120, arrow: true },
          { type: 'ray', x1: 110, y1: 155, x2: 140, y2: 137.5, arrow: true },
          { type: 'screen', id: 'scr', x: 270, y1: 40, y2: 200 },
        ]),
        draggable: { itemId: 'scr', axis: 'x' },
        target: { x: 170, y: 120 },
        samples: { correct: { x: 170, y: 120 }, wrong: { x: 230, y: 120 } },
        explanation: 'レンズを出た光の向きをのばすと、1 点で交わります。そこが焦点です。スクリーンを焦点に置くと、光がいちばん小さく集まります。',
        hint: 'レンズを出た光をまっすぐのばして、交わるところをさがそう。',
      }),
      choice({
        id: 'lens-1-t2', concept: 'focus', term: true,
        prompt: '次の説明に合う言葉はどれ？「まん中が厚くふくらんでいて、光軸に平行な光を 1 点に集めるレンズ」',
        options: ['凸レンズ', '焦点', '光軸'],
        answer: 'a',
        explanation: 'まん中が厚くふくらんだレンズを**凸レンズ**といいます。「凸」は、まん中が出っぱった形を表す字です。',
        hint: 'レンズの形を表す字に注目しよう。',
      }),
    ],
  };

  // ---- ステージ lens-2: 実像と虚像（物体の位置と像の位置・大きさ） ----
  const lens2 = {
    id: 'lens-2', areaId: 'lens', title: '実像と虚像', minutes: 6, concepts: ['lens-image'],
    lessons: [
      {
        id: 'lens-2-c1',
        anim: 'real-image-forms',
        text: '物体を焦点より外側に置くと、レンズを通った光が反対側で集まり、スクリーンに像が映ります。この像を**実像**といいます。実像は、物体と上下左右が逆向きになります。',
        // f=40、レンズ cx=160。物体 x=40（レンズから 120）→ 実像 x=220（レンズから 60）、大きさ半分で逆向き
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 40 },
          { type: 'screen', x: 220, y1: 40, y2: 200 },
          { type: 'ray', x1: 40, y1: 70, x2: 160, y2: 70, arrow: true },
          { type: 'ray', x1: 160, y1: 70, x2: 220, y2: 145, arrow: true },
          { type: 'ray', x1: 40, y1: 70, x2: 220, y2: 145, arrow: true },
          { type: 'object', x: 40, y: 120, height: 50, label: '物体' },
          { type: 'object', x: 220, y: 120, height: -25 },
          { type: 'label', x: 232, y: 176, text: '実像' },
        ]),
      },
      {
        id: 'lens-2-c2',
        anim: 'image-size-by-distance',
        text: '物体を焦点距離の 2 倍の位置に置くと、反対側の焦点距離の 2 倍の位置に、物体と同じ大きさの**実像**ができます。物体をそれより遠くにすると像は小さく、焦点に近づけると像は大きくなります。',
        // f=40、レンズ cx=160。物体 x=80（レンズから 80 = 焦点距離の 2 倍）→ 実像 x=240、同じ大きさ
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 40 },
          { type: 'screen', x: 240, y1: 40, y2: 200 },
          { type: 'ray', x1: 80, y1: 80, x2: 160, y2: 80, arrow: true },
          { type: 'ray', x1: 160, y1: 80, x2: 240, y2: 160, arrow: true },
          { type: 'ray', x1: 80, y1: 80, x2: 240, y2: 160, arrow: true },
          { type: 'object', x: 80, y: 120, height: 40, label: '物体' },
          { type: 'object', x: 240, y: 120, height: -40 },
          { type: 'label', x: 196, y: 222, text: '同じ大きさ' },
        ]),
      },
      {
        id: 'lens-2-c3',
        anim: 'virtual-image',
        text: '物体を焦点より内側に置くと、スクリーンに像はできません。レンズをのぞくと、物体より大きな像が同じ向きに見えます。これを**虚像**といいます。虫めがねで文字が大きく見えるのは虚像です。',
        // f=50、レンズ cx=170。物体 x=140（レンズから 30、焦点の内側）→ 虚像 x=95、2.5 倍で同じ向き。
        // レンズを出た光を逆にのばした点線が、虚像の先 (95,45) で交わる
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 170, cy: 120, height: 140, f: 50 },
          { type: 'object', x: 95, y: 120, height: 75 },
          { type: 'ray', x1: 170, y1: 90, x2: 95, y2: 45, dashed: true },
          { type: 'ray', x1: 170, y1: 120, x2: 95, y2: 45, dashed: true },
          { type: 'ray', x1: 140, y1: 90, x2: 170, y2: 90, arrow: true },
          { type: 'ray', x1: 170, y1: 90, x2: 290, y2: 162, arrow: true },
          { type: 'ray', x1: 140, y1: 90, x2: 250, y2: 200, arrow: true },
          { type: 'object', x: 140, y: 120, height: 30 },
          { type: 'eye', x: 300, y: 190 },
          { type: 'label', x: 112, y: 166, text: '物体' },
          { type: 'label', x: 62, y: 166, text: '虚像' },
        ]),
      },
    ],
    warmup: choice({
      id: 'lens-2-w1', concept: 'lens-image',
      prompt: '予想しよう。虫めがねを持った手をのばし、遠くの景色をのぞくと、どう見えると思う？',
      options: ['大きく、同じ向きに見える', '上下左右が逆さまに見える', '何も見えなくなる'],
      answer: 'b',
      explanation: '遠くの景色は、上下左右が逆さまに見えます。近くの文字が大きく見えるときとは、像のでき方がちがいます。このステージで調べよう。',
      hint: '物体がレンズから遠いか近いかで、見え方が変わるよ。',
    }),
    problems: [
      rayDraw({
        id: 'lens-2-p1', concept: 'lens-image',
        prompt: '物体の先から、レンズの中心に向かう光があります。レンズを通ったあとの光の道すじを、当たった点から指で引こう。',
        // レンズ cx=170, cy=120, f=50。入射の向き (110,50)。正解例 out (280,170) は同じ向き（まっすぐ）。
        // 不正解例 out (280,120) は光軸に平行（約 24° ずれる）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 170, cy: 120, height: 140, f: 50 },
          { type: 'object', x: 60, y: 120, height: 50, label: '物体' },
          { type: 'ray', x1: 60, y1: 70, x2: 170, y2: 120, arrow: true },
        ]),
        source: { x: 60, y: 70 },
        hit: { x: 170, y: 120 },
        surface: { kind: 'lens', cx: 170, cy: 120, f: 50 },
        expected: { kind: 'lens', ray: 'center' },
        samples: { correct: { out: { x: 280, y: 170 } }, wrong: { out: { x: 280, y: 120 } } },
        explanation: 'レンズの中心を通る光は、屈折せずにそのまままっすぐ進みます。入射光をまっすぐのばした線を引けば大丈夫です。この光は、像の先の位置を決めるのに使えます。',
        hint: '入射光を、向きを変えずにそのままのばそう。',
      }),
      fill({
        id: 'lens-2-t1', concept: 'lens-image', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'スクリーンに映る像を[b1]、スクリーンには映らず、レンズをのぞくと見える像を[b2]という。',
        blanks: [
          word('b1', ['実像', '虚像', '影'], '実像'),
          word('b2', ['実像', '虚像', '影'], '虚像'),
        ],
        explanation: 'レンズを通った光が実際に集まってスクリーンに映る像が**実像**、光が実際には集まらずスクリーンには映らないが、レンズをのぞくと見える像が**虚像**です。',
        hint: '光が「実際に」集まってできるのはどちらか考えよう。',
      }),
      drag({
        id: 'lens-2-p2', concept: 'lens-image',
        prompt: 'スクリーンは、レンズから焦点距離の 2 倍の位置にあります。スクリーンに物体と同じ大きさのはっきりした像が映るように、物体を左右に動かして置こう。',
        // f=60、レンズ cx=160 → F (100,120)・F' (220,120)。スクリーン x=280（レンズから 120 = 焦点距離の 2 倍）
        // → 物体は反対側の 2 倍の x=40。許容 16px は約 0.27f（物体がレンズから 1.73f〜2.27f）。
        // 物体の初期位置 x=76 はレンズから 84 = 1.4f（target から 36px はなれる。「物体」の文字が F の文字と重ならない位置）。
        // 不正解例 x=100 は焦点 F の上（光が平行に出て像ができない。target から 60px はなれる）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
          { type: 'screen', x: 280, y1: 40, y2: 200 },
          { type: 'object', id: 'obj', x: 76, y: 120, height: 40, label: '物体' },
        ]),
        draggable: { itemId: 'obj', axis: 'x' },
        target: { x: 40, y: 120 },
        samples: { correct: { x: 40, y: 120 }, wrong: { x: 100, y: 120 } },
        explanation: '物体を焦点距離の 2 倍の位置に置くと、反対側の焦点距離の 2 倍の位置に、同じ大きさで逆向きの実像ができます。レンズから F までの長さの 2 倍のところに置けていれば大丈夫です。',
        hint: 'スクリーンはレンズから F\' までの 2 倍の位置。物体も、反対側で同じように考えよう。',
      }),
      choice({
        id: 'lens-2-p3', concept: 'lens-image',
        prompt: '物体を凸レンズの焦点より内側（レンズと焦点のあいだ）に置きました。どうなる？',
        options: ['スクリーンに、逆向きの実像が映る', 'スクリーンには像が映らず、レンズをのぞくと大きな虚像が見える', '物体はどこからも見えなくなる'],
        answer: 'b',
        explanation: '物体が焦点の内側にあると、レンズを通った光は集まらないので、スクリーンに像は映りません。レンズをのぞくと、物体より大きく同じ向きの虚像が見えます。虫めがねで文字を見るときと同じです。',
        hint: '虫めがねで近くの文字を見たときを思い出そう。',
      }),
      rayDraw({
        id: 'lens-2-p4', concept: 'lens-image',
        prompt: '物体の先から出て、焦点 F を通ってレンズに当たる光があります。レンズを通ったあとの光の道すじを引こう。',
        // レンズ cx=170, cy=120, f=50 → F (120,120)。物体の先 (60,90) と F を結ぶ線はレンズで (170,145)。
        // 正解例 out (290,145) は光軸に平行。不正解例 out (290,205) はまっすぐのまま（約 27° ずれる）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 170, cy: 120, height: 140, f: 50 },
          { type: 'object', x: 60, y: 120, height: 30, label: '物体' },
          { type: 'ray', x1: 60, y1: 90, x2: 170, y2: 145, arrow: true },
        ]),
        source: { x: 60, y: 90 },
        hit: { x: 170, y: 145 },
        surface: { kind: 'lens', cx: 170, cy: 120, f: 50 },
        expected: { kind: 'lens', ray: 'focus' },
        samples: { correct: { out: { x: 290, y: 145 } }, wrong: { out: { x: 290, y: 205 } } },
        explanation: '焦点を通ってからレンズに入った光は、屈折したあと光軸に平行に進みます。点線の光軸と平行な、横向きの線を引けば大丈夫です。',
        hint: '光軸（横の線）と平行になるように引こう。',
      }),
      fill({
        id: 'lens-2-p5', concept: 'lens-image',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '物体を焦点の外側に置くと、スクリーンに[b1]が映る。その向きは、物体と上下左右が[b2]になる。',
        blanks: [
          word('b1', ['実像', '虚像', '影'], '実像'),
          word('b2', ['同じ', '逆'], '逆'),
        ],
        explanation: '焦点の外側の物体からの光は、レンズを通ると反対側で集まり、スクリーンに実像ができます。実像は、物体と上下左右が逆向きです。',
        hint: 'スクリーンに映る像と、のぞくと見える像の名前のちがいを思い出そう。',
      }),
    ],
    retryPool: [
      rayDraw({
        id: 'lens-2-r1', concept: 'lens-image',
        prompt: '物体の先から、光軸に平行に進む光があります。レンズを通ったあとの光の道すじを引こう。',
        // レンズ cx=160, cy=120, f=50 → F' (210,120)。正解例 out (285,180) は (160,80)→(210,120) の直線上。
        // 不正解例 out (285,80) はまっすぐのまま
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 50 },
          { type: 'object', x: 50, y: 120, height: 40, label: '物体' },
          { type: 'ray', x1: 50, y1: 80, x2: 160, y2: 80, arrow: true },
        ]),
        source: { x: 50, y: 80 },
        hit: { x: 160, y: 80 },
        surface: { kind: 'lens', cx: 160, cy: 120, f: 50 },
        expected: { kind: 'lens', ray: 'parallel' },
        samples: { correct: { out: { x: 285, y: 180 } }, wrong: { out: { x: 285, y: 80 } } },
        explanation: '光軸に平行な光は、レンズで屈折して反対側の焦点 F\' を通ります。この光と、レンズの中心を通る光が交わるところに、像の先ができます。',
        hint: '右側の焦点 F\' を通るように引こう。',
      }),
      choice({
        id: 'lens-2-r2', concept: 'lens-image',
        prompt: '物体を、凸レンズから焦点距離の 2 倍の位置に置きました。スクリーンにできる実像の大きさは？',
        options: ['物体より大きい', '物体と同じ大きさ', '物体より小さい'],
        answer: 'b',
        explanation: '焦点距離の 2 倍の位置に物体を置くと、反対側の焦点距離の 2 倍の位置に、物体と同じ大きさの実像ができます。向きは上下左右が逆です。',
        hint: '「焦点距離の 2 倍」は、像の大きさがちょうど変わり目になる位置だったね。',
      }),
      drag({
        id: 'lens-2-r3', concept: 'lens-image',
        prompt: 'スクリーンは、レンズから焦点距離の 2 倍の位置にあります。スクリーンにはっきりした像が映るように、物体を左右に動かして置こう。',
        // f=50、レンズ cx=150。スクリーン x=250（レンズから 100 = 焦点距離の 2 倍）→ 物体は x=50。不正解例 x=80（2 倍より焦点寄り。像はスクリーンより遠くにできる）
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 150, cy: 120, height: 140, f: 50 },
          { type: 'screen', x: 250, y1: 40, y2: 200 },
          { type: 'object', id: 'obj', x: 20, y: 120, height: 40, label: '物体' },
        ]),
        draggable: { itemId: 'obj', axis: 'x' },
        target: { x: 50, y: 120 },
        samples: { correct: { x: 50, y: 120 }, wrong: { x: 80, y: 120 } },
        explanation: 'スクリーンが焦点距離の 2 倍の位置にあるので、物体も反対側の焦点距離の 2 倍の位置に置くと、はっきりした実像が映ります。像は物体と同じ大きさで逆向きです。',
        hint: 'レンズから F までの長さの 2 倍のところをさがそう。',
      }),
      choice({
        id: 'lens-2-t2', concept: 'lens-image', term: true,
        prompt: '次の説明に合う言葉はどれ？「物体を焦点より内側に置いて、レンズをのぞいたときに見える、物体より大きく同じ向きの像」',
        options: ['実像', '虚像', '影'],
        answer: 'b',
        explanation: '物体を焦点より内側に置くと、スクリーンに像はできず、レンズをのぞくと大きな**虚像**が見えます。虫めがねで文字が大きく見えるのも虚像です。',
        hint: 'スクリーンに映らない像のほうだよ。',
      }),
    ],
  };

  // ================================================================
  // 領域 5: ミニプリント（先生のミニプリントの問題を書き直したもの。共通指示 .ai-tasks/20261106-130000_ミニプリント反映_共通.md）
  // カードは光の単元の決まり（3 枚・60〜120 字・用語つき）、problems[1] は用語の fill にそろえる
  // ================================================================

  // 鏡で反射する光と、角の名前を選ぶ場所（ア 入射角・イ 入射光と鏡のあいだの角・ウ 反射角）
  const MIRROR_ANGLES = scene([
    { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
    { type: 'normal', x: 160, y: 120, angle: 0 },
    { type: 'ray', x1: 70, y1: 80, x2: 160, y2: 180, arrow: true },
    { type: 'ray', x1: 160, y1: 180, x2: 250, y2: 80, arrow: true },
    { type: 'label', x: 166, y: 54, text: '法線' },
    { type: 'label', x: 140, y: 222, text: '鏡' },
    { type: 'region', id: 'r1', x: 134, y: 110, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 91, y: 152, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 186, y: 110, r: 22, label: 'ウ' },
  ]);

  // 空気からガラスへの屈折と、角を選ぶ場所（ア 入射角・イ 屈折角・ウ 屈折した光と境界面のあいだの角）
  const REFRACT_ANGLES = scene([
    { type: 'boundary', y: 120, upper: 'air', lower: 'glass' },
    { type: 'normal', x: 160, y: 120, angle: 0 },
    { type: 'ray', x1: 70, y1: 20, x2: 160, y2: 120, arrow: true },
    { type: 'ray', x1: 160, y1: 120, x2: 215, y2: 230, arrow: true },
    { type: 'region', id: 'r1', x: 135, y: 55, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 176, y: 188, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 222, y: 157, r: 22, label: 'ウ' },
  ]);

  // 凸レンズ（cx 160, f 60）に光軸に平行な光 2 本。ア 焦点・イ 光軸・ウ レンズの中心
  const LENS_PARTS = scene([
    { type: 'axis', y: 120 },
    { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
    { type: 'ray', x1: 20, y1: 76, x2: 160, y2: 76, arrow: true },
    { type: 'ray', x1: 20, y1: 164, x2: 160, y2: 164, arrow: true },
    { type: 'ray', x1: 160, y1: 76, x2: 290, y2: 171, arrow: true },
    { type: 'ray', x1: 160, y1: 164, x2: 290, y2: 69, arrow: true },
    { type: 'region', id: 'r1', x: 220, y: 120, r: 22, label: 'ア' },
    { type: 'region', id: 'r2', x: 60, y: 120, r: 22, label: 'イ' },
    { type: 'region', id: 'r3', x: 160, y: 214, r: 22, label: 'ウ' },
    { type: 'line', points: [[160, 192], [160, 196]], color: 'blue', width: 2 },
  ]);

  // 凸レンズの作図（lens cx 160, f 50、物体 x 60・高さ 50。焦点距離の 2 倍の位置）。rays で 2 本の光をかく
  function lensDrawScene(rays) {
    const items = [
      { type: 'axis', y: 120 },
      { type: 'lens', cx: 160, cy: 120, height: 150, f: 50 },
      { type: 'object', x: 60, y: 120, height: 50, label: '物体' },
    ];
    if (rays === 'center') items.push({ type: 'ray', x1: 60, y1: 70, x2: 160, y2: 120, arrow: true });
    if (rays === 'parallel') items.push({ type: 'ray', x1: 60, y1: 70, x2: 160, y2: 70, arrow: true });
    if (rays === 'both') {
      items.push({ type: 'ray', x1: 60, y1: 70, x2: 160, y2: 120 });
      items.push({ type: 'ray', x1: 160, y1: 120, x2: 290, y2: 185, arrow: true });
      items.push({ type: 'ray', x1: 60, y1: 70, x2: 160, y2: 70 });
      items.push({ type: 'ray', x1: 160, y1: 70, x2: 290, y2: 200, arrow: true });
    }
    return items;
  }

  // ---- ステージ light-mp1: プリント 1（ものが見えるとは・光の反射の法則・光の反射の作図） ----
  const lightMp1 = {
    id: 'light-mp1', areaId: 'light-miniprint', title: 'プリント 1: ものの見え方と光の反射', minutes: 6, concepts: ['straight', 'reflect-law'],
    lessons: [
      {
        id: 'light-mp1-c1',
        text: '太陽や電球のように、自ら光を出しているものを**光源**といいます。光源から出た光は、四方八方にまっすぐ進みます。光源が見えるのは、光源からの光が直接目に入るからです。',
        figure: scene([
          { type: 'lamp', x: 70, y: 120 },
          { type: 'ray', x1: 90, y1: 120, x2: 250, y2: 120, arrow: true },
          { type: 'ray', x1: 86, y1: 104, x2: 180, y2: 40, arrow: true },
          { type: 'ray', x1: 86, y1: 136, x2: 180, y2: 200, arrow: true },
          { type: 'ray', x1: 54, y1: 104, x2: 20, y2: 60, arrow: true },
          { type: 'ray', x1: 54, y1: 136, x2: 20, y2: 180, arrow: true },
          { type: 'eye', x: 275, y: 120 },
          { type: 'label', x: 40, y: 224, text: '光源（電球）' },
          { type: 'label', x: 200, y: 160, text: '目' },
        ]),
      },
      {
        id: 'light-mp1-c2',
        text: '本やりんごのように光を出さないものが見えるのは、光源からの光がものの表面で**反射**して、その光が目に入るからです。反射した光も、まっすぐに進みます。',
        figure: scene([
          { type: 'lamp', x: 50, y: 50 },
          { type: 'circle', x: 150, y: 160, r: 26, fill: 'red' },
          { type: 'ray', x1: 62, y1: 62, x2: 132, y2: 140, arrow: true },
          { type: 'ray', x1: 172, y1: 148, x2: 262, y2: 98, arrow: true },
          { type: 'eye', x: 280, y: 90 },
          { type: 'label', x: 120, y: 214, text: 'りんご' },
          { type: 'label', x: 200, y: 160, text: '反射した光' },
        ]),
      },
      {
        id: 'light-mp1-c3',
        text: '鏡に当たる光を**入射光**、はね返った光を**反射光**といいます。法線と入射光のなす角が**入射角**、法線と反射光のなす角が**反射角**で、2 つの角はいつも等しくなります。',
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 70, y1: 80, x2: 160, y2: 180, arrow: true },
          { type: 'ray', x1: 160, y1: 180, x2: 250, y2: 80, arrow: true },
          { type: 'label', x: 30, y: 70, text: '入射光' },
          { type: 'label', x: 236, y: 70, text: '反射光' },
          { type: 'label', x: 96, y: 128, text: '入射角' },
          { type: 'label', x: 172, y: 128, text: '反射角' },
        ]),
      },
    ],
    warmup: choice({
      id: 'light-mp1-w1', concept: 'straight',
      prompt: '予想しよう。自分では光を出さないりんごが見えるのは、なぜだと思う？',
      options: ['りんごが少しだけ光を出しているから', '光源からの光がりんごで反射して、目に入るから', '目から光が出て、りんごに当たるから'],
      answer: 'b',
      explanation: '電灯や太陽の光がりんごの表面で反射し、その光が目に入るので、りんごが見えます。暗やみでりんごが見えないのは、反射する光がないからです。',
      hint: '真っ暗な部屋では、りんごは見えるかな。',
    }),
    problems: [
      fill({
        id: 'light-mp1-p1', concept: 'straight',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '光源から出た光は、四方八方に[b1]進む。これを光の[b2]という。光源が見えるのは、光源からの光が[b3]目に入っているからである。',
        blanks: [
          word('b1', ['まっすぐに', '曲がりながら'], 'まっすぐに'),
          word('b2', ['直進', '反射', '屈折'], '直進'),
          word('b3', ['直接', '鏡で反射して'], '直接'),
        ],
        explanation: '光はまっすぐに進みます（光の直進）。電球や太陽のような光源は、光源からの光が直接目に入るので見えます。',
        hint: '電球を見るとき、光はどこから目に来ているかな。',
      }),
      fill({
        id: 'light-mp1-t1', concept: 'straight', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '自ら光を出しているものを[b1]という。光を出さないものが見えるのは、[b1]からの光がものの表面で[b2]して目に入るからである。',
        blanks: [
          word('b1', ['光源', '反射', '影'], '光源'),
          word('b2', ['光源', '反射', '屈折'], '反射'),
        ],
        explanation: '自ら光を出すものが**光源**です。光を出さないものは、光源の光を**反射**しているので見えます。',
        hint: '太陽・電球・ろうそくの炎に共通する呼び名だよ。',
      }),
      rayDraw({
        id: 'light-mp1-p2', concept: 'reflect-law',
        prompt: '電球の光が鏡に当たりました。反射した光の道すじを、当たった点から指で引こう。',
        // 入射の向き (110,100)。水平な鏡なので反射の向きは (110,−100)。正解例 (290,90)。不正解例はほぼ真上 (180,60)
        figure: scene([
          { type: 'mirror', x1: 40, y1: 190, x2: 290, y2: 190 },
          { type: 'normal', x: 180, y: 130, angle: 0 },
          { type: 'ray', x1: 70, y1: 90, x2: 180, y2: 190, arrow: true },
          { type: 'lamp', x: 70, y: 90 },
        ]),
        source: { x: 70, y: 90 },
        hit: { x: 180, y: 190 },
        surface: { kind: 'mirror', x1: 40, y1: 190, x2: 290, y2: 190 },
        expected: { kind: 'angle' },
        samples: { correct: { out: { x: 290, y: 90 } }, wrong: { out: { x: 180, y: 60 } } },
        explanation: '反射光は、法線をはさんで入射光と反対側へ、入射角と同じ角度で進みます。方眼にかくときは、入射光が 1 マス進むごとに下がる量と、反射光が上がる量を同じにします。',
        hint: '点線の法線から入射光までの開きと、同じだけ反対側に開こう。',
      }),
      figureChoice({
        id: 'light-mp1-p3', concept: 'reflect-law',
        prompt: '図の ア〜ウ のうち、反射角はどれ？',
        figure: MIRROR_ANGLES,
        answer: 'r3',
        explanation: '反射角は、反射光と法線のなす角です。ウがその角です。アは入射光と法線のなす角（入射角）、イは入射光と鏡の面のなす角で、角度は法線から測ります。',
        hint: '反射光（右側の光）と、点線の法線のあいだの角だよ。',
      }),
      fill({
        id: 'light-mp1-p4', concept: 'reflect-law',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '光が鏡ではね返ることを光の[b1]という。鏡に当たる前の光を[b2]、はね返ったあとの光を[b3]という。',
        blanks: [
          word('b1', ['反射', '屈折', '直進'], '反射'),
          word('b2', ['入射光', '反射光'], '入射光'),
          word('b3', ['入射光', '反射光'], '反射光'),
        ],
        explanation: '光がはね返ることを反射、鏡に当たる前の光を入射光、はね返ったあとの光を反射光といいます。',
        hint: '「入射」は入ってくる、「反射」ははね返るという意味だよ。',
      }),
      fill({
        id: 'light-mp1-p5', concept: 'reflect-law',
        prompt: '空らんに入る数を入れよう。',
        text: '鏡に入射角 40° で光を当てた。このとき、反射角は[b1]である。',
        blanks: [number('b1', 40, 0, '°')],
        explanation: '反射の法則により、入射角と反射角はいつも等しいので、反射角も 40° です。',
        hint: '入射角と反射角の関係を思い出そう。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'light-mp1-r1', concept: 'reflect-law',
        prompt: '図の ア〜ウ のうち、入射角はどれ？',
        figure: MIRROR_ANGLES,
        answer: 'r1',
        explanation: '入射角は、入射光と法線のなす角です。アがその角です。イは鏡の面から測った角なので、入射角ではありません。',
        hint: '入射光（左側の光）と、点線の法線のあいだの角だよ。',
      }),
      rayDraw({
        id: 'light-mp1-r2', concept: 'reflect-law',
        prompt: 'たてに置いた鏡に光が当たりました。反射した光の道すじを、当たった点から指で引こう。',
        // 鏡 x=230。入射の向き (180,60) → 反射の向き (−180,60)。正解例 (50,220)。不正解例は来た道へ戻る (50,100)
        figure: scene([
          { type: 'mirror', x1: 230, y1: 30, x2: 230, y2: 230 },
          { type: 'normal', x: 170, y: 160, angle: 90 },
          { type: 'ray', x1: 50, y1: 100, x2: 230, y2: 160, arrow: true },
          { type: 'lamp', x: 50, y: 100 },
        ]),
        source: { x: 50, y: 100 },
        hit: { x: 230, y: 160 },
        surface: { kind: 'mirror', x1: 230, y1: 30, x2: 230, y2: 230 },
        expected: { kind: 'angle' },
        samples: { correct: { out: { x: 50, y: 220 } }, wrong: { out: { x: 50, y: 100 } } },
        explanation: '鏡がたてでも、法線（鏡に垂直な線）は横向きです。反射光は、法線をはさんで入射光と反対側へ、同じ角度で進みます。来た道を戻るのは、光が鏡に垂直に当たったときだけです。',
        hint: '横向きの点線（法線）から、入射光と同じだけ開いて引こう。',
      }),
      choice({
        id: 'light-mp1-r3', concept: 'straight',
        prompt: '光源である電球が見えるとき、目に入っている光はどれ？',
        options: ['電球から出て、直接目に入る光', '目から出て、電球ではね返った光', '電球のまわりの空気が出す光'],
        answer: 'a',
        explanation: '光源が見えるときは、光源から出た光が直接目に入っています。光を出さないものが見えるときは、光源の光がものの表面で反射して目に入ります。',
        hint: '光源は自分で光を出しているね。',
      }),
      choice({
        id: 'light-mp1-t2', concept: 'reflect-law', term: true,
        prompt: '次の説明に合う言葉はどれ？「法線と、鏡ではね返った光のなす角」',
        options: ['入射角', '反射角', '光源'],
        answer: 'b',
        explanation: '法線と反射光のなす角が**反射角**です。入射角といつも等しくなります。',
        hint: 'はね返った光（反射光）の角だよ。',
      }),
    ],
  };

  // ---- ステージ light-mp2: プリント 2（光の屈折・カップの中のコイン） ----
  const lightMp2 = {
    id: 'light-mp2', areaId: 'light-miniprint', title: 'プリント 2: 光の屈折とコインの見え方', minutes: 6, concepts: ['refract-dir', 'refract-view'],
    lessons: [
      {
        id: 'light-mp2-c1',
        text: '空気中からガラスへ、光をななめに当てると、光は境目で折れ曲がって進みます。これを光の**屈折**といいます。入射光と法線のなす角が入射角、屈折した光と法線のなす角が屈折角です。',
        figure: scene([
          { type: 'boundary', y: 120, upper: 'air', lower: 'glass' },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 70, y1: 20, x2: 160, y2: 120, arrow: true },
          { type: 'ray', x1: 160, y1: 120, x2: 215, y2: 230, arrow: true },
          { type: 'label', x: 96, y: 98, text: '入射角' },
          { type: 'label', x: 172, y: 176, text: '屈折角' },
        ]),
      },
      {
        id: 'light-mp2-c2',
        text: '空気からガラスや水へ進む光は、**境界面**で法線に近づくように曲がるので、屈折角は入射角より小さくなります。水やガラスから空気へ進むときは、屈折角のほうが大きくなります。',
        figure: scene([
          { type: 'boundary', y: 120, upper: 'air', lower: 'water' },
          { type: 'normal', x: 160, y: 120, angle: 0 },
          { type: 'ray', x1: 60, y1: 40, x2: 160, y2: 120, arrow: true },
          { type: 'ray', x1: 160, y1: 120, x2: 233, y2: 220, arrow: true },
          { type: 'label', x: 10, y: 30, text: '入射角 ＞ 屈折角' },
          { type: 'label', x: 10, y: 112, text: '境界面' },
        ]),
      },
      {
        id: 'light-mp2-c3',
        text: 'カップの底のコインが見えない位置でも、水を入れると見えるようになります。コインからの光が水面で**屈折**して目に届くからです。コインは実際より浮き上がって見えます。',
        figure: scene([
          { type: 'line', points: [[60, 80], [60, 200], [200, 200], [200, 80]], width: 3 },
          { type: 'rect', x: 62, y: 120, width: 136, height: 78, fill: 'water', stroke: 'none' },
          { type: 'ellipse', x: 110, y: 194, rx: 16, ry: 5, fill: 'yellow' },
          { type: 'ray', x1: 110, y1: 192, x2: 170, y2: 120, arrow: true },
          { type: 'ray', x1: 170, y1: 120, x2: 262, y2: 64, arrow: true },
          { type: 'eye', x: 280, y: 56 },
          { type: 'label', x: 84, y: 228, text: 'コイン' },
          { type: 'label', x: 206, y: 138, text: '水面で屈折' },
        ]),
      },
    ],
    warmup: choice({
      id: 'light-mp2-w1', concept: 'refract-view',
      prompt: '予想しよう。カップの底のコインが、ふちにかくれて見えない位置に目を置きます。カップに水を少しずつ入れていくと、どうなると思う？',
      options: ['コインが見えるようになる', 'ますます見えなくなる', '何も変わらない'],
      answer: 'a',
      explanation: '水を入れていくと、コインが見えるようになります。光が水面で曲がるためです。くわしいわけを、このステージで確かめよう。',
      hint: '水を入れたプールの底は、実際より浅く見えるね。',
    }),
    problems: [
      rayDraw({
        id: 'light-mp2-p1', concept: 'refract-dir',
        prompt: '空気中からガラスへ光をななめに当てました。ガラスの中を進む光の道すじを、当たった点から指で引こう。',
        // 入射の向き (100,80)、法線からの角 約 51°。正解例 (200,230) は約 24°（法線に近づく）。不正解例 (300,170) は約 72°（法線から離れる）
        figure: scene([
          { type: 'boundary', y: 120, upper: 'air', lower: 'glass' },
          { type: 'normal', x: 150, y: 120, angle: 0 },
          { type: 'ray', x1: 50, y1: 40, x2: 150, y2: 120, arrow: true },
        ]),
        source: { x: 50, y: 40 },
        hit: { x: 150, y: 120 },
        surface: { kind: 'boundary', y: 120, from: 'air', to: 'glass' },
        expected: { kind: 'direction' },
        samples: { correct: { out: { x: 200, y: 230 } }, wrong: { out: { x: 300, y: 170 } } },
        explanation: '空気からガラスへ進む光は、境界面で法線に近づくように曲がります。法線の反対側へ、入射角より小さい角で進む線を引けば大丈夫です。',
        hint: 'ガラスの中では、点線の法線に近づくように曲がるよ。',
      }),
      fill({
        id: 'light-mp2-t1', concept: 'refract-dir', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '光がちがう物質へななめに進むとき、2 つの物質の[b1]で光が折れ曲がる。この現象を光の[b2]という。',
        blanks: [
          word('b1', ['境界面', '法線', '焦点'], '境界面'),
          word('b2', ['屈折', '反射', '直進'], '屈折'),
        ],
        explanation: '2 つの物質の**境界面**で光が折れ曲がることを、光の**屈折**といいます。',
        hint: '空気とガラスの「さかい目」で起こるよ。',
      }),
      figureChoice({
        id: 'light-mp2-p2', concept: 'refract-dir',
        prompt: '図の ア〜ウ のうち、屈折角はどれ？',
        figure: REFRACT_ANGLES,
        answer: 'r2',
        explanation: '屈折角は、屈折した光と法線のなす角です。イがその角です。アは入射角、ウは屈折した光と境界面のなす角です。角度は法線から測ります。',
        hint: 'ガラスの中の光と、点線の法線のあいだの角だよ。',
      }),
      choice({
        id: 'light-mp2-p3', concept: 'refract-dir',
        prompt: '空気中からガラスへ光をななめに当てたとき、入射角と屈折角はどちらが大きい？',
        options: ['入射角', '屈折角', 'いつも同じ'],
        answer: 'a',
        explanation: '空気からガラスへ進む光は法線に近づくように曲がるので、屈折角は入射角より小さくなります。だから入射角のほうが大きいです。',
        hint: 'ガラスの中では、光は法線に近づいたね。',
      }),
      choice({
        id: 'light-mp2-p4', concept: 'refract-view',
        prompt: 'カップに水を入れると、見えなかったコインが見えるようになりました。それは、コインからの光がどうなったから？',
        options: ['水面で屈折して、目に届くようになったから', '水にとけて広がったから', '水の中で止まったから'],
        answer: 'a',
        explanation: 'コインからの光が水から空気へ出るとき、水面で屈折して、ふちをこえて目に届くようになります。そのためコインが見え、実際より浮き上がって見えます。',
        hint: '水から空気へ出るとき、光はどうなるかな。',
      }),
      choice({
        id: 'light-mp2-p5', concept: 'refract-view',
        prompt: '奥に立てた棒の手前に、厚いガラス板をななめに置き、ガラスごしに棒を見ました。棒はどう見える？',
        options: ['ガラスごしの部分だけ、横にずれて見える', 'ガラスごしの部分だけ、消えて見える', 'まったく同じに見える'],
        answer: 'a',
        explanation: '棒からの光は、ガラスに入るときと出るときの 2 回屈折するので、道すじが横にずれます。そのため、ガラスごしの部分だけがずれて見えます。',
        hint: 'ガラスに入るときと出るとき、光は曲がるよ。',
      }),
    ],
    retryPool: [
      figureChoice({
        id: 'light-mp2-r1', concept: 'refract-dir',
        prompt: '図の ア〜ウ のうち、入射角はどれ？',
        figure: REFRACT_ANGLES,
        answer: 'r1',
        explanation: '入射角は、空気中を進んでくる光と法線のなす角です。アがその角です。',
        hint: '空気中の光と、点線の法線のあいだの角だよ。',
      }),
      fill({
        id: 'light-mp2-r2', concept: 'refract-dir',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '空気からガラスへ光が進むとき、屈折角は入射角より[b1]なる。ガラスから空気へ進むとき、屈折角は入射角より[b2]なる。',
        blanks: [
          word('b1', ['大きく', '小さく'], '小さく'),
          word('b2', ['大きく', '小さく'], '大きく'),
        ],
        explanation: '空気→ガラスでは法線に近づくので屈折角が小さく、ガラス→空気では法線から離れるので屈折角が大きくなります。',
        hint: 'ガラスの中の光は、いつも法線に近い側を通るよ。',
      }),
      choice({
        id: 'light-mp2-r3', concept: 'refract-view',
        prompt: 'カップに水を入れて見えるようになったコインは、実際の位置とくらべてどう見える？',
        options: ['実際より浮き上がって（浅く）見える', '実際より深く見える', '実際と同じ位置に見える'],
        answer: 'a',
        explanation: '目に届いた光をまっすぐ逆にたどった先にコインがあるように見えるので、実際より浮き上がって見えます。',
        hint: 'プールの底は、実際より浅く見えるね。',
      }),
      choice({
        id: 'light-mp2-t2', concept: 'refract-view', term: true,
        prompt: '次の説明に合う言葉はどれ？「光がちがう物質へ進むとき、境界面で折れ曲がること」',
        options: ['反射', '屈折', '直進'],
        answer: 'b',
        explanation: '境界面で光が折れ曲がることを**屈折**といいます。',
        hint: '「屈」は「曲がる」という意味だよ。',
      }),
    ],
  };

  // ---- ステージ light-mp3: プリント 3（凸レンズ・像のまとめ・光学台） ----
  const lightMp3 = {
    id: 'light-mp3', areaId: 'light-miniprint', title: 'プリント 3: 凸レンズと像', minutes: 6, concepts: ['focus', 'lens-image'],
    lessons: [
      {
        id: 'light-mp3-c1',
        text: '**凸レンズ**（とつレンズ）に、**光軸**に平行な光を当てると、光は 1 点に集まります。この点が**焦点**で、レンズの中心から焦点までの距離が**焦点距離**です。',
        figure: scene([
          { type: 'axis', y: 120 },
          { type: 'lens', cx: 160, cy: 120, height: 140, f: 60 },
          { type: 'ray', x1: 20, y1: 76, x2: 160, y2: 76, arrow: true },
          { type: 'ray', x1: 20, y1: 164, x2: 160, y2: 164, arrow: true },
          { type: 'ray', x1: 160, y1: 76, x2: 290, y2: 171, arrow: true },
          { type: 'ray', x1: 160, y1: 164, x2: 290, y2: 69, arrow: true },
          { type: 'label', x: 10, y: 112, text: '光軸' },
          { type: 'label', x: 206, y: 150, text: '焦点' },
          { type: 'label', x: 160, y: 228, text: '焦点距離 ＝ 中心〜焦点', anchor: 'middle' },
        ]),
      },
      {
        id: 'light-mp3-c2',
        text: '物体を焦点より外側に置くと、スクリーンに上下左右が逆向きの**実像**が映ります。物体を焦点距離の 2 倍の位置に置くと、反対側の 2 倍の位置に、同じ大きさの実像ができます。',
        figure: scene([
          { type: 'axis', y: 110 },
          { type: 'lens', cx: 160, cy: 110, height: 130, f: 50 },
          { type: 'object', x: 60, y: 110, height: 44, label: '物体' },
          { type: 'object', x: 260, y: 110, height: -44 },
          { type: 'screen', x: 268, y1: 40, y2: 190 },
          { type: 'label', x: 150, y: 196, text: '実像（逆向き）' },
          { type: 'label', x: 10, y: 232, text: '焦点距離の 2 倍 → 同じ大きさ' },
        ]),
      },
      {
        id: 'light-mp3-c3',
        text: '物体を焦点より内側に置き、レンズを通して見ると、物体と同じ向きで、物体より大きい**虚像**が見えます。虚像はスクリーンには映りません。虫めがねで見るのがこの像です。',
        figure: scene([
          { type: 'axis', y: 130 },
          { type: 'lens', cx: 180, cy: 130, height: 130, f: 70 },
          { type: 'object', x: 87, y: 130, height: 79 },
          { type: 'object', x: 140, y: 130, height: 34, label: '物体' },
          { type: 'eye', x: 280, y: 120 },
          { type: 'label', x: 20, y: 40, text: '虚像（同じ向き・大きい）' },
        ]),
      },
    ],
    warmup: choice({
      id: 'light-mp3-w1', concept: 'lens-image',
      prompt: '予想しよう。虫めがね（凸レンズ）を目からだいぶはなして持ち、遠くの景色をのぞくと、どう見えると思う？',
      options: ['上下左右が逆さまに見える', 'そのままの向きで大きく見える', '何も見えない'],
      answer: 'a',
      explanation: '遠くの景色からの光はレンズで集まり、目の手前に上下左右が逆の実像ができます。その像を見るので、逆さまに見えます。',
      hint: '遠くのものは焦点より外側にあるね。',
    }),
    problems: [
      figureChoice({
        id: 'light-mp3-p1', concept: 'focus',
        prompt: '図の ア〜ウ のうち、凸レンズの焦点はどれ？',
        figure: LENS_PARTS,
        answer: 'r1',
        explanation: '光軸に平行な光が、レンズで屈折して集まる点が焦点です。アがその点です。イは光軸の上の点、ウはレンズの中心の下です。',
        hint: '2 本の光が集まって交わる点をさがそう。',
      }),
      fill({
        id: 'light-mp3-t1', concept: 'focus', term: true,
        prompt: '大切な言葉を入れよう。',
        text: 'レンズの中心を通り、レンズに垂直な線を[b1]という。レンズの中心から焦点までの距離を[b2]という。',
        blanks: [
          word('b1', ['光軸', '焦点', '焦点距離'], '光軸'),
          word('b2', ['光軸', '焦点', '焦点距離'], '焦点距離'),
        ],
        explanation: 'レンズの中心を通りレンズに垂直な線が**光軸**、中心から焦点までの距離が**焦点距離**です。',
        hint: '「軸」は中心を通る線、「距離」は長さだよ。',
      }),
      choice({
        id: 'light-mp3-p2', concept: 'lens-image',
        prompt: '物体を焦点より外側に置いたとき、スクリーンに映る像の名前と向きはどれ？',
        options: ['実像で、物体と上下左右が逆', '実像で、物体と同じ向き', '虚像で、物体と同じ向き'],
        answer: 'a',
        explanation: 'スクリーンに映る像は実像で、物体と上下左右が逆になります。',
        hint: 'スクリーンに映るのは、実際に光が集まってできる像だよ。',
      }),
      choice({
        id: 'light-mp3-p3', concept: 'lens-image',
        prompt: '物体を焦点より内側に置き、レンズを通して物体を見ました。見える像はどれ？',
        options: ['虚像で、物体と同じ向き・物体より大きい', '虚像で、物体と逆向き・物体より小さい', '実像で、物体と逆向き・物体と同じ大きさ'],
        answer: 'a',
        explanation: 'レンズを通して見える像は虚像で、物体と同じ向きで、物体より大きく見えます。虫めがねで文字を見るときの像です。',
        hint: '虫めがねで文字を見たときを思い出そう。',
      }),
      figureChoice({
        id: 'light-mp3-p4', concept: 'lens-image',
        prompt: '上の図のように、物体と凸レンズの距離を 20 cm にすると、レンズから 20 cm のスクリーンに像が映りました。映った像は、下の ア〜エ のどれ？（どれも同じ縮尺）',
        // 上: 物体（高さ 36）・レンズ・スクリーン。下: ア 逆向き同じ大きさ（正解）、イ 同じ向き同じ大きさ、ウ 逆向き大きい、エ 逆向き小さい
        figure: scene([
          { type: 'axis', y: 60 },
          { type: 'object', x: 40, y: 60, height: 36, label: '物体' },
          { type: 'lens', cx: 110, cy: 60, height: 76, f: 35 },
          { type: 'screen', x: 180, y1: 34, y2: 106 },
          { type: 'label', x: 220, y: 40, text: '20 cm・20 cm', size: 13 },
          { type: 'line', points: [[20, 140], [300, 140]], color: 'gray', width: 1, dashed: true },
          { type: 'object', x: 50, y: 140, height: -36 },
          { type: 'object', x: 120, y: 140, height: 36 },
          { type: 'object', x: 190, y: 140, height: -50 },
          { type: 'object', x: 260, y: 140, height: -18 },
          { type: 'region', id: 'r1', x: 50, y: 214, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 120, y: 214, r: 22, label: 'イ' },
          { type: 'region', id: 'r3', x: 190, y: 214, r: 22, label: 'ウ' },
          { type: 'region', id: 'r4', x: 260, y: 214, r: 22, label: 'エ' },
        ]),
        answer: 'r1',
        explanation: '物体とスクリーンが、どちらもレンズから同じ 20 cm なので、物体は焦点距離の 2 倍の位置にあります。このとき、物体と同じ大きさで上下左右が逆の実像（ア）ができます。',
        hint: '物体までとスクリーンまでの距離が同じとき、像の大きさはどうなるかな。',
      }),
      fill({
        id: 'light-mp3-p5', concept: 'lens-image',
        prompt: '空らんに入るものを選ぼう。',
        text: '物体とレンズの距離が 20 cm のとき、レンズから 20 cm のスクリーンに像が映った。この像を漢字 2 文字で[b1]という。このレンズの焦点距離は[b2]である。',
        blanks: [
          word('b1', ['実像', '虚像'], '実像'),
          number('b2', 10, 0, 'cm'),
        ],
        explanation: 'スクリーンに映る像は実像です。物体とスクリーンがレンズから同じ距離のとき、その距離は焦点距離の 2 倍なので、焦点距離は 20 ÷ 2 ＝ 10 cm です。',
        hint: '同じ大きさの実像ができるのは、焦点距離の 2 倍の位置だったね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'light-mp3-r1', concept: 'focus',
        prompt: '「凸レンズ」の正しい読み方はどれ？',
        options: ['とつレンズ', 'おうレンズ', 'でこレンズ'],
        answer: 'a',
        explanation: '凸レンズは「とつレンズ」と読みます。まん中がふくらんだレンズです。まん中がへこんだレンズは凹（おう）レンズです。',
        hint: '「凸」はでっぱった形を表す字で、音読みは「とつ」だよ。',
      }),
      figureChoice({
        id: 'light-mp3-r2', concept: 'focus',
        prompt: '図の ア〜ウ のうち、光軸の上にある点で、焦点でもレンズの中心でもないものはどれ？',
        figure: LENS_PARTS,
        answer: 'r2',
        explanation: 'イは、レンズの中心を通りレンズに垂直な線（光軸）の上の点です。アは焦点、ウはレンズの中心の下です。',
        hint: '一点鎖線（光軸）の上で、光が集まっていない点はどれかな。',
      }),
      fill({
        id: 'light-mp3-r3', concept: 'lens-image',
        prompt: '空らんに入る言葉を選ぼう。',
        text: '虫めがねで、焦点より内側にある文字を見ると、文字は実際より[b1]、[b2]向きに見える。',
        blanks: [
          word('b1', ['大きく', '小さく'], '大きく'),
          word('b2', ['同じ', '逆'], '同じ'),
        ],
        explanation: '焦点より内側の物体をレンズを通して見ると、同じ向きで大きい虚像が見えます。',
        hint: '虫めがねは、字を大きく見るための道具だね。',
      }),
      choice({
        id: 'light-mp3-r4', concept: 'lens-image',
        prompt: '物体を焦点距離の 2 倍の位置に置いたとき、スクリーンに映る実像の大きさはどうなる？',
        options: ['物体と同じ大きさ', '物体より大きい', '物体より小さい'],
        answer: 'a',
        explanation: '焦点距離の 2 倍の位置に物体を置くと、反対側の焦点距離の 2 倍の位置に、物体と同じ大きさの実像ができます。',
        hint: '物体までとスクリーンまでの距離が同じになるときだよ。',
      }),
      choice({
        id: 'light-mp3-t2', concept: 'lens-image', term: true,
        prompt: '次の説明に合う言葉はどれ？「焦点より内側の物体を、レンズを通して見たときに見える、同じ向きの大きい像」',
        options: ['実像', '虚像', '焦点'],
        answer: 'b',
        explanation: 'この像を**虚像**といいます。光が実際に集まってできる像ではないので、スクリーンには映りません。',
        hint: 'スクリーンに映らない像だよ。',
      }),
    ],
  };

  // ---- ステージ light-mp4: プリント 4（凸レンズとろうそく・実像の作図・実像と虚像の作図・光の進み方の作図・方眼の作図） ----
  const lightMp4 = {
    id: 'light-mp4', areaId: 'light-miniprint', title: 'プリント 4: 凸レンズの作図と像の変化', minutes: 7, concepts: ['lens-image', 'focus'],
    lessons: [
      {
        id: 'light-mp4-c1',
        text: '凸レンズの作図では、2 本の光を使います。レンズの中心を通る光はそのまま直進し、光軸に平行な光は屈折して反対側の**焦点**を通ります。2 本が交わる点に像の先がきます。',
        figure: scene(lensDrawScene('both').concat([
          { type: 'object', x: 260, y: 120, height: -50 },
          { type: 'label', x: 120, y: 232, text: '交わる点 ＝ 像の先' },
        ])),
      },
      {
        id: 'light-mp4-c2',
        text: '物体を焦点に近づけるほど、**実像**ができる位置はレンズから遠くなり、像は大きくなります。物体を焦点の上に置くと、レンズを通った光は平行に進むので、像はできません。',
        figure: scene([
          { type: 'axis', y: 110 },
          { type: 'lens', cx: 160, cy: 110, height: 130, f: 50 },
          { type: 'point', x: 60, y: 110, label: '2 倍の位置' },
          { type: 'label', x: 10, y: 196, text: '遠い → 小さい像（レンズの近く）' },
          { type: 'label', x: 10, y: 220, text: '焦点に近い → 大きい像（遠く）' },
          { type: 'label', x: 10, y: 30, text: '焦点の上 → 像はできない' },
        ]),
      },
      {
        id: 'light-mp4-c3',
        text: 'レンズの下半分を紙でおおっても、上半分を通った光が集まるので、像は全体が映ります。ただし届く光が減るので暗くなります。焦点より内側では**虚像**が見えます。',
        figure: scene([
          { type: 'axis', y: 110 },
          { type: 'lens', cx: 160, cy: 110, height: 140, f: 50 },
          { type: 'rect', x: 148, y: 112, width: 24, height: 72, fill: 'shadow', stroke: 'none' },
          { type: 'object', x: 60, y: 110, height: 44, label: 'ろうそく' },
          { type: 'ray', x1: 60, y1: 66, x2: 160, y2: 66 },
          { type: 'ray', x1: 160, y1: 66, x2: 260, y2: 154, arrow: true },
          { type: 'ray', x1: 60, y1: 66, x2: 160, y2: 82 },
          { type: 'ray', x1: 160, y1: 82, x2: 260, y2: 154, arrow: true },
          { type: 'object', x: 260, y: 110, height: -44 },
          { type: 'label', x: 186, y: 210, text: '全体が映る・暗い' },
        ]),
      },
    ],
    warmup: choice({
      id: 'light-mp4-w1', concept: 'lens-image',
      prompt: '予想しよう。ろうそくの像をスクリーンに映しているとき、凸レンズの下半分を手でおおうと、像はどうなると思う？',
      options: ['上半分だけが映る', '下半分だけが映る', '全体が映るが、暗くなる'],
      answer: 'c',
      explanation: 'ろうそくの 1 点から出た光は、レンズの上半分を通っても像の同じ点に集まります。だから像は全体が映り、光が減るぶん暗くなります。',
      hint: '光はレンズのどこを通っても、像の同じ点に集まるよ。',
    }),
    problems: [
      rayDraw({
        id: 'light-mp4-p1', concept: 'lens-image',
        prompt: '物体の先から出て、凸レンズの中心に向かう光があります。レンズを通ったあとの光の道すじを、レンズの中心から指で引こう。',
        // lens cx 160, cy 120, f 50。入射の向き (100,50)。中心を通る光は直進 → 正解例 (280,180)。不正解例 (280,120) は光軸に平行
        figure: scene(lensDrawScene('center')),
        source: { x: 60, y: 70 },
        hit: { x: 160, y: 120 },
        surface: { kind: 'lens', cx: 160, cy: 120, f: 50 },
        expected: { kind: 'lens', ray: 'center' },
        samples: { correct: { out: { x: 280, y: 180 } }, wrong: { out: { x: 280, y: 120 } } },
        explanation: 'レンズの中心を通る光は、屈折せずにそのまま直進します。入ってきた光と同じかたむきのまま、まっすぐのばしましょう。',
        hint: 'レンズの中心を通る光は、曲がらないよ。',
      }),
      fill({
        id: 'light-mp4-t1', concept: 'lens-image', term: true,
        prompt: '大切な言葉を入れよう。',
        text: '物体を焦点より外側に置くと、スクリーンに[b1]が映る。焦点より内側に置いてレンズをのぞくと[b2]が見える。',
        blanks: [
          word('b1', ['実像', '虚像'], '実像'),
          word('b2', ['実像', '虚像'], '虚像'),
        ],
        explanation: '焦点の外側なら、光が集まって**実像**ができます。焦点の内側なら、レンズを通して**虚像**が見えます。',
        hint: 'スクリーンに映るのはどちらの像だったかな。',
      }),
      rayDraw({
        id: 'light-mp4-p2', concept: 'focus',
        prompt: '物体の先から出て、光軸に平行に進む光があります。凸レンズを通ったあとの光の道すじを、当たった点から指で引こう。',
        // lens cx 160, cy 120, f 50 → 焦点 (210,120)。正解例 (280,190) は (160,70)→(210,120) の直線上。不正解例 (280,70) はまっすぐのまま
        figure: scene(lensDrawScene('parallel')),
        source: { x: 60, y: 70 },
        hit: { x: 160, y: 70 },
        surface: { kind: 'lens', cx: 160, cy: 120, f: 50 },
        expected: { kind: 'lens', ray: 'parallel' },
        samples: { correct: { out: { x: 280, y: 190 } }, wrong: { out: { x: 280, y: 70 } } },
        explanation: '光軸に平行な光は、レンズで屈折して反対側の焦点を通ります。当たった点と右側の焦点を結ぶ直線をのばしましょう。',
        hint: 'レンズの右側の焦点 F\' を通るように引こう。',
      }),
      drag({
        id: 'light-mp4-p3', concept: 'lens-image',
        prompt: '物体の先から出た 2 本の光を作図しました。実像の先（物体の先が映る点）はどこ？ 青い点を動かして置こう。',
        // 中心を通る光 (60,70)→(160,120)→ 傾き 0.5、平行な光 (160,70)→ 焦点 (210,120) → 傾き 1。2 本は (260,170) で交わる
        figure: scene(lensDrawScene('both').concat([
          { type: 'circle', id: 'tip', x: 40, y: 200, r: 10, fill: 'blue', stroke: 'blue', label: '像の先', labelPos: 'below' },
        ])),
        draggable: { itemId: 'tip', axis: 'xy' },
        target: { x: 260, y: 170 },
        samples: { correct: { x: 260, y: 170 }, wrong: { x: 210, y: 120 } },
        explanation: '物体の先から出た光は、レンズを通ったあと 1 点に集まります。2 本の光が交わる点が像の先です。ここから光軸まで下向きの矢印をかくと、上下が逆の実像になります。',
        hint: '2 本の光の線が交わっている点をさがそう。',
      }),
      choice({
        id: 'light-mp4-p4', concept: 'lens-image',
        prompt: 'スクリーンにろうそくの像が映っています。ろうそくを凸レンズに近づけました（焦点よりは外側）。像をはっきり映すには、スクリーンをどうする？',
        options: ['レンズから遠ざける', 'レンズに近づける', '動かさなくてよい'],
        answer: 'a',
        explanation: '物体を焦点に近づけるほど、実像ができる位置はレンズから遠くなります。だから、スクリーンをレンズから遠ざけます。',
        hint: '物体が焦点に近いほど、像はどこにできたかな。',
      }),
      choice({
        id: 'light-mp4-p5', concept: 'lens-image',
        prompt: 'ろうそくを凸レンズに近づけて（焦点よりは外側）、スクリーンに像をはっきり映しました。像の大きさは、前とくらべてどうなる？',
        options: ['大きくなる', '小さくなる', '変わらない'],
        answer: 'a',
        explanation: '物体を焦点に近づけるほど、実像は大きくなります。そのかわり、像ができる位置はレンズから遠くなります。',
        hint: '焦点に近い物体ほど、像は大きかったね。',
      }),
    ],
    retryPool: [
      choice({
        id: 'light-mp4-r1', concept: 'lens-image',
        prompt: '凸レンズでスクリーンに映したろうそくの像は、どんな像？',
        options: ['上下左右が逆の実像', '同じ向きの実像', '同じ向きの虚像'],
        answer: 'a',
        explanation: 'スクリーンに映る像は実像で、上下左右が逆になります。ろうそくの炎が下に映ります。',
        hint: 'スクリーンに映るのは実像。向きはどうだったかな。',
      }),
      choice({
        id: 'light-mp4-r2', concept: 'lens-image',
        prompt: '物体を焦点の上に置いて作図すると、レンズを通った 2 本の光はどうなる？',
        options: ['平行に進み、交わらないので像はできない', '焦点で交わって小さい像ができる', 'レンズで止まる'],
        answer: 'a',
        explanation: '焦点の上から出た光は、レンズを通ると光軸に平行に進みます。2 本の光が交わらないので、実像も虚像もできません。',
        hint: '焦点を通ってレンズに入った光は、どう進んだかな。',
      }),
      choice({
        id: 'light-mp4-r3', concept: 'lens-image',
        prompt: '物体を焦点距離の 2 倍より遠い所に置きました。できる実像はどれ？',
        options: ['物体より小さい実像', '物体より大きい実像', '物体と同じ大きさの実像'],
        answer: 'a',
        explanation: '物体が焦点距離の 2 倍より遠いと、反対側の焦点と 2 倍の位置のあいだに、物体より小さい実像ができます。',
        hint: '物体が遠いほど、像は小さくなるよ。',
      }),
      choice({
        id: 'light-mp4-r4', concept: 'lens-image',
        prompt: '物体を、焦点と焦点距離の 2 倍の位置のあいだに置きました。できる実像はどれ？',
        options: ['2 倍の位置より遠くに、物体より大きい実像', '焦点のすぐ近くに、物体より小さい実像', '像はできない'],
        answer: 'a',
        explanation: '物体が焦点と 2 倍の位置のあいだにあると、反対側の 2 倍の位置より遠くに、物体より大きい実像ができます。',
        hint: '2 倍の位置で同じ大きさ。それより焦点に近いと？',
      }),
      choice({
        id: 'light-mp4-r5', concept: 'lens-image',
        prompt: '物体を焦点より内側に置いて作図すると、レンズを通った 2 本の光は広がって交わりません。虚像はどこに見える？',
        options: ['2 本の光を物体の側へ逆にのばした線が交わる所', 'レンズの反対側のスクリーンの上', '焦点の上'],
        answer: 'a',
        explanation: 'レンズを通った光を逆向きにのばすと、物体と同じ側の 1 点で交わります。そこに、同じ向きで大きい虚像が見えます。',
        hint: '目に入る光を、来た方へまっすぐたどってみよう。',
      }),
      choice({
        id: 'light-mp4-t2', concept: 'lens-image', term: true,
        prompt: '次の説明に合う言葉はどれ？「凸レンズを通った光が実際に集まってでき、スクリーンに映る像」',
        options: ['実像', '虚像', '焦点'],
        answer: 'a',
        explanation: '光が実際に集まってできる像が**実像**です。上下左右が逆になります。',
        hint: '「実際に」光が集まる像だよ。',
      }),
    ],
  };


  // ================================================================
  // 概念（学び直しの確認問題 checkPool つき）
  // ================================================================

  const concepts = [
    {
      id: 'straight', title: '光の直進', basic: null, lessonStageId: 'straight-1',
      checkPool: [
        choice({
          id: 'straight-k1', concept: 'straight',
          prompt: '光は、空気の中をどのように進む？',
          options: ['まっすぐに進む', '曲がりながら進む', '上へのぼりながら進む'],
          answer: 'a',
          explanation: '光は、さえぎるものがなければ空気の中をまっすぐに進みます。影ができるのも、このためです。',
          hint: '影ができるわけを思い出そう。',
        }),
        fill({
          id: 'straight-k2', concept: 'straight',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '影の形は、光源と物体のはしを結ぶ[b1]な線で決まる。',
          blanks: [word('b1', ['曲がった', 'まっすぐ', 'ぎざぎざ'], 'まっすぐ')],
          explanation: '光はまっすぐ進むので、光源と物体のはしを結ぶまっすぐな線をのばすと、影のはしが分かります。',
          hint: '光の進み方を思い出そう。',
        }),
        choice({
          id: 'straight-k3', concept: 'straight',
          prompt: '次のうち、光源はどれ？',
          options: ['鏡', 'ろうそくの炎', '月'],
          answer: 'b',
          explanation: 'ろうそくの炎は自分で光を出す光源です。鏡や月は、ほかから来た光をはね返して明るく見えています。',
          hint: '自分で光を出しているものをさがそう。',
        }),
      ],
    },
    {
      id: 'reflect-law', title: '反射の法則', basic: 'straight', lessonStageId: 'reflect-1',
      checkPool: [
        choice({
          id: 'reflect-law-k1', concept: 'reflect-law',
          prompt: '鏡で光が反射するとき、入射角と反射角の関係はどれ？',
          options: ['反射角のほうが大きい', '入射角のほうが大きい', 'いつも等しい'],
          answer: 'c',
          explanation: '入射角と反射角は、いつも等しくなります。これを反射の法則といいます。',
          hint: '反射の法則を思い出そう。',
        }),
        fill({
          id: 'reflect-law-k2', concept: 'reflect-law',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '光が鏡に当たった点で、鏡の面に垂直に引いた線を[b1]という。',
          blanks: [word('b1', ['法線', '光線', '境界線'], '法線')],
          explanation: '鏡の面に垂直な線を法線といいます。入射角も反射角も、この法線から測ります。',
          hint: '角度を測るときの基準になる線の名前を思い出そう。',
        }),
        choice({
          id: 'reflect-law-k3', concept: 'reflect-law',
          prompt: '入射角が 60° のとき、反射角は何度？',
          options: ['30°', '60°', '120°'],
          answer: 'b',
          explanation: '反射角は入射角と同じ 60° です。30° は鏡の面から測った角なので、法線から測るように気をつけよう。',
          hint: '入射角と反射角の関係を思い出そう。',
        }),
      ],
    },
    {
      id: 'mirror-image', title: '鏡に映る像', basic: 'reflect-law', lessonStageId: 'reflect-2',
      checkPool: [
        choice({
          id: 'mirror-image-k1', concept: 'mirror-image',
          prompt: '鏡に映る像はどこにできる？',
          options: ['鏡の向こう側の、ものと同じ距離のところ', '鏡の面の上', '鏡の手前の、目の近く'],
          answer: 'a',
          explanation: '像は、鏡をはさんでものと反対側の、鏡から同じ距離のところにできます。',
          hint: '鏡の前で 1 歩下がったときの像の動きを思い出そう。',
        }),
        fill({
          id: 'mirror-image-k2', concept: 'mirror-image',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '鏡の向こうにものがあるように見えるとき、その見えているものを[b1]という。',
          blanks: [word('b1', ['影', '光源', '像'], '像')],
          explanation: '鏡の向こうに見えるものを像といいます。像は鏡から、ものと同じ距離のところにできます。',
          hint: '鏡に映って見えるもののよび名を思い出そう。',
        }),
        fill({
          id: 'mirror-image-k3', concept: 'mirror-image',
          prompt: '空らんに入る数を入れよう。',
          text: '鏡から 40 cm のところに人形を置くと、人形の像は鏡の向こう[b1]のところにできる。',
          blanks: [number('b1', 40, 0, 'cm')],
          explanation: '像は鏡から、ものと同じ距離のところにできるので、鏡の向こう 40 cm です。',
          hint: '像と鏡の距離は、ものと鏡の距離と同じだったね。',
        }),
      ],
    },
    {
      id: 'refract-dir', title: '屈折の向き', basic: 'straight', lessonStageId: 'refract-1',
      checkPool: [
        choice({
          id: 'refract-dir-k1', concept: 'refract-dir',
          prompt: '空気から水へ、ななめに進む光は、境界面でどうなる？',
          options: ['法線から離れるように折れ曲がる', 'そのまままっすぐ進む', '法線に近づくように折れ曲がる'],
          answer: 'c',
          explanation: '空気から水やガラスへななめに進む光は、法線に近づくように折れ曲がります。水やガラスから空気へ進むときは、その反対で法線から離れます。',
          hint: '空気から水へ入るときは、法線に「近づく」か「離れる」か思い出そう。',
        }),
        fill({
          id: 'refract-dir-k2', concept: 'refract-dir',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '光がちがう物質の境界面で折れ曲がって進むことを、光の[b1]という。',
          blanks: [word('b1', ['反射', '屈折', '直進'], '屈折')],
          explanation: '境界面で光が折れ曲がることを屈折といいます。鏡などではね返るのは反射です。',
          hint: '「はね返る」ではなく「折れ曲がる」ことの名前だよ。',
        }),
        choice({
          id: 'refract-dir-k3', concept: 'refract-dir',
          prompt: '水面に垂直に入った光は、どう進む？',
          options: ['折れ曲がらずにまっすぐ進む', '法線に近づくように曲がる', '水面にそって進む'],
          answer: 'a',
          explanation: '境界面に垂直に入る光は、折れ曲がらずにまっすぐ進みます。屈折するのは、ななめに入る光です。',
          hint: '垂直に入る光は、法線と重なっているね。',
        }),
      ],
    },
    {
      id: 'refract-view', title: '屈折による見え方', basic: 'refract-dir', lessonStageId: 'refract-2',
      checkPool: [
        choice({
          id: 'refract-view-k1', concept: 'refract-view',
          prompt: 'コップの水の底にあるコインが浮き上がって見えるのは、光のどんな性質のため？',
          options: ['反射', '屈折', '直進'],
          answer: 'b',
          explanation: 'コインからの光が水面で屈折して目に届くので、コインは浮き上がって見えます。目は光がまっすぐ来たと感じるためです。',
          hint: '光が水面で折れ曲がることを何といったか思い出そう。',
        }),
        choice({
          id: 'refract-view-k2', concept: 'refract-view',
          prompt: '池の中の魚を岸から見ると、魚は実際の位置と比べてどこに見える？',
          options: ['実際より浅い（水面に近い）ところ', '実際より深いところ', '実際と同じところ'],
          answer: 'a',
          explanation: '魚からの光が水面で法線から離れるように折れ曲がって目に届くので、魚は実際より浅いところに浮き上がって見えます。',
          hint: '水の底のコインの見え方と同じように考えよう。',
        }),
        fill({
          id: 'refract-view-k3', concept: 'refract-view',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '水の中のものからの光は、水面で法線から[b1]ように折れ曲がって目に届く。',
          blanks: [word('b1', ['離れる', '近づく'], '離れる')],
          explanation: '水から空気へ出る光は、法線から離れるように折れ曲がります。その光を目はまっすぐ来たと感じるので、水の中のものは浮き上がって見えます。',
          hint: '水から空気へ進む光の曲がり方を思い出そう。',
        }),
      ],
    },
    {
      id: 'total-reflect', title: '全反射', basic: 'refract-dir', lessonStageId: 'refract-2',
      checkPool: [
        choice({
          id: 'total-reflect-k1', concept: 'total-reflect',
          prompt: '水やガラスから空気へ進む光が、空気中へ出られずに、境界面ですべて反射することを何という？',
          options: ['乱反射', '全反射', '屈折'],
          answer: 'b',
          explanation: '境界面ですべて反射することを全反射といいます。水やガラスから空気へ進む光で、入射角が大きいときに起こります。',
          hint: '「すべて」反射する、という名前だよ。',
        }),
        choice({
          id: 'total-reflect-k2', concept: 'total-reflect',
          prompt: '全反射が起こるのは、どんなとき？',
          options: ['空気から水へ光が進むとき', '鏡に光が当たったとき', '水やガラスから空気へ進む光の入射角が大きいとき'],
          answer: 'c',
          explanation: '全反射は、水やガラスから空気へ進む光の入射角が大きいときに起こります。空気から水へ進む光では起こりません。',
          hint: '空気中へ「出られなくなる」のはどちら向きの光か考えよう。',
        }),
        fill({
          id: 'total-reflect-k3', concept: 'total-reflect',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'ガラスから空気へ進む光は、入射角がある大きさをこえると、境界面ですべて[b1]する。',
          blanks: [word('b1', ['屈折', '反射', '直進'], '反射')],
          explanation: '入射角がある大きさをこえると、光は空気中へ出られず、境界面ですべて反射します。これが全反射です。',
          hint: '空気中へ出られなかった光は、どうなるかな。',
        }),
      ],
    },
    {
      id: 'focus', title: '焦点', basic: 'refract-dir', lessonStageId: 'lens-1',
      checkPool: [
        choice({
          id: 'focus-k1', concept: 'focus',
          prompt: '光軸に平行な光が凸レンズを通ったあと、集まる点を何という？',
          options: ['焦点', '光源', '像'],
          answer: 'a',
          explanation: '光軸に平行な光は、凸レンズで屈折して焦点に集まります。焦点はレンズの両側にあります。',
          hint: '虫めがねで日光を集めた明るい点の名前だよ。',
        }),
        choice({
          id: 'focus-k2', concept: 'focus',
          prompt: '凸レンズの中心を通る光は、レンズを通ったあとどう進む？',
          options: ['焦点に向かって曲がる', 'そのまままっすぐ進む', 'レンズではね返る'],
          answer: 'b',
          explanation: 'レンズの中心を通る光は、屈折せずにそのまままっすぐ進みます。焦点を通るのは、光軸に平行に入った光です。',
          hint: 'レンズの中心を通る光は特別だったね。',
        }),
        fill({
          id: 'focus-k3', concept: 'focus',
          prompt: '空らんに入る言葉を選ぼう。',
          text: 'レンズの中心から焦点までの距離を[b1]という。',
          blanks: [word('b1', ['焦点距離', '屈折', '光軸'], '焦点距離')],
          explanation: 'レンズの中心から焦点までの距離を焦点距離といいます。ふくらみの大きいレンズほど、焦点距離は短くなります。',
          hint: '「焦点」までの「距離」だね。',
        }),
      ],
    },
    {
      id: 'lens-image', title: 'レンズの像', basic: 'focus', lessonStageId: 'lens-2',
      checkPool: [
        choice({
          id: 'lens-image-k1', concept: 'lens-image',
          prompt: '虫めがねで近くの文字を見ると、大きく見えます。このとき見えている像を何という？',
          options: ['実像', '虚像', '影'],
          answer: 'b',
          explanation: '文字が焦点の内側にあるので、レンズをのぞくと大きく同じ向きの虚像が見えます。虚像はスクリーンには映りません。',
          hint: 'スクリーンに映らない像の名前を思い出そう。',
        }),
        choice({
          id: 'lens-image-k2', concept: 'lens-image',
          prompt: 'スクリーンに映る実像の向きは、物体と比べてどうなっている？',
          options: ['物体と同じ向き', '上下左右が逆向き', '上下は同じで、左右だけ逆向き'],
          answer: 'b',
          explanation: '凸レンズでスクリーンに映る実像は、物体と上下左右が逆向きになります。',
          hint: '実像は「逆さま」に映ったね。',
        }),
        fill({
          id: 'lens-image-k3', concept: 'lens-image',
          prompt: '空らんに入る言葉を選ぼう。',
          text: '物体を焦点の[b1]に置くと、スクリーンに像はできず、レンズをのぞくと大きな虚像が見える。',
          blanks: [word('b1', ['内側', '外側', '2 倍の位置'], '内側')],
          explanation: '物体が焦点の内側にあると、レンズを通った光は集まらないので、スクリーンに像はできません。レンズをのぞくと大きな虚像が見えます。',
          hint: '虫めがねで文字を見るとき、文字はレンズの近くにあるね。',
        }),
        // ミニプリント「凸レンズを通った光の進み方」のきまり・「凸レンズとろうそく」のあふれた分
        fill({
          id: 'lens-image-k4', concept: 'lens-image',
          prompt: '凸レンズの作図のきまりをまとめよう。',
          text: '凸レンズの中心を通る光は[b1]。光軸に平行な光は、レンズで屈折して[b2]を通る。',
          blanks: [
            word('b1', ['そのまま直進する', '光軸に平行になる'], 'そのまま直進する'),
            word('b2', ['反対側の焦点', 'レンズの中心'], '反対側の焦点'),
          ],
          explanation: '作図ではこの 2 本の光を使います。中心を通る光は直進し、光軸に平行な光は反対側の焦点を通ります。2 本が交わる点が像の先です。',
          hint: '作図で引いた 2 本の光の進み方を思い出そう。',
        }),
        choice({
          id: 'lens-image-k5', concept: 'lens-image',
          prompt: 'ろうそくを凸レンズから遠ざけていくと、スクリーンにはっきり映る実像はどうなる？',
          options: ['小さくなり、できる位置はレンズに近づく', '大きくなり、できる位置はレンズから遠ざかる', '大きさも位置も変わらない'],
          answer: 'a',
          explanation: '物体が焦点から遠ざかるほど、実像は小さくなり、レンズの近く（焦点の近く）にできます。近づけたときの反対です。',
          hint: '焦点に近づけたときと反対になるよ。',
        }),
      ],
    },
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'light',
    title: '光の世界',
    mascot: 'E',   // 担当の先生（キューブ先生。js/mascot.js の MASCOTS）
    concepts,
    areas: [
      { id: 'straight', title: '光の直進', order: 1, stages: [straight1, straight2] },
      { id: 'reflect', title: '光の反射', order: 2, stages: [reflect1, reflect2] },
      { id: 'refract', title: '光の屈折', order: 3, stages: [refract1, refract2] },
      { id: 'lens', title: '凸レンズ', order: 4, stages: [lens1, lens2] },
      { id: 'light-miniprint', title: 'ミニプリント', order: 5, free: true, stages: [lightMp1, lightMp2, lightMp3, lightMp4] },
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
