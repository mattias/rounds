<p align="center"><img src="icons/icon128.png" width="96" alt="YT Rounds logo"></p>

# YT Rounds · YTラウンド

[English](#english) · [日本語](#日本語)

## English

A small browser extension (Chrome, Vivaldi, Edge) that turns a YouTube video into a listening-practice session: split the video into **blocks**, then run each block in four **rounds** with preset speeds.

| Round | Speed | Subtitles | Purpose |
| --- | --- | --- | --- |
| 1 · Blind listen | 0.85x | hidden (cover bar) | Get the gist, topic changes, feel |
| 2 · Parse | 1.0x | shown (CC switched on) | Read and listen, find clause boundaries |
| 3 · Shadowing | ramp 0.90 → 1.00x | as is | Loop 3–4 sentences, speed rises each pass |
| 4 · Receipt | 1.0x | hidden | Final blind listen |

All speeds, the round-3 ramp (from / to / passes) and the cover-bar height are adjustable.

### Install
1. Download or clone this repo.
2. Open `chrome://extensions` (or `vivaldi://extensions`), enable Developer mode.
3. Click **Load unpacked** and choose this folder.

### Use
1. Open a YouTube video and click the **Rounds** tab on the right edge. The panel is switched on per video and remembered.
2. Open ⚙ Settings and enter blocks, one per line: `0:00 - 3:36 Name`, or chapters: `0:00 Name`. "Get chapters from description" fills them in.
3. Click a block, pick a round. Playback jumps to the block at the round's speed and stops at the end (or loops).
4. For round 3, press **Mark clip** (Alt+M) at a sentence start and again at its end. Repeat for 3–4 sentences.
5. **Gemini** opens gemini.google.com in a small side window (it cannot be embedded in YouTube).

6. **Copy Gemini prompt** (EN / 日本語) copies a ready-made coach prompt with the video link filled in. Paste it into Gemini to get block-by-block comprehension quizzes.

Shortcuts: Alt+1–4 round · Alt+←/→ block · Alt+R replay · Alt+M mark clip.

The UI follows your browser language (English / 日本語) and can be switched in the panel header.
Blocks, clips and settings are stored locally in your browser. Nothing is sent anywhere.

## 日本語

YouTube動画を**ブロック**に分け、ブロックごとに4つの**ラウンド**（あらかじめ設定した速度）で聞き込み練習をするための、ブラウザ拡張機能です（Chrome / Vivaldi / Edge）。

| ラウンド | 速度 | 字幕 | 目的 |
| --- | --- | --- | --- |
| 1 · ブラインド | 0.85倍 | 隠す | 全体像・話題の転換・雰囲気をつかむ |
| 2 · 構文分解 | 1.0倍 | 表示（CCをオン） | 読みながら聞き、節の区切りを探す |
| 3 · シャドーイング | 0.90→1.00倍に上昇 | そのまま | 3〜4文をループし、1回ごとに速度アップ |
| 4 · 確認 | 1.0倍 | 隠す | 最後に字幕なしで通して聞く |

速度、ラウンド3のランプ（開始・終了・回数）、字幕を隠すバーの高さは変更できます。

### インストール
1. このリポジトリをダウンロードまたはクローンします。
2. `chrome://extensions`（Vivaldiは `vivaldi://extensions`）を開き、デベロッパーモードをオンにします。
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選びます。

### 使い方
1. YouTube動画を開き、右端の**ラウンド**タブを押します。パネルは動画ごとにオン/オフでき、記憶されます。
2. ⚙設定でブロックを1行に1つ入力します：`0:00 - 3:36 名前`、またはチャプター形式 `0:00 名前`。「概要欄のチャプターを取得」も使えます。
3. ブロックをクリックしてラウンドを選ぶと、そのラウンドの速度でブロックの先頭から再生され、終わりで停止（またはループ）します。
4. ラウンド3では、文の始まりと終わりで**クリップを記録**（Alt+M）を押します。3〜4文ぶん繰り返します。
5. **Gemini**ボタンで、gemini.google.comを小さな別ウィンドウで開きます（YouTubeの中には埋め込めません）。

6. **Gemini用プロンプトをコピー**（EN / 日本語）で、動画リンク入りのコーチ用プロンプトをコピーできます。Geminiに貼り付けると、ブロックごとの理解度クイズが始まります。

ショートカット：Alt+1–4 ラウンド · Alt+←/→ ブロック · Alt+R もう一度 · Alt+M クリップ。

表示言語はブラウザの言語に合わせて英語/日本語になり、パネル上部で切り替えられます。
ブロック・クリップ・設定はブラウザ内にのみ保存され、外部には送信されません。

## License
MIT
