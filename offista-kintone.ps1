# 無限ループ
while ($true) {
    # 指定されたディレクトリに移動
    Set-Location -Path "プロジェクトファイルのパス"
    
    # 会社名の入力を求める
    $companyName = Read-Host "会社名を正確に入力してください。（例）株式会社レンシュウ２"

    # Node.jsを実行し、入力した会社名を渡す
    node kintone_sync.js $companyName

    # 再度実行するか確認
    $retry = Read-Host "もう一度実行しますか？ (y/n)"
    
    # "n" または "N" が入力されたらループを終了
    if ($retry -eq "n" -or $retry -eq "N") {
        Write-Host "スクリプトを終了します。"
        break
    }
}

# スクリプトの終了を待機
Pause
