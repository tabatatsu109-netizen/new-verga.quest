# べるがクエスト 〜生命の樹と94人の精霊〜

尾白の森・名水公園べるが（山梨県北杜市）向けの、現地体験型ブラウザRPGです。単一の `index.html` で完結する構成で、GitHub Pagesでそのまま公開できます。

## 構成
- `index.html` … ゲーム本体。画像（精霊イラスト等）はすべてbase64で埋め込み済み、ビルド不要。
- 保存：ブラウザの`localStorage`に進行状況を保存（キー: `vergaquest_save_v2`）。
- 実績送信：ボス撃破時に、Firebase（匿名認証＋Firestore）へ `{name, spiritCount, elapsedSec}` を1件送信。ゲームの進行自体はlocalStorageのみで完結し、Firebase送信が失敗してもプレイは止まりません。

## Firebaseセットアップ（実績送信を使う場合）
1. Firebaseプロジェクトを作成し、Webアプリを追加してconfigを取得（`index.html`末尾の`<script type="module">`内の`firebaseConfig`に反映済み）
2. Authentication → Sign-in method → 匿名 を有効化
3. Firestore Database を作成（リージョン例: `asia-northeast1`、本番環境モード）
4. Firestore のルールを以下に置き換えて公開：

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

設計方針：configはクライアントに公開される前提とし、安全性は上記ルール（作成のみ・読み取り不可・型と範囲を強制）で担保しています。

## エリアの暗号（現地謎解き用コード）
`index.html`内の`AREAS`定数で管理。現在は仮値`0000`（森・えん堤とも）。現地の看板等に合わせて本番用の値に変更してください。
