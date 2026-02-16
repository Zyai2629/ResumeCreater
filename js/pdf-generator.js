// ============================================================
// pdf-generator.js — PDF生成処理 (jsPDF + html2canvas)
// ============================================================

const PdfGenerator = (() => {
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const SCALE = 2; // 高解像度

  /**
   * 指定されたHTML要素群からPDFを生成してダウンロード
   * @param {HTMLElement[]} pageElements - .a4-page 要素の配列
   * @param {string} filename - 出力ファイル名
   */
  async function generatePDF(pageElements, filename) {
    if (!pageElements || pageElements.length === 0) {
      throw new Error('PDFに変換するページがありません');
    }

    // Webフォント読み込み完了を待機
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // jsPDF を初期化（A4縦）
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];

      // html2canvas でキャプチャ
      const canvas = await html2canvas(el, {
        scale: SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
        onclone: (_doc, clonedEl) => {
          // html2canvas向けの補正:
          // 1. 写真セルの transparent border を白に変更
          //    （html2canvas では transparent が正しく処理されず罫線が写真の上に描画される場合がある）
          //    white にすることで border-collapse で table border に勝ちつつ視覚的に非表示
          const photoCell = clonedEl.querySelector('.photo-cell');
          if (photoCell) {
            photoCell.style.setProperty('border-top', '2px solid white', 'important');
            photoCell.style.setProperty('border-right', '2px solid white', 'important');
            photoCell.style.setProperty('border-bottom', '2px solid white', 'important');
          }
          // 2. 写真ボックスの背景を白にして罫線を隠す
          const photoBox = clonedEl.querySelector('.photo-box');
          if (photoBox) {
            photoBox.style.background = 'white';
            photoBox.style.zIndex = '10';
          }
          // 3. テーブル間のサブピクセルギャップを解消（縦線の途切れ防止）
          const birthTable = clonedEl.querySelector('.resume-birth-table');
          if (birthTable) {
            birthTable.style.marginTop = '-1px';
            birthTable.style.position = 'relative';
            birthTable.style.zIndex = '1';
          }
          const addressTable = clonedEl.querySelector('.resume-info-table');
          if (addressTable) {
            addressTable.style.marginTop = '-1px';
            addressTable.style.position = 'relative';
            addressTable.style.zIndex = '2';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = A4_WIDTH_MM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, A4_HEIGHT_MM));
    }

    // ダウンロードまたは共有
    if (isMobile() && navigator.share) {
      // モバイルでWeb Share APIが利用可能な場合
      const blob = pdf.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      try {
        await navigator.share({ files: [file], title: filename });
      } catch (err) {
        // Share cancelled - fall back to download
        pdf.save(filename);
      }
    } else {
      pdf.save(filename);
    }
  }

  /**
   * 履歴書PDFを生成
   */
  async function generateResumePDF(profile, education, qualifications, application, options) {
    const container = document.getElementById('pdf-render-area');
    container.innerHTML = Templates.generateResumeHTML(profile, education, qualifications, application, options, 1, 2);

    // レンダリング待ち
    await new Promise((r) => setTimeout(r, 300));

    const pages = container.querySelectorAll('.a4-page');
    const subDate = application?.submissionDate || Utils.todayStr();
    const dateStr = Utils.formatDateForFile(subDate);
    const filename = `${dateStr}_${profile.name || '履歴書'}_履歴書.pdf`;

    await generatePDF(Array.from(pages), filename);
    container.innerHTML = '';
  }

  /**
   * 職務経歴書PDFを生成
   */
  async function generateCareerPDF(profile, careers, qualifications, application) {
    const container = document.getElementById('pdf-render-area');
    container.innerHTML = Templates.generateCareerHTML(profile, careers, qualifications, application, 1, 2);

    await new Promise((r) => setTimeout(r, 300));
    await Utils.adjustCareerOverflow(container);

    const pages = container.querySelectorAll('.a4-page');
    const subDate = application?.submissionDate || Utils.todayStr();
    const dateStr = Utils.formatDateForFile(subDate);
    const filename = `${dateStr}_${profile.name || '職務経歴書'}_職務経歴書.pdf`;

    await generatePDF(Array.from(pages), filename);
    container.innerHTML = '';
  }

  /**
   * 一括PDF生成（履歴書 + 職務経歴書）
   */
  async function generateAllPDF(profile, education, careers, qualifications, application, options) {
    const container = document.getElementById('pdf-render-area');
    // 各文書ごとにページ番号をカウント（履歴書 1/2, 2/2 / 職務経歴書 1/2, 2/2）
    const resumeHTML = Templates.generateResumeHTML(profile, education, qualifications, application, options, 1, 2);
    const careerHTML = Templates.generateCareerHTML(profile, careers, qualifications, application, 1, 2);
    container.innerHTML = resumeHTML + careerHTML;

    await new Promise((r) => setTimeout(r, 300));
    await Utils.adjustCareerOverflow(container);

    const pages = container.querySelectorAll('.a4-page');
    const subDate = application?.submissionDate || Utils.todayStr();
    const dateStr = Utils.formatDateForFile(subDate);
    const filename = `${dateStr}_${profile.name || '書類'}_履歴書_職務経歴書.pdf`;

    await generatePDF(Array.from(pages), filename);
    container.innerHTML = '';
  }

  /**
   * モバイル判定
   */
  function isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  return {
    generateResumePDF,
    generateCareerPDF,
    generateAllPDF,
  };
})();
