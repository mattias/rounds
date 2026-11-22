<p align="center"><img src="icons/icon128.png" width="96" alt="Rounds logo"></p>

# Rounds

[English](#english) · [日本語](#日本語)

## English

A small browser extension (Chrome, Vivaldi, Edge) that turns a **YouTube** or **Netflix** video into a listening-practice session in **any of 70+ languages**: split the video into **blocks**, then run each block in four **rounds** with preset speeds.

| Round | Speed | Subtitles | Purpose |
| --- | --- | --- | --- |
| 1 · Blind listen | 0.85x | covered | Get the gist, topic changes, feel |
| 2 · Parse | 1.0x | shown | Read and listen, find clause boundaries |
| 3 · Shadowing | ramp 0.90 → 1.00x | as is | Loop 3–4 sentences, speed rises each pass |
| 4 · Receipt | 1.0x | covered | Final blind listen |

### Install
1. Download the zip from [Releases](../../releases) (or clone this repo) and unzip it.
2. Open `chrome://extensions` (or `vivaldi://extensions`), enable Developer mode.
3. Click **Load unpacked** and choose the folder.
4. A setup page opens: choose the **interface language**, the **language you are learning** and the **language you want feedback in** (it can be the same as the one you learn).

### Use
1. Open a YouTube or Netflix video and click the **Rounds** tab on the right edge. The panel is switched on per video and remembered.
2. Click the **extension button** in the toolbar to add the video's blocks (`0:00 - 3:36 Name`, or chapters `0:00 Name`; on YouTube "Get chapters from description" fills them in) and to change languages, speeds, the round-3 ramp and the cover bars. The panel itself stays minimal.
3. Click a block, pick a round. Playback jumps to the block at the round's speed and stops at the end (or loops).
4. For round 3, press **Mark clip** (Alt+M) at a sentence start and again at its end. Repeat for 3–4 sentences.
5. **Copy prompt** copies a ready-made Gemini coach prompt with your languages filled in (instructions in English or Japanese, your choice). On YouTube it contains the video link. On Netflix it contains the **full subtitles** as `[h:mm:ss] line`. Netflix only downloads subtitles you have switched on, so turn them on in the language you study and reload the episode. **⬇ .srt** saves the same track. ✦ opens Gemini in a small side window.
6. **Cover bars:** a top and a bottom black bar, each with its own percentage (default: bottom 24%, top off), hide hard-coded subtitles in rounds 1 and 4. On Netflix its own subtitles are hidden too.

Shortcuts: Alt+1–4 round · Alt+←/→ block · Alt+R replay · Alt+M mark clip.

### Mobile web app (YouTube only)
For phones and tablets there is a small installable web app in [`docs/`](docs), published with GitHub Pages: **https://mattias.github.io/rounds/**. Open it, add it to your home screen, paste or share a YouTube link, add the blocks (paste Gemini's list straight in) and run the same four rounds, clips with the speed ramp, loop, the Gemini prompt, all languages and the 8 interface languages. **Export / Import** (in the app and in the extension's popup, same file format) moves your blocks, clips and settings between devices. The **Local** tab plays your own video or audio file with `.srt`, `.vtt` or `.ass` subtitles (pick the files, or drop them on a computer): same rounds and clips, our own subtitle text that is hidden in the blind rounds, exact speeds, cover bars for hard-coded subtitles, and a prompt that includes the whole subtitle text. Playback depends on your browser: mp4 (H.264/AAC) works everywhere, mkv mostly in Chrome on a computer. Embedded subtitles inside mkv/mp4 are not supported yet. Netflix is not possible on mobile, and the cover bars are left out for YouTube videos because YouTube's rules do not allow drawing anything over an embedded player. The embedded player plays in 0.05 steps, so a ramp step of 0.93x plays as 0.90x. After changing shared code, run `node tools/sync-web.js`.

Blocks, clips and settings are stored locally in your browser. The extension only reads the subtitle files the Netflix player has already downloaded and sends nothing anywhere except what you paste into Gemini yourself. The interface is available in English, 日本語, Svenska, Español, Français, Deutsch, 한국어 and 中文.

Netflix support is built from public knowledge of the web player and was not tested against every title or region. The technique (listening to the player's subtitle downloads, seeking through the player API) is the one used by [Ukai](https://github.com/SonicSandbox/ukai); no code was copied.

## 日本語

YouTubeまたはNetflixの動画を**ブロック**に分け、ブロックごとに4つの**ラウンド**（あらかじめ設定した速度）で、**70以上の言語**で聞き込み練習ができるブラウザ拡張機能です（Chrome / Vivaldi / Edge）。

| ラウンド | 速度 | 字幕 | 目的 |
| --- | --- | --- | --- |
| 1 · ブラインド | 0.85倍 | 隠す | 全体像・話題の転換・雰囲気をつかむ |
| 2 · 構文分解 | 1.0倍 | 表示 | 読みながら聞き、節の区切りを探す |
| 3 · シャドーイング | 0.90→1.00倍に上昇 | そのまま | 3〜4文をループし、1回ごとに速度アップ |
| 4 · 確認 | 1.0倍 | 隠す | 最後に字幕なしで通して聞く |

### インストール
1. [Releases](../../releases)からzipをダウンロード（またはクローン）して展開します。
2. `chrome://extensions`（Vivaldiは `vivaldi://extensions`）を開き、デベロッパーモードをオンにします。
3. 「パッケージ化されていない拡張機能を読み込む」でフォルダを選びます。
4. 設定ページが開くので、**表示言語**、**学習している言語**、**フィードバックを受けたい言語**を選びます（学習言語と同じでも構いません）。

### 使い方
1. YouTubeまたはNetflixの動画を開き、右端の**ラウンド**タブを押します。パネルは動画ごとにオン/オフでき、記憶されます。
2. ツールバーの**拡張機能ボタン**から、動画のブロック（`0:00 - 3:36 名前`、またはチャプター形式 `0:00 名前`。YouTubeでは「概要欄のチャプターを取得」も可）の追加と、言語・速度・ラウンド3のランプ・隠しバーの設定ができます。パネル自体は最小限です。
3. ブロックをクリックしてラウンドを選ぶと、そのラウンドの速度でブロックの先頭から再生され、終わりで停止（またはループ）します。
4. ラウンド3では、文の始まりと終わりで**クリップを記録**（Alt+M）を押します。3〜4文ぶん繰り返します。
5. **プロンプトをコピー**で、言語設定を反映したGemini用コーチプロンプトをコピーします（指示文は英語か日本語を選択）。YouTubeでは動画リンク、Netflixでは**字幕全文**（`[h:mm:ss] セリフ`）が入ります。Netflixはオンにした字幕しかダウンロードしないため、学習言語の字幕をオンにして再読み込みしてください。**⬇ .srt**で同じトラックを保存できます。✦でGeminiを別ウィンドウで開きます。
6. **隠しバー：** 上と下の黒いバーをそれぞれ％で設定でき（初期値は下24%、上はオフ）、ラウンド1と4で焼き込み字幕を隠します。Netflixでは自身の字幕も非表示になります。

ショートカット：Alt+1–4 ラウンド · Alt+←/→ ブロック · Alt+R もう一度 · Alt+M クリップ。

### モバイル用Webアプリ（YouTubeのみ）
スマホ・タブレット向けに、[`docs/`](docs)にインストール可能な小さなWebアプリがあり、GitHub Pagesで公開されています：**https://mattias.github.io/rounds/**。開いてホーム画面に追加し、YouTubeのリンクを貼り付け（または共有）、ブロックを追加（Geminiの一覧をそのまま貼り付け可）すれば、同じ4つのラウンド、速度ランプ付きクリップ、ループ、Gemini用プロンプト、全言語、8つの表示言語が使えます。**エクスポート／インポート**（アプリと拡張機能のポップアップの両方、同じファイル形式）で、ブロック・クリップ・設定を端末間で移せます。**ローカル**タブでは、お持ちの動画・音声ファイルを `.srt` / `.vtt` / `.ass` 字幕つきで再生できます（ファイルを選択、またはパソコンではドロップ）。同じラウンドとクリップ、ブラインドのラウンドで隠れる独自の字幕表示、正確な速度、焼き込み字幕用の隠しバー、字幕全文入りのプロンプトが使えます。再生可否はブラウザ次第です：mp4（H.264/AAC）はどこでも、mkvは主にパソコンのChromeで再生できます。mkv/mp4に埋め込まれた字幕は未対応です。Netflixはモバイルでは対応できず、YouTube動画では隠しバーはYouTubeの規約上、埋め込みプレーヤーの上に何も重ねられないため含まれていません。埋め込みプレーヤーは0.05刻みで再生するため、0.93倍は0.90倍で再生されます。

ブロック・クリップ・設定はブラウザ内にのみ保存されます。拡張機能はNetflixのプレーヤーがすでにダウンロードした字幕ファイルを読むだけで、ご自身でGeminiに貼り付けるもの以外は何も送信しません。表示言語は English / 日本語 / Svenska / Español / Français / Deutsch / 한국어 / 中文 に対応しています。

NetflixのサポートはWebプレーヤーの公開情報をもとにしており、すべての作品・地域で検証したわけではありません。手法は[Ukai](https://github.com/SonicSandbox/ukai)と同じですが、コードはコピーしていません。

## License
MIT
