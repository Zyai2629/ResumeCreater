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
   * career-block がページの安全領域を超えた場合、
   * ブロック内の行（li / detail-section）レベルで分割し、
   * 超過分を新しい続きページに移動する。
   * 分割できない場合はブロックごと移動する。
   * @param {HTMLElement} container - career-page が含まれるコンテナ
   */
  async function adjustCareerOverflow(container) {
    await new Promise(r => setTimeout(r, 150));

    const careerPage1 = container.querySelector('#career-page1');
    if (!careerPage1) return;

    const bottomPaddingMm = 22;

    // ページの安全領域下端を算出
    function getSafeBottom(page) {
      const pageRect = page.getBoundingClientRect();
      const pxPerMm = pageRect.height / 297;
      return pageRect.top + (297 - bottomPaddingMm) * pxPerMm;
    }

    // 続きページを作成（insertBeforeEl の前に挿入）
    function createContinuationPage(insertBeforeEl) {
      const newPage = document.createElement('div');
      newPage.className = 'a4-page career-page';
      newPage.innerHTML = `
        <div class="career-section" style="margin-top: 0;">
          <h2 class="career-section-title">■職務経歴（続き）</h2>
        </div>
        <div class="page-number"></div>
      `;
      container.insertBefore(newPage, insertBeforeEl);
      return newPage;
    }

    // career-block を行レベルで分割する
    // 戻り値: 続きブロック（DOM要素）または null（分割不可→ブロック丸ごと移動）
    function trySplitBlock(block, safeBottom) {
      const careerDetails = block.querySelector('.career-details');
      if (!careerDetails) return null;

      // career-details 内の全 <li> を取得
      const allLis = Array.from(careerDetails.querySelectorAll('li'));
      if (allLis.length === 0) return null;

      // 溢れた最初の li を特定
      let firstOverflowIdx = -1;
      for (let i = 0; i < allLis.length; i++) {
        if (allLis[i].getBoundingClientRect().bottom > safeBottom + 1) {
          firstOverflowIdx = i;
          break;
        }
      }
      if (firstOverflowIdx === -1) return null;

      // 最初の li から溢れている場合：ヘッダー行が収まるか確認
      if (firstOverflowIdx === 0) {
        const rows = block.querySelectorAll('.career-content-table tr');
        const headerEndRow = block.querySelector('.dept-row') || rows[1];
        if (!headerEndRow || headerEndRow.getBoundingClientRect().bottom > safeBottom + 1) {
          return null; // ヘッダー行すら収まらない → ブロック丸ごと移動
        }
      }

      // 分割対象の li とその親要素を特定
      const splitLi = allLis[firstOverflowIdx];
      const splitUl = splitLi.closest('ul');
      const splitSection = splitLi.closest('.detail-section');
      const detailSections = Array.from(careerDetails.children);
      const splitSectionIdx = detailSections.indexOf(splitSection);

      // 続きページに移動する要素を収集
      const elementsForCont = [];

      // 分割 ul 内の残りの li を新しい section に集める
      const lisInUl = Array.from(splitUl.querySelectorAll(':scope > li'));
      const liIdxInUl = lisInUl.indexOf(splitLi);
      const remainingLis = lisInUl.slice(liIdxInUl);
      if (remainingLis.length > 0) {
        const newUl = document.createElement('ul');
        remainingLis.forEach(li => newUl.appendChild(li));
        const contSection = document.createElement('div');
        contSection.className = 'detail-section';
        contSection.appendChild(newUl);
        elementsForCont.push(contSection);
      }

      // 分割セクション以降の完全な detail-section を移動
      for (let i = splitSectionIdx + 1; i < detailSections.length; i++) {
        elementsForCont.push(detailSections[i]);
      }

      if (elementsForCont.length === 0) return null;

      // 続きブロックを構築（期間列は空、業務内容のみ）
      const contBlock = document.createElement('div');
      contBlock.className = 'career-block career-block-continuation';
      contBlock.innerHTML = `
        <table class="career-content-table">
          <colgroup>
            <col style="width:24mm">
            <col>
            <col style="width:28mm">
          </colgroup>
          <tr>
            <td class="period-col" style="vertical-align: top;">&nbsp;</td>
            <td colspan="2" class="duties-col">
              <div class="career-details"></div>
            </td>
          </tr>
        </table>
      `;
      const contDetails = contBlock.querySelector('.career-details');
      elementsForCont.forEach(el => contDetails.appendChild(el));

      // rowspan="2" はそのまま維持する。
      // 分割後も dept-row と duties-row は同じテーブル内に残るため、
      // rowspan を除去すると期間セルが dept-row 単独の高さを決定し、
      // 部署テキスト（1行）の下に不要な余白・横線が生じる。

      // 空になった ul / section をクリーンアップ
      if (splitUl && splitUl.children.length === 0) {
        splitSection.remove();
      }

      return contBlock;
    }

    // --- Phase 1: 溢れ処理（行レベル分割対応） ---
    function getContentPages() {
      return Array.from(container.querySelectorAll('.career-page:not(#career-page2)'));
    }

    let contentPages = getContentPages();
    let pageIdx = 0;

    while (pageIdx < contentPages.length) {
      const page = contentPages[pageIdx];
      const safeBottom = getSafeBottom(page);

      // ブロックを持つ career-section を取得
      const sections = page.querySelectorAll('.career-section');
      let targetSection = null;
      for (const s of sections) {
        if (s.querySelector('.career-block')) { targetSection = s; break; }
      }
      if (!targetSection) { pageIdx++; continue; }

      const blocks = Array.from(targetSection.querySelectorAll('.career-block'));
      let overflowIdx = -1;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].getBoundingClientRect().bottom > safeBottom + 1) {
          overflowIdx = i;
          break;
        }
      }
      if (overflowIdx === -1) { pageIdx++; continue; }

      // 行レベル分割を試行
      const overflowBlock = blocks[overflowIdx];
      const contBlock = trySplitBlock(overflowBlock, safeBottom);

      // 先頭ブロックが分割不可能な場合、無限ループを防止
      if (!contBlock && overflowIdx === 0) {
        if (blocks.length > 1) {
          // 後続ブロックだけ新ページに移動
          const insertRef = page.nextElementSibling;
          const newPage = createContinuationPage(insertRef);
          const newSection = newPage.querySelector('.career-section');
          for (let j = 1; j < blocks.length; j++) {
            newSection.appendChild(blocks[j]);
          }
          await new Promise(r => setTimeout(r, 50));
          contentPages = getContentPages();
        }
        pageIdx++;
        continue;
      }

      // 続きページを現在のページの直後に挿入
      const insertRef = page.nextElementSibling;
      const newPage = createContinuationPage(insertRef);
      const newSection = newPage.querySelector('.career-section');

      if (contBlock) {
        // 行レベル分割成功 → 続きブロックを新ページに配置
        newSection.appendChild(contBlock);
        // 後続ブロックも新ページに移動
        for (let j = overflowIdx + 1; j < blocks.length; j++) {
          newSection.appendChild(blocks[j]);
        }
      } else {
        // 分割不可 → ブロック丸ごと＋後続を新ページに移動
        for (let j = overflowIdx; j < blocks.length; j++) {
          newSection.appendChild(blocks[j]);
        }
      }

      await new Promise(r => setTimeout(r, 50));
      contentPages = getContentPages();
      pageIdx++; // 新ページを次のイテレーションで処理
    }

    // --- Phase 2: 資格セクション等を最終職歴ページに統合（try-and-see方式） ---
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
      }
    }

    // --- Phase 3: ページ番号更新 + 3ページ警告 ---
    const finalCareerPages = container.querySelectorAll('.career-page');
    const finalTotal = finalCareerPages.length;
    finalCareerPages.forEach((page, i) => {
      let pn = page.querySelector('.page-number');
      if (!pn) {
        pn = document.createElement('div');
        pn.className = 'page-number';
        page.appendChild(pn);
      }
      pn.textContent = `${i + 1} / ${finalTotal}`;
    });

    // 3ページ以上になった場合は警告ダイアログ（統合後に判定）
    if (finalTotal >= 3) {
      showToast('職務経歴書が3ページ以上になっています。内容を簡潔にすることを検討してください。', 'error', 5000);
      setTimeout(() => {
        alert('⚠ 職務経歴書が' + finalTotal + 'ページになっています。\n内容を簡潔にして2ページに収めることを検討してください。');
      }, 200);
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
