// ============================================================
// utils.js — ユーティリティ関数（年齢計算・日付フォーマット等）
// ============================================================

const Utils = (() => {
  /**
   * 提出日時点での満年齢を計算する
   * @param {string} birthDate - 生年月日 (YYYY-MM-DD)
   * @param {string} baseDate  - 基準日 (YYYY-MM-DD)
   * @returns {number} 満年齢
   */
  function calcAge(birthDate, baseDate) {
    if (!birthDate || !baseDate) return 0;
    const birth = new Date(birthDate);
    const base = new Date(baseDate);
    let age = base.getFullYear() - birth.getFullYear();
    const monthDiff = base.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && base.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * YYYY-MM-DD を 「YYYY年 MM月 DD日」形式に変換
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {string}
   */
  function formatDateJP(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}年 ${m}月 ${day}日`;
  }

  /**
   * YYYY-MM-DD を 「YYYY年MM月DD日」形式に変換（スペース無し）
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDateJPCompact(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
  }

  /**
   * YYYY-MM を 「YYYY年MM月」に変換
   * @param {string} ymStr - YYYY-MM or "現在"
   * @returns {string}
   */
  function formatYearMonth(ymStr) {
    if (!ymStr) return '';
    if (ymStr === '現在') return '現在';
    const parts = ymStr.split('-');
    if (parts.length < 2) return ymStr;
    return `${parts[0]}年${parts[1].padStart(2, '0')}月`;
  }

  /**
   * 今日の日付を YYYY-MM-DD 形式で返す
   * @returns {string}
   */
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 今日の日付を YYMMDD 形式で返す（ファイル名用）
   * @param {string} dateStr - YYYY-MM-DD (optional, default: today)
   * @returns {string}
   */
  function formatDateForFile(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const y = String(d.getFullYear()).slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  /**
   * HTMLエスケープ
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 配列フィールドをJSON文字列に変換（CSV用）
   * @param {*} val
   * @returns {string}
   */
  function arrayToJsonStr(val) {
    if (Array.isArray(val)) return JSON.stringify(val);
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return String(val ?? '');
  }

  /**
   * JSON文字列を配列にパース（CSV用）
   * @param {string} str
   * @returns {*}
   */
  function jsonStrToArray(str) {
    if (!str) return [];
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  }

  /**
   * IDを生成（タイムスタンプベース）
   * @returns {number}
   */
  function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  /**
   * ISO 8601 形式の現在日時を返す
   * @returns {string}
   */
  function nowISO() {
    return new Date().toISOString();
  }

  /**
   * 画像ファイルをBase64に変換
   * @param {File} file
   * @returns {Promise<string>}
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 文字列をBlobとしてダウンロード
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * ファイル選択ダイアログを開いてテキストを読み込む
   * @param {string} accept - accept属性 (例: ".json,.csv")
   * @returns {Promise<{name: string, content: string}>}
   */
  function openFileDialog(accept) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return reject(new Error('No file selected'));
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, content: reader.result });
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      };
      input.click();
    });
  }

  /**
   * 簡易トースト通知
   * @param {string} message
   * @param {string} type - 'success' | 'error' | 'info'
   */
  function showToast(message, type = 'info', duration = 2500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * 職務経歴書ページの溢れ調整：
   * career-page1 のコンテンツが安全領域を超えた場合、
   * 超過した career-block を新しい続きページに移動し、ページ番号を更新する。
   * @param {HTMLElement} container - career-page が含まれるコンテナ
   */
  async function adjustCareerOverflow(container) {
    await new Promise(r => setTimeout(r, 150));

    const careerPage1 = container.querySelector('#career-page1');
    if (!careerPage1) return;

    // 職務経歴セクション（2番目の .career-section）を取得
    const sections = careerPage1.querySelectorAll('.career-section');
    if (sections.length < 2) return;
    const careerSection = sections[sections.length - 1];

    // ページの実際の高さからピクセル/mmの比率を算出
    const pageRect = careerPage1.getBoundingClientRect();
    const pxPerMm = pageRect.height / 297;
    const bottomPaddingMm = 22;
    const topPaddingMm = 18;
    const safeBottom = pageRect.top + (297 - bottomPaddingMm) * pxPerMm;

    const blocks = Array.from(careerSection.querySelectorAll('.career-block'));
    const overflowBlocks = blocks.filter(block => {
      const blockRect = block.getBoundingClientRect();
      return blockRect.bottom > safeBottom + 1; // 1px tolerance
    });

    if (overflowBlocks.length === 0) {
      // 溢れなしでもページ統合を試みる
    } else {
    // career-page2（資格セクション等）の前に続きページを挿入
    const careerPage2 = container.querySelector('#career-page2');
    let insertBefore = careerPage2;

    // 続きページを作成して溢れブロックを移動
    let currentPage = null;
    let currentSection = null;

    for (const block of overflowBlocks) {
      if (!currentPage) {
        currentPage = document.createElement('div');
        currentPage.className = 'a4-page career-page';

        const innerHTML = `
          <div class="career-section" style="margin-top: 0;">
            <h2 class="career-section-title">■職務経歴（続き）</h2>
          </div>
          <div class="page-number"></div>
        `;
        currentPage.innerHTML = innerHTML;
        currentSection = currentPage.querySelector('.career-section');

        if (insertBefore) {
          container.insertBefore(currentPage, insertBefore);
        } else {
          container.appendChild(currentPage);
        }
      }

      currentSection.appendChild(block);

      // 新ページでも溢れるか確認
      await new Promise(r => setTimeout(r, 50));
      const newPageRect = currentPage.getBoundingClientRect();
      const newPxPerMm = newPageRect.height / 297;
      const newSafeBottom = newPageRect.top + (297 - bottomPaddingMm) * newPxPerMm;

      if (block.getBoundingClientRect().bottom > newSafeBottom + 1) {
        // このページも溢れ → 次のブロック用に新ページ
        insertBefore = currentPage.nextSibling;
        currentPage = null;
        currentSection = null;
      }
    }
    } // end overflow handling

    // 全職務経歴書ページのページ番号を更新
    const allCareerPages = container.querySelectorAll('.career-page');
    const totalPages = allCareerPages.length;
    allCareerPages.forEach((page, i) => {
      let pageNum = page.querySelector('.page-number');
      if (!pageNum) {
        pageNum = document.createElement('div');
        pageNum.className = 'page-number';
        page.appendChild(pageNum);
      }
      pageNum.textContent = `${i + 1} / ${totalPages}`;
    });

    // 3ページ以上になった場合は警告ダイアログ
    if (totalPages >= 3) {
      showToast('職務経歴書が3ページ以上になっています。内容を簡潔にすることを検討してください。', 'error', 5000);
      setTimeout(() => {
        alert('⚠ 職務経歴書が' + totalPages + 'ページになっています。\n内容を簡潔にして2ページに収めることを検討してください。');
      }, 200);
    }

    // --- 資格セクション等を最終職歴ページの余白に統合（try-and-see方式） ---
    const careerPage2After = container.querySelector('#career-page2');
    if (careerPage2After) {
      const careerPagesArr = Array.from(container.querySelectorAll('.career-page'));
      const page2Index = careerPagesArr.indexOf(careerPage2After);
      if (page2Index > 0) {
        const lastCareerPage = careerPagesArr[page2Index - 1];
        const pageNumber = lastCareerPage.querySelector('.page-number');
        const page2Sections = Array.from(careerPage2After.querySelectorAll('.career-section, .career-end'));

        // 一時的にlastCareerPageに移動して溢れを確認
        page2Sections.forEach(sec => {
          lastCareerPage.insertBefore(sec, pageNumber);
        });

        await new Promise(r => setTimeout(r, 100));

        // 溢れチェック
        const checkRect = lastCareerPage.getBoundingClientRect();
        const checkPxPerMm = checkRect.height / 297;
        const checkSafeBottom = checkRect.top + (297 - bottomPaddingMm) * checkPxPerMm;
        const hasOverflow = page2Sections.some(sec =>
          sec.getBoundingClientRect().bottom > checkSafeBottom + 1
        );

        if (hasOverflow) {
          // 収まらない → page2に戻す
          const page2PageNum = careerPage2After.querySelector('.page-number');
          page2Sections.forEach(sec => {
            careerPage2After.insertBefore(sec, page2PageNum);
          });
        } else {
          // 収まった → 空のpage2を削除
          careerPage2After.remove();
        }

        // ページ番号を再更新
        const updatedPages = container.querySelectorAll('.career-page');
        const updatedTotal = updatedPages.length;
        updatedPages.forEach((page, i) => {
          let pn = page.querySelector('.page-number');
          if (!pn) {
            pn = document.createElement('div');
            pn.className = 'page-number';
            page.appendChild(pn);
          }
          pn.textContent = `${i + 1} / ${updatedTotal}`;
        });
      }
    }
  }

  return {
    calcAge,
    formatDateJP,
    formatDateJPCompact,
    formatYearMonth,
    todayStr,
    formatDateForFile,
    escapeHtml,
    arrayToJsonStr,
    jsonStrToArray,
    generateId,
    nowISO,
    fileToBase64,
    downloadFile,
    openFileDialog,
    showToast,
    adjustCareerOverflow,
  };
})();
