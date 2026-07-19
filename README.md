# べるがクエスト 〜生命の樹と94人の精霊〜

尾白の森・名水公園べるが(山梨県北杜市)向けの、現地体験型ブラウザRPGです。単一の `index.html` で完結する構成で、GitHub Pagesでそのまま公開できます。

## 構成
- `index.html` … ゲーム本体。画像(精霊イラスト等)はすべてbase64で埋め込み済み、ビルド不要。
- 保存:ブラウザの`localStorage`に進行状況を保存(キー: `vergaquest_save_v3`)。
- 実績送信:ボス撃破時に、Firebase(匿名認証+Firestore)へ `{name, spiritCount, elapsedSec}` を1件送信。ゲームの進行自体はlocalStorageのみで完結し、Firebase送信が失敗してもプレイは止まりません。

## ver 0.4 の追加内容
### サブスポット(マップの残り5ピンを解放)
マップ上で ✨ が光っている場所はタップでミニイベントが遊べます(訪問済みは ⭐ に変化)。

| ピン | 場所 | 内容 | 報酬 |
|---|---|---|---|
| ② | 尾白の湯 | 温泉につかる | 初回:「湯の花のお守り」(まもり+25) |
| ④ | 雑貨&cafe sunny pick | モリノコのお茶会 | 初回:「木もれ日クッキー」(こうげき+12)+かけらのあい言葉ヒント |
| ⑥ | 親水池 | 水切りミニゲーム(タイミングで3投) | 成功2回以上でしずく+1(2回まで) |
| ⑦ | 水汲み場 | 水の3たくクイズ | 正解でしずく獲得(初回2こ、計3回まで) |
| ⑧ | 陽だまり広場 | ひなたぼっこ→ランダムな精霊が来訪 | EXP+30(3回まで) |

5スポットすべて訪問すると「べるがめぐり たっせい!」ボーナス(しずく+1)。生命の樹の画面とエンディングに進捗が表示されます。

### エリア別ガイド精霊
- 森=モリノコ / えん堤=ピチャン / イベント広場=ハナハナ / グランピング=キノット
- エリアの3チャレンジをすべてクリアすると、そのガイド精霊が仲間になります。

### コンテンツ増量
- 3たくクイズ:5問→20問(北杜市・尾白川・甲斐駒ヶ岳・森の自然ネタ)
- なぞとき:3問→12問
- 出題済みの問題はセーブに記録され、全問出きるまで同じ問題は出ません。

### 図鑑の強化
- 属性別フィルタタブ(🌈/🌸/🪨/🌳/🍄/💧/🍂)+属性ごとの収集数表示
- 新規入手した精霊に「NEW」バッジ(詳細を見ると消えます)

### 60分クエストタイマー
- なまえを入力してクエストを開始した時点から、画面右下(バトル中は右上)に60分のカウントダウンを常時表示。
- 残り10分で警告色+お知らせトースト、残り5分で赤点滅、0分で「60分たったよ!」のお知らせ(プレイは止まりません)。
- 開始時刻はセーブされるため、リロード・「つづきから」でも正しく続きから数えます。
- 制限時間は `index.html` 内の `QUEST_LIMIT_MIN` 定数(既定60)で変更できます。

### 修正
- メニューの「はじめから」がセーブデータを消していなかった問題を修正(確認ダイアログつき)
- マップ看板の「100人の精霊」表記を「94人」に修正(画像を加工)
- お守り系アイテムの「まもり」がバトルの防御力に反映されるように

## 自動テスト
`tests/` にPlaywright製の通しプレイテストがあります(要 Node.js)。

```
npm install playwright
node tests/test_full.js            # 新規開始→森→3チャレンジ→ボス撃破→エンディング→つづきから→リセット
node tests/test_area2.js           # えん堤エリア+ガイド仲間化+報酬上限+ボーナス召喚
node tests/test_spots_complete.js  # 5スポット制覇ボーナス+訪問マーク+再読込
node tests/test_timer.js           # 60分タイマー(警告・時間切れ・復元)
```
Chromiumの実行パスは環境に合わせて `executablePath` を調整してください(Playwright同梱のChromiumなら `chromium.launch()` だけでOK)。

## Firebaseセットアップ(実績送信を使う場合)
1. Firebaseプロジェクトを作成し、Webアプリを追加してconfigを取得(`index.html`末尾の`<script type="module">`内の`firebaseConfig`に反映済み)
2. Authentication → Sign-in method → 匿名 を有効化
3. Firestore Database を作成(リージョン例: `asia-northeast1`、本番環境モード)
4. Firestore のルールを以下に置き換えて公開:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /completions/{doc} {
      allow read: if false;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['uid','name','spiritCount','elapsedSec','completedAt'])
        && request.resource.data.name is string && request.resource.data.name.size() <= 12
        && request.resource.data.spiritCount is int
        && request.resource.data.spiritCount >= 0 && request.resource.data.spiritCount <= 94
        && request.resource.data.elapsedSec is int
        && request.resource.data.elapsedSec >= 0 && request.resource.data.elapsedSec <= 21600;
      allow update, delete: if false;
    }
  }
}
```

設計方針:configはクライアントに公開される前提とし、安全性は上記ルール(作成のみ・読み取り不可・型と範囲を強制)で担保しています。

## エリアの暗号(現地謎解き用コード)
`index.html`内の`AREAS`定数で管理。現在は仮値`0000`(全エリア共通)。現地の看板等に合わせて本番用の値に変更してください。

## 生命の樹の「ひみつのあい言葉」
`index.html`内の`KAKERA_PASSWORD`で管理。現在は仮値「みずのこえ」。sunny pickのお茶会イベントでプレイヤーにヒントが出ます(あい言葉を変える場合はヒント文言も合わせて変更してください)。
