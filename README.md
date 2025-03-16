# Kintone Sync Script

Office StationからKintoneにデータを同期するためのスクリプト。APIを活用し、従業員データを取得してKintoneのアプリに登録または更新する。

## ファイル構成

- **kintone_sync.js**: メインスクリプト。データ取得・変換・同期を行う。
- **get_company_id.js**: `getCompanyRecordId` 関数を提供するモジュール。
- **transfer_field_2.7.json**: データの変換ルールを記載したJSONファイル。
- **api_key.txt**: APIキーを保存したファイル）。
- **その他の依存ファイル**: Node.jsモジュール（`axios`, `fs` など）。

## 前提条件

1. Node.js（推奨バージョン: 16以上）がインストールされていること。
2. 必要な外部モジュールをインストールしていること（`npm install` を実行）。
3. KintoneのホストURLおよびアプリID・APIトークンが正しく設定されていること。

## セットアップ

1. 必要な依存モジュールをインストールする。

   ```bash
   npm install
   ```
2. 以下のリンクから設定ファイルをダウンロードし、指定された場所に配置してください:
   - [kintone_app_config.json](https://drive.google.com/file/d/1TAyBk_U831SOoRymuuU6eOmhCkH0-Y8-/view?usp=sharing_link) -> `config/kintone_app_config.json`
3. offista-kintone.ps1のショートカットを作成し、デスクトップにコピーします。
4. デスクトップからこのショートカットを起動します。

## 使用方法

1. コマンドライン引数として会社名を指定して実行する。

   ```bash
   node kintone_sync.js "株式会社レンシュウ"
   ```

2. 実行時に以下のプロセスが行われる。
   - 指定した会社名に基づいてデータを取得。
   - JSONデータをKintoneのレコード形式に変換。
   - 既存レコードの検索、新規作成または更新を実行。

## 主な機能

- **fetchAndSyncEmployees(companyName)**: 指定された会社名の従業員データを取得し、Kintoneに同期。
- **processJsonData(companyName, jsonData, companyRecordId)**: 取得データの変換と同期処理。
- **buildKintoneRecord(record, companyName, personType, companyRecordId)**: レコード変換ルールを適用してKintone用のデータを作成。
- **loadConversionRules()**: データ変換ルールを読み込み。

## 注意点

- Kintoneアプリの構造が変更された場合、このスクリプト内のフィールドマッピングを更新する必要があります。

## 修正方法

スクリプトの修正が必要になった場合は、以下のポイントを考慮してください。

- 新しいフィールドが追加された場合、`transfer_field_2.7.json` にマッピングを追加してください。
- 新しいデータ変換ルールが必要な場合、`loadConversionRules` 関数を拡張してください。
- 依存関数（`get_company_id.js`など）を変更する場合は、他の関数への影響を確認してください。

## Author

2025 Junki Uchimi
