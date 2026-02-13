// ============================================================
// templates.js — 履歴書・職務経歴書 HTMLテンプレート生成
// ============================================================

const Templates = (() => {
  const e = Utils.escapeHtml;

  // デフォルト行数設定
  const DEFAULT_OPTIONS = {
    advancedMode: false,
    page1HistoryRows: 18,
    page2HistoryRows: 5,
    qualificationRows: 6,
  };

  // ================================================================
  // ユーティリティ
  // ================================================================
  function buildHistoryRows(educationList) {
    const eduItems = educationList.filter((x) => x.type === '学歴');
    const workItems = educationList.filter((x) => x.type === '職歴');
    const rows = [];
    rows.push({ year: '', month: '', content: '学歴', isHeader: true });
    for (const item of eduItems) {
      const monthStr = item.month ? String(item.month).padStart(2, '0') : '';
      rows.push({ year: item.year || '', month: monthStr, content: item.content });
    }
    rows.push({ year: '', month: '', content: '', isSeparator: true });
    rows.push({ year: '', month: '', content: '職歴', isHeader: true });
    for (const item of workItems) {
      const monthStr = item.month ? String(item.month).padStart(2, '0') : '';
      rows.push({ year: item.year || '', month: monthStr, content: item.content });
    }
    return rows;
  }

  function historyRowHtml(r) {
    const yearStr = r.year ? e(String(r.year)) : '&nbsp;';
    const monthStr = r.month ? e(String(r.month)) : '&nbsp;';
    const contentStr = r.content ? e(r.content) : '&nbsp;';
    return `<tr>
          <td class="center">${yearStr}</td>
          <td class="center">${monthStr}</td>
          <td class="${r.isHeader ? 'center bold' : ''}">${contentStr}</td>
        </tr>`;
  }

  function emptyRowHtml() {
    return '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
  }

  // ================================================================
  // 履歴書 ページ1
  // ================================================================
  function resumePage1(profile, educationList, submissionDate, options, pageNum, totalPages) {
    const opt = { ...DEFAULT_OPTIONS, ...options };
    const age = Utils.calcAge(profile.birthDate, submissionDate);
    const dateLabel = Utils.formatDateJP(submissionDate) + '現在';
    const birthLabel = profile.birthDate
      ? (() => {
          const d = new Date(profile.birthDate);
          return `${d.getFullYear()}年 ${String(d.getMonth() + 1).padStart(2, '0')}月 ${String(d.getDate()).padStart(2, '0')}日生（満${age}歳）`;
        })()
      : '';

    const historyRows = buildHistoryRows(educationList);
    const maxRows = opt.page1HistoryRows;
    const page1Rows = historyRows.slice(0, maxRows);

    const photoEnabled = profile.photoEnabled !== false;
    const photoHtml = (profile.photo && photoEnabled)
      ? `<img src="${profile.photo}" alt="証明写真" style="width:100%;height:100%;object-fit:cover;">`
      : '';

    return `
<div class="a4-page resume-page" id="resume-page1">
  <div class="resume-top-area">
    <div class="resume-top-content">
      <div class="resume-header-row">
        <h1 class="resume-title">履歴書</h1>
        <span class="resume-date">${e(dateLabel)}</span>
      </div>

      <table class="resume-name-table">
        <tr>
          <td class="label-cell" style="width:60px;">
            <span class="furigana-label">ふりがな</span><br>氏名
          </td>
          <td class="name-cell">
            <span class="furigana">${e(profile.nameKana)}</span><br>
            <span class="name-value">${e(profile.name)}</span>
          </td>
          <td class="gender-cell">
            <span class="gender-note">※性別</span><br>
            ${e(profile.gender || '')}
          </td>
        </tr>
      </table>

      <table class="resume-birth-table">
        <tr>
          <td class="birth-cell">${e(birthLabel)}</td>
        </tr>
      </table>
    </div>
    <div class="photo-box">${photoHtml}</div>
  </div>

  <table class="resume-info-table address-table">
    <tr>
      <td class="label-cell" style="width:60px;">
        <span class="furigana-label">ふりがな</span><br>現住所
      </td>
      <td class="address-cell">
        <span class="furigana">${e(profile.addressKana)}</span><br>
        〒${e(profile.postalCode)}<br>
        ${e(profile.address)}
      </td>
      <td class="contact-info-cell" style="width:200px;">
        電話　${e(profile.phone)}<br>
        E-mail<br>${e(profile.email)}
      </td>
    </tr>
    <tr>
      <td class="label-cell">
        <span class="furigana-label">ふりがな</span><br>連絡先
      </td>
      <td class="address-cell">
        <span class="furigana">${e(profile.contactAddressKana || '')}</span><br>
        〒${e(profile.contactPostalCode || '')}
        <span class="contact-note">（現住所以外に連絡を希望する場合のみ記入）</span><br>
        ${e(profile.contactAddress || '')}
      </td>
      <td class="contact-info-cell">
        電話　${e(profile.contactPhone || '')}<br>
        E-mail<br>${e(profile.contactEmail || '')}
      </td>
    </tr>
  </table>

  <table class="history-table">
    <thead>
      <tr>
        <th style="width:60px;">年</th>
        <th style="width:40px;">月</th>
        <th>学　歴 ・ 職　歴（各別にまとめて書く）</th>
      </tr>
    </thead>
    <tbody>
      ${page1Rows.map(historyRowHtml).join('')}
      ${Array(Math.max(0, maxRows - page1Rows.length)).fill(emptyRowHtml()).join('')}
    </tbody>
  </table>
  ${pageFooter(pageNum, totalPages)}
</div>`;
  }

  // ================================================================
  // 履歴書 ページ2
  // ================================================================
  function resumePage2(profile, educationList, qualifications, application, options, pageNum, totalPages) {
    const opt = { ...DEFAULT_OPTIONS, ...options };

    const historyRows = buildHistoryRows(educationList);
    const maxPage1 = opt.page1HistoryRows;
    const remainingRows = historyRows.slice(maxPage1);
    const page2HistorySlots = opt.advancedMode
      ? opt.page2HistoryRows
      : Math.max(remainingRows.length, opt.page2HistoryRows);
    const qualSlots = opt.advancedMode
      ? opt.qualificationRows
      : Math.max(qualifications.length, opt.qualificationRows);

    const motivationText = application?.motivation || '';
    const selfPRText = application?.selfPR || '';
    const personalRequest = application?.personalRequest || '勤務形態・条件等については貴社の規定に従います。';

    return `
<div class="a4-page resume-page" id="resume-page2">
  <table class="history-table">
    <thead>
      <tr>
        <th style="width:60px;">年</th>
        <th style="width:40px;">月</th>
        <th>学　歴 ・ 職　歴（各別にまとめて書く）</th>
      </tr>
    </thead>
    <tbody>
      ${remainingRows.map(historyRowHtml).join('')}
      ${Array(Math.max(0, page2HistorySlots - remainingRows.length)).fill(emptyRowHtml()).join('')}
    </tbody>
  </table>

  <table class="history-table qualification-table">
    <thead>
      <tr>
        <th style="width:60px;">年</th>
        <th style="width:40px;">月</th>
        <th>資　格 ・ 免　許</th>
      </tr>
    </thead>
    <tbody>
      ${qualifications.map((q) => {
        const monthStr = q.month ? String(q.month).padStart(2, '0') : '';
        return `<tr>
          <td class="center">${q.year || ''}</td>
          <td class="center">${monthStr}</td>
          <td>${e(q.content)}</td>
        </tr>`;
      }).join('')}
      ${Array(Math.max(0, qualSlots - qualifications.length)).fill(emptyRowHtml()).join('')}
    </tbody>
  </table>

  <div class="motivation-section">
    <div class="motivation-header">志望の動機、特技、好きな学科、アピールポイントなど</div>
    <div class="motivation-body">
      ${motivationText ? `<p class="section-label">【志望理由】</p><p class="section-text">${e(motivationText).replace(/\n/g, '<br>')}</p>` : ''}
      ${selfPRText ? `<p class="section-label">【自己PR】</p><p class="section-text">${e(selfPRText).replace(/\n/g, '<br>')}</p>` : ''}
    </div>
  </div>

  <div class="request-section">
    <div class="request-header">本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他についての希望などがあれば記入）</div>
    <div class="request-body">
      <p>${e(personalRequest).replace(/\n/g, '<br>')}</p>
    </div>
  </div>

  <div class="gender-note-bottom">※「性別」欄：記載は任意です。未記載とすることも可能です。</div>
  ${pageFooter(pageNum, totalPages)}
</div>`;
  }

  // ================================================================
  // 職務経歴書 ページ1
  // ================================================================
  function careerPage1(profile, careers, application, submissionDate, pageNum, totalPages) {
    const dateLabel = Utils.formatDateJPCompact(submissionDate) + '現在';
    const careerSummary = application?.careerSummary || '';

    let careerBlocks = '';
    for (const c of careers) {
      const startLabel = Utils.formatYearMonth(c.startDate);
      const endLabel = c.endDate === '現在' ? '現在' : Utils.formatYearMonth(c.endDate);

      // 派遣の場合は派遣元（派遣会社）名、派遣先企業名を表示
      let companyDisplay = c.companyName;
      let dispatchBlock = '';
      if (c.isDispatch && c.dispatchTo) {
        const agencyName = c.dispatchFrom || c.companyName;
        companyDisplay = agencyName;
        dispatchBlock = `
        <div class="career-dispatch-info">
          <div class="career-dispatch-line">派遣会社名：${e(agencyName)}</div>
          <div class="career-dispatch-line">派遣先企業名：${e(c.dispatchTo)}</div>
        </div>`;
      }
      const periodHeader = `${startLabel}～${endLabel}　　${e(companyDisplay)}`;

      const dutiesList = (c.duties || []).filter(d => d).map((d) => `<li>${e(d)}</li>`).join('');
      const achievementsList = (c.achievements || []).filter(a => a).map((a) => `<li>${e(a)}</li>`).join('');

      careerBlocks += `
      <div class="career-block">
        <div class="career-period-header">${periodHeader}</div>
        ${dispatchBlock}
        <table class="company-info-table">
          <tr>
            <td class="company-details">
              ${c.businessContent ? `事業内容：${e(c.businessContent)}<br>` : ''}
              ${c.capital ? `資本金：${e(c.capital)}` : ''}${c.revenue ? `　売上高：${e(c.revenue)}` : ''}<br>
              ${c.employeeCount ? `従業員数：${e(c.employeeCount)}` : ''}${c.listing ? `　上場：${e(c.listing)}` : ''}
            </td>
            <td class="position-cell">
              ${e(c.position || '')}<br>
              ${c.employmentType ? `（${e(c.employmentType)}）` : ''}<br>
              として勤務
            </td>
          </tr>
        </table>
        ${c.department ? `<div class="career-department">${e(c.department)} にて従事</div>` : ''}
        <div class="career-details">
          ${dutiesList ? `<div class="detail-section"><span class="detail-label">【業務内容】</span><ul>${dutiesList}</ul></div>` : ''}
          ${achievementsList ? `<div class="detail-section"><span class="detail-label">【業務上の工夫・成果】</span><ul>${achievementsList}</ul></div>` : ''}
        </div>
      </div>`;
    }

    return `
<div class="a4-page career-page" id="career-page1">
  <h1 class="career-title">職 務 経 歴 書</h1>
  <div class="career-meta">
    <div class="career-date">${e(dateLabel)}</div>
    <div class="career-name">氏名　${e(profile.name)}</div>
  </div>

  <div class="career-section">
    <h2 class="career-section-title">■職務要約</h2>
    <div class="career-summary-text">${e(careerSummary).replace(/\n/g, '<br>')}</div>
  </div>

  <div class="career-section">
    <h2 class="career-section-title">■職務経歴</h2>
    ${careerBlocks}
  </div>
  ${pageFooter(pageNum, totalPages)}
</div>`;
  }

  // ================================================================
  // 職務経歴書 ページ2
  // ================================================================
  function careerPage2(qualifications, application, pageNum, totalPages) {
    const skills = application?.skills || [];
    const careerMotivation = application?.careerMotivation || '';
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

    const skillsHtml = skills
      .map((s, i) => {
        const num = circledNumbers[i] || `(${i + 1})`;
        return `
        <div class="skill-item">
          <div class="skill-title">${num}　${e(s.title)}</div>
          <div class="skill-desc">${e(s.description).replace(/\n/g, '<br>')}</div>
        </div>`;
      })
      .join('');

    return `
<div class="a4-page career-page" id="career-page2">
  <div class="career-section">
    <h2 class="career-section-title">■資格</h2>
    <table class="qual-table">
      <tbody>
        ${qualifications.map((q) => {
          const monthStr = q.month ? String(q.month).padStart(2, '0') : '';
          return `<tr>
            <td class="qual-name">${e(q.content)}</td>
            <td class="qual-date">${q.year || ''}年${monthStr}月 ${q.content.includes('修了') ? '修了' : '取得'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  ${skills.length > 0 ? `
  <div class="career-section">
    <h2 class="career-section-title">■ 活かせるスキル・強み</h2>
    ${skillsHtml}
  </div>` : ''}

  ${careerMotivation ? `
  <div class="career-section">
    <h2 class="career-section-title">■ 志望動機</h2>
    <div class="career-motivation-text">${e(careerMotivation).replace(/\n/g, '<br>')}</div>
  </div>` : ''}

  ${pageFooter(pageNum, totalPages)}
  <div class="career-end">以上</div>
</div>`;
  }

  // ================================================================
  // 溢れチェック（アドバンストモード用）
  // ================================================================
  function checkOverflow(educationList, qualifications, options) {
    const opt = { ...DEFAULT_OPTIONS, ...options };
    const historyRows = buildHistoryRows(educationList);
    const warnings = [];

    if (historyRows.length > opt.page1HistoryRows + opt.page2HistoryRows) {
      warnings.push(`学歴・職歴が ${historyRows.length} 行あり、設定上限 ${opt.page1HistoryRows + opt.page2HistoryRows} 行を超えています。`);
    }
    if (qualifications.length > opt.qualificationRows) {
      warnings.push(`資格が ${qualifications.length} 件あり、設定上限 ${opt.qualificationRows} 件を超えています。`);
    }
    return warnings;
  }

  // ================================================================
  // ページ番号フッター
  // ================================================================
  function pageFooter(pageNum, totalPages) {
    return `<div class="page-number">${pageNum} / ${totalPages}</div>`;
  }

  // ================================================================
  // 全ページ生成
  // ================================================================
  function generateResumeHTML(profile, education, qualifications, application, options, pageStart, totalPages) {
    const opt = { ...DEFAULT_OPTIONS, ...options };
    const subDate = application?.submissionDate || Utils.todayStr();
    const pStart = pageStart || 1;
    const total = totalPages || 2;
    const p1 = resumePage1(profile || {}, education || [], subDate, opt, pStart, total);
    const p2 = resumePage2(profile || {}, education || [], qualifications || [], application || {}, opt, pStart + 1, total);
    return p1 + p2;
  }

  function generateCareerHTML(profile, careers, qualifications, application, pageStart, totalPages) {
    const subDate = application?.submissionDate || Utils.todayStr();
    const pStart = pageStart || 1;
    const total = totalPages || 2;
    const p1 = careerPage1(profile || {}, careers || [], application || {}, subDate, pStart, total);
    const p2 = careerPage2(qualifications || [], application || {}, pStart + 1, total);
    return p1 + p2;
  }

  return {
    generateResumeHTML,
    generateCareerHTML,
    checkOverflow,
    DEFAULT_OPTIONS,
  };
})();
