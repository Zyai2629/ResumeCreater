// ============================================================
// csv-handler.js — CSV インポート/エクスポート処理
// ============================================================

const CsvHandler = (() => {
  const BOM = '\uFEFF'; // UTF-8 BOM (Excel互換)

  // ------ CSV生成ユーティリティ ------

  /**
   * 値をCSVセル用にエスケープ
   */
  function escapeCell(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * オブジェクト配列をCSV文字列に変換
   * @param {string[]} headers - カラム名配列
   * @param {string[]} keys    - オブジェクトキー配列
   * @param {object[]} rows    - データ配列
   * @param {object}   arrayFields - {key: true} 配列フィールドの指定
   * @returns {string} CSV文字列（BOM付き）
   */
  function toCSV(headers, keys, rows, arrayFields = {}) {
    const lines = [headers.map(escapeCell).join(',')];
    for (const row of rows) {
      const cells = keys.map((key) => {
        let val = row[key];
        if (arrayFields[key]) {
          val = Utils.arrayToJsonStr(val);
        }
        return escapeCell(val);
      });
      lines.push(cells.join(','));
    }
    return BOM + lines.join('\r\n');
  }

  /**
   * CSV文字列をオブジェクト配列にパース
   * @param {string} csvStr
   * @param {string[]} keys       - 各カラムに対応するオブジェクトキー
   * @param {object}   arrayFields - {key: true}
   * @param {object}   numFields   - {key: true} 数値変換するフィールド
   * @returns {object[]}
   */
  function parseCSV(csvStr, keys, arrayFields = {}, numFields = {}) {
    // BOM除去
    let str = csvStr.replace(/^\uFEFF/, '');
    const rows = parseCSVLines(str);
    if (rows.length < 2) return []; // ヘッダー行のみ
    const dataRows = rows.slice(1); // ヘッダーを除く
    return dataRows.map((cells) => {
      const obj = {};
      keys.forEach((key, i) => {
        let val = cells[i] ?? '';
        if (arrayFields[key]) {
          val = Utils.jsonStrToArray(val);
        } else if (numFields[key]) {
          val = val === '' ? 0 : Number(val);
        } else {
          // 文字列のまま
        }
        obj[key] = val;
      });
      return obj;
    });
  }

  /**
   * CSV文字列を2次元配列にパース（ダブルクォート対応）
   */
  function parseCSVLines(str) {
    const rows = [];
    let current = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < str.length && str[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          current.push(cell);
          cell = '';
        } else if (ch === '\r') {
          // skip
        } else if (ch === '\n') {
          current.push(cell);
          cell = '';
          rows.push(current);
          current = [];
        } else {
          cell += ch;
        }
      }
    }
    // 最後のセル/行
    current.push(cell);
    if (current.some((c) => c !== '')) {
      rows.push(current);
    }
    return rows;
  }

  // ------ ストア別定義 ------

  const DEFS = {
    profile: {
      headers: ['氏名', 'ふりがな', '生年月日', '性別', '郵便番号', '住所', '住所ふりがな', '電話番号', 'Email', '連絡先郵便番号', '連絡先住所', '連絡先住所ふりがな', '連絡先電話', '連絡先Email'],
      keys: ['name', 'nameKana', 'birthDate', 'gender', 'postalCode', 'address', 'addressKana', 'phone', 'email', 'contactPostalCode', 'contactAddress', 'contactAddressKana', 'contactPhone', 'contactEmail'],
      arrayFields: {},
      numFields: {},
    },
    education: {
      headers: ['ID', '年', '月', '内容', '種別', '表示順'],
      keys: ['id', 'year', 'month', 'content', 'type', 'order'],
      arrayFields: {},
      numFields: { id: true, year: true, month: true, order: true },
    },
    career: {
      headers: ['ID', '会社名', '雇用形態', '開始年月', '終了年月', '事業内容', '資本金', '売上高', '従業員数', '上場区分', '役職', '配属先', '派遣先', '派遣元', '業務内容', '工夫・成果', '表示順'],
      keys: ['id', 'companyName', 'employmentType', 'startDate', 'endDate', 'businessContent', 'capital', 'revenue', 'employeeCount', 'listing', 'position', 'department', 'dispatchTo', 'dispatchFrom', 'duties', 'achievements', 'order'],
      arrayFields: { duties: true, achievements: true },
      numFields: { id: true, order: true },
    },
    qualifications: {
      headers: ['ID', '年', '月', '内容', '表示順'],
      keys: ['id', 'year', 'month', 'content', 'order'],
      arrayFields: {},
      numFields: { id: true, year: true, month: true, order: true },
    },
    applications: {
      headers: ['ID', '企業名', '提出日', '職務要約', '志望動機(履歴書)', '自己PR', 'スキル・強み', '志望動機(経歴書)', '本人希望', '作成日時', '更新日時'],
      keys: ['id', 'companyName', 'submissionDate', 'careerSummary', 'motivation', 'selfPR', 'skills', 'careerMotivation', 'personalRequest', 'createdAt', 'updatedAt'],
      arrayFields: { skills: true },
      numFields: { id: true },
    },
  };

  // ------ エクスポート ------

  async function exportCSV(storeName) {
    const def = DEFS[storeName];
    if (!def) throw new Error(`Unknown store: ${storeName}`);

    let rows;
    switch (storeName) {
      case 'profile': {
        const p = await DB.loadProfile();
        rows = p ? [p] : [];
        break;
      }
      case 'education': rows = await DB.loadEducation(); break;
      case 'career': rows = await DB.loadCareer(); break;
      case 'qualifications': rows = await DB.loadQualifications(); break;
      case 'applications': rows = await DB.loadApplications(); break;
    }

    const csv = toCSV(def.headers, def.keys, rows, def.arrayFields);
    const filename = `${storeName}.csv`;
    Utils.downloadFile(csv, filename, 'text/csv;charset=utf-8');
  }

  // ------ インポート ------

  async function importCSV(storeName, csvStr) {
    const def = DEFS[storeName];
    if (!def) throw new Error(`Unknown store: ${storeName}`);

    const items = parseCSV(csvStr, def.keys, def.arrayFields, def.numFields);
    if (items.length === 0) throw new Error('CSVにデータがありません');

    await DB.open();

    switch (storeName) {
      case 'profile':
        await DB.saveProfile(items[0]);
        break;
      case 'education':
        await DB.clearStore(DB.STORES.EDUCATION);
        for (const item of items) await DB.saveEducation(item);
        break;
      case 'career':
        await DB.clearStore(DB.STORES.CAREER);
        for (const item of items) await DB.saveCareer(item);
        break;
      case 'qualifications':
        await DB.clearStore(DB.STORES.QUALIFICATIONS);
        for (const item of items) await DB.saveQualification(item);
        break;
      case 'applications':
        await DB.clearStore(DB.STORES.APPLICATIONS);
        for (const item of items) await DB.saveApplication(item);
        break;
    }
  }

  /**
   * ファイル名からストア名を推定
   * @param {string} filename
   * @returns {string|null}
   */
  function guessStoreName(filename) {
    const base = filename.replace(/\.csv$/i, '').toLowerCase();
    if (DEFS[base]) return base;
    return null;
  }

  return {
    exportCSV,
    importCSV,
    guessStoreName,
    DEFS,
  };
})();
