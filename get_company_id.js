const axios = require('axios');

// KintoneのAPI設定
const subdomain = 'nkr-group'; // あなたのサブドメインを入力してください
const appId = "app_id"; // アプリIDを入力してください
const apiToken = 'api_token'; // APIトークンを入力してください

const fields = [
    'レコード番号'
];

const getCompanyRecordId = async (companyName) => {
    const query = `会社名 = "${companyName}"`;

    try {
        const response = await axios.get(`https://${subdomain}.cybozu.com/k/v1/records.json`, {
            headers: {
                'X-Cybozu-API-Token': apiToken
            },
            params: {
                app: appId,
                query: query,
                fields: fields
            }
        });

        const records = response.data.records;
        if (records.length > 0) {
            return records[0]['レコード番号'].value;
        } else {
            console.log('該当するレコードが見つかりませんでした。');
            return null;
        }
    } catch (error) {
        console.error('エラーが発生しました:', error.response ? error.response.data : error.message);
        return null;
    }
};

module.exports = { getCompanyRecordId };
// 使用例
// 他のファイルからこの関数を呼び出し、companyNameを渡す
// const companyId = await getCompanyRecordId('会社名をここに入力');
