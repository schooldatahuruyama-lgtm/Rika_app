# オリジナルアバター

2026-11-04 に ChatGPT の組み込み image_gen で新規生成。参照画像なし、背景透過あり。CLI/API は使用していません。

アプリ用画像は `256 × 256` の PNG。生成原本は `originals/` に保存し、縮小時も透明度を保持しています。

| 名前 | アプリ用画像 | 保存済みプロフィールの ID |
|---|---|---|
| ポヨン | [poyon.png](poyon.png) | `fox` |
| モジャリ | [mojari.png](mojari.png) | `cat` |
| ニョッキ | [nyokki.png](nyokki.png) | `dog` |
| プルモ | [purumo.png](purumo.png) | `panda` |
| ムクリ | [mukuri.png](mukuri.png) | `frog` |
| ネムネ | [nemune.png](nemune.png) | `penguin` |

## 使用したプロンプト

各画像は下記の共通プロンプトに、それぞれの Subject を続けて生成しました。

### 共通

Use case: stylized-concept. Asset type: a single original character avatar for a Japanese middle-school science learning app. Create an unusually memorable, slightly weird but deeply endearing little imaginary creature, with awkward charm and a funny vacant expression. Entirely original design, not a recognizable animal, not a famous mascot, not a generic emoji. Art direction: premium hand-painted storybook monster, simple confident slightly imperfect dark plum pencil contour, matte gouache fills with very subtle paper-like texture, broad shapes, gentle minimal shading, bold warm colors softened just enough, eyes white with small charcoal pupils. Quirky rather than baby-cute; avoid sparkly anime eyes, slick 3D, realism, horror, or slime. Single character alone, full body centered in a square canvas, large readable silhouette occupies 82 percent of the canvas with comfortable safe margins around every extremity; face is prominent and legible at 36 pixels. Front or slight three-quarter view. Real transparent background, no environment, no ground, no card border, no text, no letters, no watermark, no extra characters. Keep all color inside the character. Output square PNG.

### ポヨン

Subject: A warm coral-red asymmetric dumpling-shaped creature with exactly one large off-center white eye, a tiny puzzled sideways mouth with one rounded tooth, two short noodle arms and two tiny dark plum feet. Its body is a large funny bean shape with two soft lopsided bumps at the top, not ears. A little peach blush. Friendly and awkward, giving a tiny wave.

### モジャリ

Subject: A mustard yellow fuzzy pear-shaped creature whose body edge has 10 large rounded shaggy tufts, with two very close white eyes of different sizes, looking in slightly different directions, a tiny downturned mouth that looks puzzled rather than sad, three short raspberry colored hairs leaning left, and two very thin raspberry legs with wide rounded feet. Tiny short arms. Funny and endearing.

### ニョッキ

Subject: A teal turquoise crooked soft column-shaped creature, wide and squat enough to work as an avatar, its top bends into a gentle sideways hook. Exactly three short eyestalks on top with white eyes looking curiously in different directions; a tiny warm pink smiling mouth on its body, two short crooked arms with mitten hands and two stubby purple feet. Distinctive wobbly asymmetric shape, charming and curious.

### プルモ

Subject: A lilac lavender soft triangular blob creature shaped like a rounded uneven mountain, with two big white eyes positioned unevenly, one tiny round open mouth, three short chunky rounded feet along its base and two little stubby arms held open. A single short curled pink antenna on top and two cream oval spots on its tummy. Odd, relaxed and friendly, matte and opaque rather than jelly.

### ムクリ

Subject: A bright leafy green wide squat cushion-shaped creature with a softly scalloped outline, two tall white oval eyes directly on its face at different heights, a tiny shy sideways smile, two very large goofy rounded pink feet that point outward, and tiny arms. One absurd small orange spiral tuft on top, two mint cheeks. It is not a frog or any animal: no frog mouth, no frog eyes on top, no ears or tail. Clumsy, kind and appealing.

### ネムネ

Subject: A pale sky-blue odd upside-down raindrop-shaped creature, with a wide round top tapering to a short bottom, two half-lidded white eyes with tiny pupils and a sleepy contented crooked smile, a single floppy coral fin-like flap on one side of its head, two very short arms and three tiny dark blue feet. A few cream freckles below its eyes. Offbeat, dreamy and huggable, not a bird, fish, or ordinary animal.

