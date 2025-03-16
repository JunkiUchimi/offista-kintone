const axios = require('axios');
const fs = require('fs');

// APIのエンドポイント
const apiEndpoint = 'https://service.officestation.jp/5w7a87/GET_API_KEY'; // 修正: エンドポイントを更新

// リクエストデータ
const requestData = {
    uid: '5wcsewsdg4', 
    upw: 'fqn33Pzz',   
    eml: 'k-tokura@nkr-group.com' 
};

// APIコール
axios.post(apiEndpoint, requestData)
    .then(response => {
        const apiKey = response.data.api_key;
        if (apiKey) {
            // APIキーをファイルに保存
            fs.writeFileSync('api_key.txt', apiKey);
            console.log('APIキーをapi_key.txtに保存しました。');
        } else {
            console.log('APIキーの取得に失敗しました。');
            console.log('ステータスコード:', response.status);
            console.log('レスポンスデータ:', response.data);
        }
    })
    .catch(error => {
        if (error.response) {
            console.error('ステータスコード:', error.response.status);
            console.error('エラーメッセージ:', error.response.data);
        } else if (error.request) {
            console.error('リクエストエラー:', error.request);
        } else {
            console.error('エラー', error.message);
        }
    });