const axios = require('axios');
const fs = require('fs');

// KintoneのホストURL
const hostUrl = 'https://nkr-group.cybozu.com';

// APIキーを読み込む
const apiKey = fs.readFileSync('api_key.txt', 'utf8').trim();

// transfer_field_2.7.json のパス
const transferFieldPath = './transfer_field_2.7.json';

// APIのエンドポイント
const apiEndpoint = 'https://service.officestation.jp/5w7a87/GET_EMPLOYEE';
const { getCompanyRecordId } = require('./get_company_id');

// Kintone設定（本人と家族のアプリIDおよびAPIトークン）
const kintoneConfig = {
    "本人": {
        "appId": "app_id",
        "apiToken": "api_token"
    },
    "家族": {
        "appId": "app_id",
        "apiToken": "api_token"
    },
    "配偶者": {
        "appId": "app_id",
        "apiToken": "api_token"
    }
};

// 変換ルールを読み込む関数
const loadConversionRules = () => {
    return {
        relationship: {
            1: "夫",
            2: "妻",
            3: "父",
            4: "母",
            5: "子",
            6: "兄",
            7: "弟",
            8: "姉",
            9: "妹",
            10: "祖父",
            11: "祖母",
            12: "孫",
            99: "その他"
        },
        si_support: {
            1: "該当する",
            2: "該当しない"
        },
        sex: {
            1: "男",
            2: "女"
        },
        is_foreigner: {
            1: "該当する"
        },
        activity_out_qualification: {
            1: "有",
            2: "無"
        },
        dispatch_contract_working_classification: {
            1: "該当",
            2: "非該当"
        },
        handicapped_div: {
            0: "該当しない",
            1: "一般の障害者",
            2: "特別障害者",
            3: "同居特別障害者"
        },
        wage_classification: {
            1: "月給",
            2: "週給",
            3: "日給",
            4: "時間給",
            5: "その他",
            6: "年俸制"
        },
        employment_status: {
            1: "日雇",
            2: "派遣",
            3: "パートタイム",
            4: "有期契約労働者",
            5: "季節的雇用",
            6: "年俸制"
        },
        tax_law_support_add_reason: {
            1: "配偶者の就職",
            2: "婚姻",
            3: "離職",
            4: "収入減少",
            5: "その他",
            31: "出生",
            32: "離職",
            33: "収入減",
            34: "同居",
            35: "その他"
        },
        tax_law_support_del_reason: {
            1: "死亡",
            2: "離婚",
            3: "就職・収入増加",
            4: "75歳到達",
            5: "障害認定",
            6: "その他",
            31: "死亡",
            32: "就職",
            33: "収入増加",
            34: "75歳到達",
            35: "障害認定",
            36: "その他"
        },
        contract_period_determined: {
            1: "あり",
            2: "なし"
        },
        loss_qualification_reason_employ: {
            1: "離職（事業主都合）",
            2: "離職（労働者都合）",
            3: "定年退職"
        },
        foreigner_division: {
            0: "該当しない",
            1: "該当する",
            2: "該当する"
        },
        living_together: {
            1: "同居",
            2: "別居（国内）"
        },
        overseas_separation: {
            1: "別居（国外）"
        },
        // regular_working_hour, regular_working_minute, regular_working_secondを結合
        combineWorkingTime: (record) => {
            const workingHour = record['regular_working_hour'] !== undefined ? record['regular_working_hour'] : '00';
            const workingMinute = record['regular_working_minute'] !== undefined ? record['regular_working_minute'] : '00';
            const workingSecond = record['regular_working_second'] !== undefined ? record['regular_working_second'] : '00';

            // 時間、分、秒を ":" で結合してregular_working_hourとして返す
            return `${String(workingHour).padStart(2, '0')}:${String(workingMinute).padStart(2, '0')}:${String(workingSecond).padStart(2, '0')}`;
        }
    };
};

// mut_stidをcompanyNameに基づいて読み込む関数
const getMutStidByCompanyName = async (companyName) => {
    try {
        const response = await axios.post('https://service.officestation.jp/5w7a87/GET_CONSIGNMENT_CUSTOMER', {
            api_key: apiKey,  // 適切なAPIキーを指定
            uid: "5wcsewsdg4"
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const companies = response.data.customers;  // customers配列を取得

        // 会社名からidentifierを取得
        const company = companies.find(comp => comp.customer_name === companyName);
        if (company) {
            return company.identifier;
        } else {
            console.error(`指定された会社名が見つかりません: ${companyName}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching company list:', error.message);
        return null;
    }
};

// 値を変換する関数（数値型もサポート）
const convertValue = (field, value, conversionRules) => {
    if (field === 'birthday' && typeof value === 'string') {
        value = value.replace(/-/g, '');  // birthdayフィールドのハイフンを除去
    }
    if (field === 'tel' && typeof value === 'string') {
        value = value.replace(/-/g, '');  
    }
    if (field === 'basic_pension_no' && typeof value === 'string') {
        value = value.replace(/-/g, '');  
    }
    if (field === 'insured_number_employ' && typeof value === 'string') {
        value = value.replace(/-/g, '');  
    }
    if (conversionRules[field]) {
        const normalizedValue = typeof value === 'number' ? value : parseInt(value, 10); // 数値型に対応
        if (conversionRules[field][normalizedValue] !== undefined) {
            return conversionRules[field][normalizedValue];
        }
    }
    return value;  // 変換ルールがない場合はそのまま返す
};


// APIコールして従業員データを取得し、Kintoneに同期する関数
async function fetchAndSyncEmployees(companyName) {
    const companyRecordId = await getCompanyRecordId(companyName);

    if (!companyRecordId) {
        console.error(`会社レコード番号が見つかりません: ${companyName}`);
        return;
    }

    const mut_stid = await getMutStidByCompanyName(companyName);

    if (!mut_stid) {
        console.error(`mut_stidが見つかりません: ${companyName}`);
        return;
    }

    const requestData = {
        api_key: apiKey,
        mut_stid: mut_stid,
        uid: '5wcsewsdg4',
        employees_kbn_ret: 0,
        family_ret: 1
    };

    try {
        const response = await axios.post(apiEndpoint, requestData);
        const jsonData = response.data.employees;
        processJsonData(companyName, jsonData, companyRecordId);  // companyRecordIdを渡す
    } catch (error) {
        console.error('APIエラー:', error.message);
    }
}


// JSONデータを処理し、Kintoneに同期する関数
function processJsonData(companyName, jsonData, companyRecordId) {
    // console.log("processJsonData: companyRecordId =", companyRecordId);  // デバッグ用

    if (!jsonData || jsonData.length === 0) {
        console.error('取得したデータが空です');
        return;
    }

    jsonData.forEach(async (record) => {
        try {
            const personType = record['relationship'] === 0 ? '本人' : (record['relationship'] === 1 || record['relationship'] === 2) ? '配偶者' : '家族';
            const { appId, apiToken } = kintoneConfig[personType];

            const existingRecord = await searchExistingRecord(record, appId, apiToken, personType);

            if (existingRecord) {
                updateKintoneRecord(record, existingRecord.$id.value, appId, apiToken, personType, companyRecordId);
            } else {
                createKintoneRecord(record, appId, apiToken, companyName, personType, companyRecordId);
            }
        } catch (error) {
            console.error(`エラー発生: 社員No: ${record['customer_employee_id']}, 姓名: ${record['shi_name']} ${record['mei_name']} - ${error.message}`);
        }
    });
}


// 既存レコードを検索する関数
async function searchExistingRecord(record, appId, apiToken, personType) {
    let query = '';

    if (personType === '本人') {
        query = `社員No = "${record['customer_employee_id']}" and 姓戸籍 = "${record['shi_name']}" and 名戸籍 = "${record['mei_name']}"`;
    } else {
        query = `社員No = "${record['customer_employee_id']}" and 姓1 = "${record['shi_name']}" and 名1 = "${record['mei_name']}"`;
    }

    try {
        const response = await axios.get(`${hostUrl}/k/v1/records.json`, {
            params: {
                app: appId,
                query: query
            },
            headers: {
                'X-Cybozu-API-Token': apiToken
            }
        });
        if (response.data.records.length > 0) {
            // console.log('既存レコードが見つかりました');
            return response.data.records[0];
        } else {
            // console.log('既存レコードが見つかりませんでした');
            return null;
        }
    } catch (error) {
        console.error('検索エラー:', error.message);
        return null;
    }
}

// レコードを新規作成する関数
async function createKintoneRecord(record, appId, apiToken, companyName, personType, companyRecordId) {
    const kintoneRecord = buildKintoneRecord(record, companyName, personType, companyRecordId);  // companyRecordIdを追加

    try {
        const response = await axios.post(`${hostUrl}/k/v1/record.json`, {
            app: appId,
            record: kintoneRecord
        }, {
            headers: {
                'X-Cybozu-API-Token': apiToken,
                'Content-Type': 'application/json'
            }
        });
        console.log(`${personType}レコードの新規作成成功:`, response.data);
    } catch (error) {
        console.error(`エラー発生: 社員No: ${record['customer_employee_id']}, 姓名: ${record['shi_name']} ${record['mei_name']}`, error.response ? error.response.data : error.message);
    }
}

// レコードを更新する関数
async function updateKintoneRecord(record, recordId, appId, apiToken, personType, companyRecordId) {
    const kintoneRecord = buildKintoneRecord(record, null, personType, companyRecordId);  // companyRecordIdを追加

    try {
        const response = await axios.put(`${hostUrl}/k/v1/record.json`, {
            app: appId,
            id: recordId,
            record: kintoneRecord
        }, {
            headers: {
                'X-Cybozu-API-Token': apiToken,
                'Content-Type': 'application/json'
            }
        });
        console.log(`${personType}レコードの更新成功:`, response.data);
    } catch (error) {
        console.error(`${personType}レコードの更新エラー: 社員No: ${record['customer_employee_id']}, 姓名: ${record['shi_name']} ${record['mei_name']}`, error.response ? error.response.data : error.message);
    }
}


// Kintoneレコードを構築する関数
function buildKintoneRecord(record, companyName, personType, companyRecordId) {
    const kintoneRecord = {};
    // console.log("buildKintoneRecord: companyRecordId =", companyRecordId);  // デバッグ用
    const conversionRules = loadConversionRules();  // 変換ルールを読み込む

    if (companyName) {
        kintoneRecord['会社名'] = { value: companyName };
    }

    if (companyRecordId) {
        kintoneRecord['会社レコード番号'] = { value: companyRecordId }; // 会社レコード番号のフィールド設定
    }

    // leave_company_dateの値に応じて在籍状況を設定
    if (!record['leave_company_date']) {
        kintoneRecord['在籍状況'] = { value: '在籍中' };
    } else {
        kintoneRecord['在籍状況'] = { value: '退職済' };
    }

    // relationshipの値に応じて設定
    if (!record['relationship']) {
        kintoneRecord['区分'] = { value: '' };
    } else if (record['relationship'] === 1 || record['relationship'] === 2) {
        kintoneRecord['区分'] = { value: '配偶者' };
    } else {
        kintoneRecord['区分'] = { value: '家族' };
    }

    // regular_working_hour, regular_working_minute, regular_working_secondを結合
    const workingHour = record['regular_working_hour'] || 0;
    const workingMinute = record['regular_working_minute'] || 0;
    const totalTime = `${String(workingHour).padStart(2, '0')}：${String(workingMinute).padStart(2, '0')}`;

    // :で繋げた時間をKintoneフィールドに設定
    kintoneRecord['週所定労働時間'] = { value: totalTime };  // ここで適切なKintoneのフィールド名に置き換え

    const fieldMappings = loadFieldMappings(personType);

    for (const [jsonField, kintoneField] of Object.entries(fieldMappings)) {
        let value = record[jsonField];

        // 値の処理（変換ルールを適用）
        value = convertValue(jsonField, value, conversionRules);

        // Kintoneレコードのフィールドに値をセット
        kintoneRecord[kintoneField.dest] = { value: value || '' };
    }

    return kintoneRecord;
}

// フィールドマッピングを取得する関数
function loadFieldMappings(personType) {
    try {
        const rawData = fs.readFileSync(transferFieldPath);  // transfer_field_2.7.json を読み込む
        const transferField = JSON.parse(rawData);

        const fieldMappings = {};
        let categories;
        
        // 本人/家族のタイプに応じたカテゴリーを選択
        if (personType === '本人') {
            categories = ['essential', 'basic', 'enroll_residency', 'enroll_social_insurance', 'enroll_employment_insurance', 'retire'];
        } else if (personType === '配偶者') {
            categories = ['spouse', 'spouse_spare1'];
        } else if (personType === '家族') {
            categories = ['spouse', 'spouse_spare2'];
        }

        // 各カテゴリーに対するフィールドマッピングを設定
        categories.forEach(category => {
            const fields = transferField[category]?.fields || [];
            fields.forEach(field => {
                fieldMappings[field.from] = field;  // 'from' がjsonのキー、'dest'がKintoneのフィールド
            });
        });

        return fieldMappings;
    } catch (error) {
        console.error('フィールドマッピングの読み込みエラー:', error.message);
        return {};
    }
}

// コマンドライン引数から会社名を取得（会社名は手動入力）
const args = process.argv.slice(2);
let companyName = args[0];

// 会社名が指定されていない場合は、メッセージを表示して終了
if (!companyName) {
    console.log('会社名を正確に入力してください。（例）株式会社レンシュウ');
    process.exit(1);
}
// companyName = "株式会社レンシュウ２"
fetchAndSyncEmployees(companyName);
