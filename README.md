<p align="center"><img src="icons/icon128.png" width="96" alt="YT Rounds logo"></p>

# YT Rounds · YTラウンド

[English](#english) · [日本語](#日本語)

## English

A small browser extension (Chrome, Vivaldi, Edge) that turns a **YouTube** or **Netflix** video into a listening-practice session in **any language**: split the video into **blocks**, then run each block in four **rounds** with preset speeds.

| Round | Speed | Subtitles | Purpose |
| --- | --- | --- | --- |
| 1 · Blind listen | 0.85x | hidden | Get the gist, topic changes, feel |
| 2 · Parse | 1.0x | shown | Read and listen, find clause boundaries |
| 3 · Shadowing | ramp 0.90 → 1.00x | as is | Loop 3–4 sentences, speed rises each pass |
| 4 · Receipt | 1.0x | hidden | Final blind listen |

All speeds, the round-3 ramp (from / to / passes) and the cover-bar height are adjustable.

### Install
1. Download the zip from [Releases](../../releases) (or clone this repo).
2. Open `chrome://extensions` (or `vivaldi://extensions`), enable Developer mode.
3. Click **Load unpacked** and choose the folder.

### Use
1. Open a YouTube or Netflix video and click the **Rounds** tab on the right edge. The panel is switched on per video and remembered.
2. Open ⚙ Settings. Set **I am learning** (the language of the video) and **My language** (the language Gemini explains in). Any language works: pick from the list or type your own.
3. Enter blocks, one per line: `0:00 - 3:36 Name`, or chapters: `0:00 Name`. On YouTube, "Get chapters from description" fills them in.
4. Click a block, pick a round. Playback jumps to the block at the round's speed and stops at the end (or loops).
5. For round 3, press **Mark clip** (Alt+M) at a sentence start and again at its end. Repeat for 3–4 sentences.
6. **Copy prompt** (EN / 日本語) copies a ready-made coach prompt for Gemini, with your two languages filled in.
   - **YouTube:** the prompt contains the video link.
   - **Netflix:** the prompt contains the **full subtitles** as `[h:mm:ss] line`. Netflix only downloads subtitles you have switched on, so turn on subtitles in the language you study and reload the episode. If several tracks are captured, pick one in the panel. **Download .srt** saves the same track as a file.
7. **Gemini** opens gemini.google.com in a small side window (it cannot be embedded in the video page).

Shortcuts: Alt+1–4 round · Alt+←/→ block · Alt+R replay · Alt+M mark clip.

Notes: on Netflix, rounds 1 and 4 hide Netflix's own subtitles instead of drawing a bar, and round 2 does not switch subtitles on for you. The UI follows your browser language (English / 日本語) and can be switched in the panel header. Blocks, clips and settings are stored locally in your browser. The extension only reads the subtitle files the Netflix player has already downloaded; it sends nothing anywhere except what you paste into Gemini yourself.

Netflix support is built from public knowledge of the web player and was not tested against every title or region. The technique (listening to the player's subtitle downloads, seeking through the player API) is the one used by [Ukai](https://github.com/SonicSandbox/ukai); no code was copied.

## 日本語

YouTubeまたはNetflixの動画を**ブロック**に分け、ブロックごとに4つの**ラウンド**（あらかじめ設定した速度）で、**どの言語でも**聞き込み練習ができるブラウザ拡張機能です（Chrome / Vivaldi / Edge）。

| ラウンド | 速度 | 字幕 | 目的 |
| --- | --- | --- | --- |
| 1 · ブラインド | 0.85倍 | 隠す | 全体像・話題の転換・雰囲気をつかむ |
| 2 · 構文分解 | 1.0倍 | 表示 | 読みながら聞き、節の区切りを探す |
| 3 · シャドーイング | 0.90→1.00倍に上昇 | そのまま | 3〜4文をループし、1回ごとに速度アップ |
| 4 · 確認 | 1.0倍 | 隠す | 最後に字幕なしで通して聞く |

速度、ラウンド3のランプ（開始・終了・回数）、字幕を隠すバーの高さは変更できます。

### インストール
1. [Releases](../../releases)からzipをダウンロードします（またはリポジトリをクローン）。
2. `chrome://extensions`（Vivaldiは `vivaldi://extensions`）を開き、デベロッパーモードをオンにします。
3. 「パッケージ化されていない拡張機能を読み込む」でフォルダを選びます。

### 使い方
1. YouTubeまたはNetflixの動画を開き、右端の**ラウンド**タブを押します。パネルは動画ごとにオン/オフでき、記憶されます。
2. ⚙設定で**学習している言語**（動画の言語）と**自分の言語**（Geminiが解説に使う言語）を設定します。どの言語でも使えます。リストから選ぶか、自由に入力してください。
3. ブロックを1行に1つ入力します：`0:00 - 3:36 名前`、またはチャプター形式 `0:00 名前`。YouTubeでは「概要欄のチャプターを取得」も使えます。
4. ブロックをクリックしてラウンドを選ぶと、そのラウンドの速度でブロックの先頭から再生され、終わりで停止（またはループ）します。
5. ラウンド3では、文の始まりと終わりで**クリップを記録**（Alt+M）を押します。3〜4文ぶん繰り返します。
6. **プロンプトをコピー**（EN / 日本語）で、2つの言語を反映したGemini用コーチプロンプトをコピーできます。
   - **YouTube：** 動画リンク入りのプロンプトです。
   - **Netflix：** **字幕全文**を `[h:mm:ss] セリフ` の形式で含めます。Netflixはオンにした字幕しかダウンロードしないため、学習言語の字幕をオンにしてエピソードを再読み込みしてください。複数のトラックが取得された場合はパネルで選べます。**.srtをダウンロード**で同じトラックをファイルとして保存できます。
7. **Gemini**ボタンで、gemini.google.comを小さな別ウィンドウで開きます（動画ページには埋め込めません）。

ショートカット：Alt+1–4 ラウンド · Alt+←/→ ブロック · Alt+R もう一度 · Alt+M クリップ。

補足：Netflixではラウンド1と4でバーの代わりにNetflix自身の字幕を非表示にします。ラウンド2で字幕を自動でオンにすることはしません。表示言語はブラウザの言語に合わせて英語/日本語になり、パネル上部で切り替えられます。ブロック・クリップ・設定はブラウザ内にのみ保存されます。拡張機能はNetflixのプレーヤーがすでにダウンロードした字幕ファイルを読むだけで、ご自身でGeminiに貼り付けるもの以外は何も送信しません。

NetflixのサポートはWebプレーヤーの公開情報をもとにしており、すべての作品・地域で検証したわけではありません。手法（プレーヤーの字幕ダウンロードを監視し、プレーヤーAPIでシークする）は[Ukai](https://github.com/SonicSandbox/ukai)と同じですが、コードはコピーしていません。

## License
MIT
