// 「光の世界」教材データ（中学1年 理科）
// 文章と図はすべてこのアプリのための自作。形は共通資料の「共通のデータの形」を参照。
// Task 8: 単元の骨組み（4 領域）と、光の直進 2 ステージ・光の反射 2 ステージ、概念 3 つ。
//         屈折・凸レンズのステージと残りの概念は Task 10 で足す。
// 図（scene）の item は js/figures.js の定義に従う。座標は x 右向き・y 下向き、場面は 320×240。
// ray-draw / drag の samples は手計算した正解例・不正解例（tests/content-light.test.js で判定を確かめる）。
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
        text: '電球や太陽のように、自分で光を出すものを光源といいます。光源から出た光は、まわりのあらゆる向きへ、まっすぐに進みます。光の進む道を矢印のついた直線で表したものを、光の道すじといいます。',
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
        text: '光の通り道に、光を通さないものを置くと、その後ろには光が届きません。光はまっすぐ進み、ものの後ろへ回りこまないので、暗い部分ができます。これが影です。',
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
        text: '影の形や大きさは、光源と物体のはしを結ぶ直線をのばすと分かります。物体を光源に近づけると、光をさえぎる範囲が広がるので、スクリーンにできる影は大きくなります。',
        // 物体を光源に近づけたときの影（大きくなる）
        figure: scene([
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 30, arrow: true },
          { type: 'ray', x1: 40, y1: 120, x2: 280, y2: 210, arrow: true },
          { type: 'object', x: 100, y: 143, height: 45, label: '物体' },
          { type: 'screen', x: 280, y1: 30, y2: 220 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'label', x: 150, y: 232, text: '近づけると影は大きい' },
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
          { type: 'region', id: 'r1', x: 280, y: 56, r: 22 },
          { type: 'label', x: 244, y: 62, text: 'ア' },
          { type: 'region', id: 'r2', x: 280, y: 132, r: 22 },
          { type: 'label', x: 244, y: 138, text: 'イ' },
          { type: 'region', id: 'r3', x: 280, y: 208, r: 22 },
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
        prompt: 'スクリーンの 2 つの青い点のあいだに、ちょうど影ができるようにしたい。物体を左右に動かして置こう。',
        // 光源 (40,120)、物体の高さ 40（y 100〜140）。スクリーン x=280 で影の高さ 120（y 60〜180）にするには
        // 40 × (280−40) / (x−40) = 120 → x = 120
        figure: scene([
          { type: 'screen', x: 280, y1: 30, y2: 220 },
          { type: 'point', x: 280, y: 60 },
          { type: 'point', x: 280, y: 180 },
          { type: 'lamp', x: 40, y: 120 },
          { type: 'object', id: 'obj', x: 200, y: 140, height: 40, label: '物体' },
        ]),
        draggable: { itemId: 'obj', axis: 'x' },
        target: { x: 120, y: 140 },
        samples: { correct: { x: 120, y: 140 }, wrong: { x: 180, y: 140 } },
        explanation: '物体を電球に近づけるほど、電球と物体のはしを結ぶ直線が大きく開くので、影は大きくなります。光がまっすぐ進むことを使うと、影の大きさも予想できます。',
        hint: '影を大きくしたいときは、物体を電球に近づけるか遠ざけるか考えよう。',
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
          { type: 'region', id: 'r1', x: 280, y: 66, r: 22 },
          { type: 'label', x: 244, y: 72, text: 'ア' },
          { type: 'region', id: 'r2', x: 280, y: 140, r: 22 },
          { type: 'label', x: 244, y: 146, text: 'イ' },
          { type: 'region', id: 'r3', x: 280, y: 210, r: 22 },
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
    ],
  };

  // ---- ステージ straight-2: ものが見えるしくみ（光源と物体、目に届く光） ----
  const straight2 = {
    id: 'straight-2', areaId: 'straight', title: 'ものが見えるしくみ', minutes: 4, concepts: ['straight'],
    lessons: [
      {
        id: 'straight-2-c1',
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
        text: '本のように自分で光を出さないものも見えます。光源の光がものに当たってはね返り、その光が目に入るからです。光を出さないものは、光が当たらないと見えません。',
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
          { type: 'region', id: 'r1', x: 200, y: 50, r: 26 },
          { type: 'label', x: 230, y: 56, text: 'ア' },
          { type: 'region', id: 'r2', x: 230, y: 120, r: 26 },
          { type: 'label', x: 260, y: 126, text: 'イ' },
          { type: 'region', id: 'r3', x: 160, y: 200, r: 26 },
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
    ],
  };

  // ================================================================
  // 領域 2: 光の反射
  // ================================================================

  // ---- ステージ reflect-1: 反射の法則（入射角＝反射角） ----
  const reflect1 = {
    id: 'reflect-1', areaId: 'reflect', title: '反射の法則', minutes: 5, concepts: ['reflect-law'],
    lessons: [
      {
        id: 'reflect-1-c1',
        text: '光が鏡に当たってはね返ることを、光の反射といいます。鏡に当たる光を入射光、はね返った光を反射光といいます。反射したあとも、光はまっすぐに進みます。',
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
        text: '光が鏡に当たった点に、鏡の面に垂直な線を引きます。この線を法線といいます。入射光と法線のなす角を入射角、反射光と法線のなす角を反射角といいます。',
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 180, angle: 0 },
          { type: 'ray', x1: 60, y1: 60, x2: 160, y2: 180, arrow: true },
          { type: 'ray', x1: 160, y1: 180, x2: 260, y2: 60, arrow: true },
          { type: 'label', x: 168, y: 234, text: '法線' },
          { type: 'label', x: 100, y: 95, text: '入射角' },
          { type: 'label', x: 172, y: 95, text: '反射角' },
        ]),
      },
      {
        id: 'reflect-1-c3',
        text: '入射角と反射角は、いつも等しくなります。これを反射の法則といいます。角度は鏡の面からではなく、法線から測ることに気をつけましょう。',
        // 入射角 30° → 反射角 30°
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 180, angle: 0 },
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
          { type: 'normal', x: 160, y: 180, angle: 0 },
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
        id: 'reflect-1-p2', concept: 'reflect-law',
        prompt: '空らんに入る数を入れよう。',
        figure: scene([
          { type: 'mirror', x1: 30, y1: 180, x2: 290, y2: 180 },
          { type: 'normal', x: 160, y: 180, angle: 0 },
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
          { type: 'normal', x: 160, y: 180, angle: 0 },
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
          { type: 'normal', x: 240, y: 140, angle: 90 },
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
          { type: 'normal', x: 130, y: 200, angle: 0 },
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
    ],
  };

  // ---- ステージ reflect-2: 鏡に映る像（像の位置、見える範囲） ----
  const reflect2 = {
    id: 'reflect-2', areaId: 'reflect', title: '鏡に映る像', minutes: 5, concepts: ['mirror-image'],
    lessons: [
      {
        id: 'reflect-2-c1',
        text: '鏡を見ると、鏡の向こう側にものがあるように見えます。これを像といいます。像は、鏡をはさんでものと反対側の、鏡からものまでと同じ距離のところにできます。',
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
        text: 'ものから出た光は、鏡で反射して目に入ります。目は光がまっすぐ来たと感じるので、反射光を鏡の向こうへのばした先にものがあるように見えます。そこが像の位置です。',
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
        text: '鏡に映って見えるかどうかは、像と目を結ぶ直線が鏡の面を通るかどうかで決まります。その直線が鏡の外を通るとき、そのものは鏡に映って見えません。',
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
          { type: 'region', id: 'r1', x: 200, y: 60, r: 22 },
          { type: 'label', x: 162, y: 66, text: 'ア' },
          { type: 'region', id: 'r2', x: 200, y: 121, r: 22 },
          { type: 'label', x: 162, y: 127, text: 'イ' },
          { type: 'region', id: 'r3', x: 200, y: 182, r: 22 },
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
        // ア (150,30): 鏡の位置で y≒65、イ (60,130): y≒124、ウ (150,212): y≒177
        figure: scene([
          { type: 'mirror', x1: 200, y1: 90, x2: 200, y2: 150 },
          { type: 'eye', x: 120, y: 120 },
          { type: 'region', id: 'r1', x: 150, y: 30, r: 22, label: 'ア' },
          { type: 'region', id: 'r2', x: 60, y: 130, r: 22, label: 'イ' },
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
          { type: 'region', id: 'r1', x: 200, y: 70, r: 22 },
          { type: 'label', x: 162, y: 76, text: 'ア' },
          { type: 'region', id: 'r2', x: 200, y: 135, r: 22 },
          { type: 'label', x: 162, y: 141, text: 'イ' },
          { type: 'region', id: 'r3', x: 200, y: 190, r: 22 },
          { type: 'label', x: 162, y: 196, text: 'ウ' },
        ]),
        answer: 'r2',
        explanation: '鏡の向こうの同じ距離のところに像を考え、像と目を直線で結ぶと、鏡とはイで交わります。光はイで反射して目に届きます。',
        hint: '先に像の位置を決めて、像と目を結んでみよう。',
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
  ];

  // ================================================================
  // 単元
  // ================================================================

  const unit = {
    id: 'light',
    title: '光の世界',
    concepts,
    areas: [
      { id: 'straight', title: '光の直進', order: 1, stages: [straight1, straight2] },
      { id: 'reflect', title: '光の反射', order: 2, stages: [reflect1, reflect2] },
      { id: 'refract', title: '光の屈折', order: 3, stages: [] },   // Task 10 で足す
      { id: 'lens', title: '凸レンズ', order: 4, stages: [] },      // Task 10 で足す
    ],
  };

  if (typeof module === 'object' && module.exports) module.exports = { unit };
  else root.RikaQuest.content.register(unit);
})(typeof globalThis !== 'undefined' ? globalThis : this);
