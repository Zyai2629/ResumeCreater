// ============================================================
// app.js — メインロジック・UI制御・タブ切替・イベント管理
// ============================================================

const App = (() => {
  // 現在の状態
  let currentTab = 'profile';
  let currentScreen = 'input'; // 'input' | 'preview'
  let currentAppId = null;

  // アドバンストモード設定
  let advancedSettings = loadAdvancedSettings();

  // キャッシュ
  let profileData = {};
  let educationData = [];
  let careerData = [];
  let qualificationsData = [];
  let applicationsData = [];

  // ================================================================
  // アドバンストモード設定
  // ================================================================
  function loadAdvancedSettings() {
    try {
      const saved = localStorage.getItem('resumeCreater_advancedSettings');
      if (saved) return { ...Templates.DEFAULT_OPTIONS, ...JSON.parse(saved) };
    } catch (e) { /* ignore */ }
    return { ...Templates.DEFAULT_OPTIONS };
  }

  function saveAdvancedSettings() {
    localStorage.setItem('resumeCreater_advancedSettings', JSON.stringify(advancedSettings));
  }

  function getOptions() {
    if (!advancedSettings.advancedMode) return { ...Templates.DEFAULT_OPTIONS, advancedMode: false };
    return {
      advancedMode: true,
      page1HistoryRows: advancedSettings.page1HistoryRows,
      page2HistoryRows: advancedSettings.page2HistoryRows,
      qualificationRows: advancedSettings.qualificationRows,
    };
  }

  function applyAdvancedUI() {
    const checkbox = document.getElementById('advanced-mode');
    const controls = document.getElementById('advanced-controls');
    if (!checkbox || !controls) return;
    checkbox.checked = advancedSettings.advancedMode;
    controls.classList.toggle('hidden', !advancedSettings.advancedMode);
    document.getElementById('adv-p1-history').value = advancedSettings.page1HistoryRows;
    document.getElementById('adv-p2-history').value = advancedSettings.page2HistoryRows;
    document.getElementById('adv-qual').value = advancedSettings.qualificationRows;
  }

  function showWarnings(warnings) {
    const banner = document.getElementById('preview-warnings');
    if (!banner) return;
    if (!warnings || warnings.length === 0) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }
    banner.classList.remove('hidden');
    banner.innerHTML = '<strong>⚠ 注意</strong><ul>' + warnings.map(w => `<li>${Utils.escapeHtml(w)}</li>`).join('') + '</ul>';
  }

  // ================================================================
  // 初期化
  // ================================================================
  async function init() {
    await DB.open();
    await loadAllData();
    setupEventListeners();
    switchTab('profile');
    showScreen('input');
    renderApplicationSelector();
  }

  async function loadAllData() {
    profileData = (await DB.loadProfile()) || {};
    educationData = await DB.loadEducation();
    careerData = await DB.loadCareer();
    qualificationsData = await DB.loadQualifications();
    applicationsData = await DB.loadApplications();
  }

  // ================================================================
  // イベントリスナー設定
  // ================================================================
  function setupEventListeners() {
    // タブ切替
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 画面切替
    document.getElementById('btn-input').addEventListener('click', () => showScreen('input'));
    document.getElementById('btn-preview').addEventListener('click', () => showPreview());

    // プロフィールフォーム
    document.getElementById('profile-form').addEventListener('change', saveProfileForm);
    document.getElementById('profile-form').addEventListener('input', debounce(saveProfileForm, 500));

    // 写真アップロード
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);

    // 写真掲載チェックボックス
    const photoCheckbox = document.getElementById('photo-enabled');
    if (photoCheckbox) {
      photoCheckbox.addEventListener('change', async () => {
        profileData.photoEnabled = photoCheckbox.checked;
        await DB.saveProfile(profileData);
      });
    }

    // 郵便番号→住所自動入力
    setupPostalCodeAutoFill('postalCode', 'address', 'addressKana');
    setupPostalCodeAutoFill('contactPostalCode', 'contactAddress', 'contactAddressKana');

    // 学歴・職歴追加
    document.getElementById('btn-add-edu').addEventListener('click', () => addEducationEntry('学歴'));
    document.getElementById('btn-add-work').addEventListener('click', () => addEducationEntry('職歴'));

    // 職務経歴追加
    document.getElementById('btn-add-career').addEventListener('click', addCareerEntry);

    // 資格追加
    document.getElementById('btn-add-qual').addEventListener('click', addQualificationEntry);

    // 応募先管理
    document.getElementById('btn-add-app').addEventListener('click', addApplication);
    document.getElementById('app-selector').addEventListener('change', selectApplication);

    // 応募先フォーム
    document.getElementById('application-form').addEventListener('input', debounce(saveApplicationForm, 500));

    // スキル追加
    document.getElementById('btn-add-skill').addEventListener('click', addSkillEntry);

    // PDF生成
    document.getElementById('btn-pdf-resume').addEventListener('click', () => generatePDF('resume'));
    document.getElementById('btn-pdf-career').addEventListener('click', () => generatePDF('career'));
    document.getElementById('btn-pdf-all').addEventListener('click', () => generatePDF('all'));
    document.getElementById('btn-back-input').addEventListener('click', () => showScreen('input'));

    // エクスポート/インポート (JSON only)
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);
    document.getElementById('btn-import-json').addEventListener('click', importJSON);

    // リセット
    document.getElementById('btn-reset').addEventListener('click', resetAllData);

    // ウィンドウリサイズ時のスケーリング更新
    window.addEventListener('resize', debounce(scalePreviewPages, 150));
    window.addEventListener('orientationchange', () => setTimeout(scalePreviewPages, 300));

    // アドバンストモード
    const advCheckbox = document.getElementById('advanced-mode');
    if (advCheckbox) {
      advCheckbox.addEventListener('change', () => {
        advancedSettings.advancedMode = advCheckbox.checked;
        document.getElementById('advanced-controls').classList.toggle('hidden', !advCheckbox.checked);
        saveAdvancedSettings();
        if (currentScreen === 'preview') showPreview();
      });
    }
    ['adv-p1-history', 'adv-p2-history', 'adv-qual'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => {
          advancedSettings.page1HistoryRows = Number(document.getElementById('adv-p1-history').value) || 18;
          advancedSettings.page2HistoryRows = Number(document.getElementById('adv-p2-history').value) || 5;
          advancedSettings.qualificationRows = Number(document.getElementById('adv-qual').value) || 6;
          saveAdvancedSettings();
          if (currentScreen === 'preview') showPreview();
        });
      }
    });
  }

  // ================================================================
  // タブ切替
  // ================================================================
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.toggle('active', content.id === `tab-${tab}`);
    });

    // タブ表示時にデータを再描画
    switch (tab) {
      case 'profile':
        fillProfileForm();
        break;
      case 'education':
        renderEducationList();
        break;
      case 'career':
        renderCareerList();
        break;
      case 'qualifications':
        renderQualificationsList();
        break;
      case 'applications':
        renderApplicationSelector();
        fillApplicationForm();
        break;
    }
  }

  // ================================================================
  // 画面切替
  // ================================================================
  function showScreen(screen) {
    currentScreen = screen;
    document.getElementById('input-screen').classList.toggle('hidden', screen !== 'input');
    document.getElementById('preview-screen').classList.toggle('hidden', screen !== 'preview');
    document.getElementById('btn-input').classList.toggle('active', screen === 'input');
    document.getElementById('btn-preview').classList.toggle('active', screen === 'preview');
  }

  async function showPreview() {
    showScreen('preview');
    await loadAllData();
    applyAdvancedUI();
    const app = currentAppId ? applicationsData.find((a) => a.id === currentAppId) : applicationsData[0];
    const options = getOptions();

    const previewArea = document.getElementById('preview-area');
    // 各文書ごとにページ番号をカウント（履歴書 1/2, 2/2 / 職務経歴書 1/2, 2/2）
    const resumeHTML = Templates.generateResumeHTML(profileData, educationData, qualificationsData, app, options, 1, 2);
    const careerHTML = Templates.generateCareerHTML(profileData, careerData, qualificationsData, app, 1, 2);
    previewArea.innerHTML = resumeHTML + careerHTML;

    // アドバンストモード時の警告表示
    if (options.advancedMode) {
      const warnings = Templates.checkOverflow(educationData, qualificationsData, options);
      showWarnings(warnings);
    } else {
      showWarnings([]);
    }

    // プレビュー用応募先セレクタ
    renderPreviewAppSelector(app?.id);

    // スマホ表示時はスケーリング
    scalePreviewPages();
  }

  function scalePreviewPages() {
    const pages = document.querySelectorAll('#preview-area .a4-page');
    if (!pages.length) return;
    const viewportWidth = window.innerWidth;
    if (viewportWidth >= 768) {
      // デスクトップ: スケーリング不要
      pages.forEach((p) => {
        p.style.transform = '';
        p.style.marginBottom = '';
        p.style.width = '';
      });
      return;
    }
    const a4WidthPx = 793.7; // 210mm in px at 96dpi
    const a4HeightPx = 1122.5; // 297mm in px at 96dpi
    const padding = 8;
    const scale = Math.min(1, (viewportWidth - padding) / a4WidthPx);
    const scaledHeight = a4HeightPx * scale;
    pages.forEach((p) => {
      p.style.transformOrigin = 'top left';
      p.style.transform = `scale(${scale})`;
      // 縮小分のネガティブマージンで重なりを防止
      p.style.height = `${a4HeightPx}px`;
      p.style.marginBottom = `${-(a4HeightPx - scaledHeight) + 8}px`;
    });
  }

  function renderPreviewAppSelector(selectedId) {
    const sel = document.getElementById('preview-app-selector');
    if (!sel) return;
    sel.innerHTML = applicationsData.map((a) =>
      `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${Utils.escapeHtml(a.companyName)}</option>`
    ).join('');
    sel.onchange = async () => {
      currentAppId = Number(sel.value);
      await showPreview();
    };
  }

  // ================================================================
  // プロフィール
  // ================================================================
  function fillProfileForm() {
    const f = document.getElementById('profile-form');
    if (!f) return;
    const fields = ['name', 'nameKana', 'birthDate', 'gender', 'postalCode', 'address', 'addressKana', 'phone', 'email', 'contactPostalCode', 'contactAddress', 'contactAddressKana', 'contactPhone', 'contactEmail'];
    fields.forEach((key) => {
      const el = f.querySelector(`[name="${key}"]`);
      if (el) el.value = profileData[key] || '';
    });
    // 写真プレビュー
    const photoPreview = document.getElementById('photo-preview');
    if (photoPreview && profileData.photo) {
      photoPreview.src = profileData.photo;
      photoPreview.classList.remove('hidden');
    }
    // 写真掲載チェックボックス
    const photoCheckbox = document.getElementById('photo-enabled');
    if (photoCheckbox) {
      photoCheckbox.checked = profileData.photoEnabled !== false;
    }
  }

  async function saveProfileForm() {
    const f = document.getElementById('profile-form');
    const formData = new FormData(f);
    const data = {};
    for (const [key, val] of formData.entries()) {
      data[key] = val;
    }
    data.photo = profileData.photo || '';
    // チェックボックスはFormDataに含まれない場合がある
    const photoCheckbox = document.getElementById('photo-enabled');
    data.photoEnabled = photoCheckbox ? photoCheckbox.checked : true;
    profileData = { ...profileData, ...data };
    await DB.saveProfile(profileData);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await Utils.fileToBase64(file);
      profileData.photo = base64;
      await DB.saveProfile(profileData);
      const preview = document.getElementById('photo-preview');
      if (preview) {
        preview.src = base64;
        preview.classList.remove('hidden');
      }
      Utils.showToast('写真を保存しました', 'success');
    } catch (err) {
      Utils.showToast('写真の読み込みに失敗しました', 'error');
    }
  }

  // ================================================================
  // 郵便番号→住所自動入力
  // ================================================================
  function setupPostalCodeAutoFill(postalId, addressId, addressKanaId) {
    const postalInput = document.getElementById(postalId);
    if (!postalInput) return;

    postalInput.addEventListener('input', debounce(async () => {
      const raw = postalInput.value.replace(/[^0-9]/g, '');
      if (raw.length !== 7) return;

      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${raw}`);
        const json = await res.json();
        if (json.status !== 200 || !json.results || json.results.length === 0) return;

        const r = json.results[0];
        const addr = `${r.address1}${r.address2}${r.address3}`;
        const kana = `${r.kana1}${r.kana2}${r.kana3}`;

        const addressEl = document.getElementById(addressId);
        const kanaEl = document.getElementById(addressKanaId);

        if (addressEl && !addressEl.value) {
          addressEl.value = addr;
          addressEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (kanaEl && !kanaEl.value) {
          kanaEl.value = kana;
          kanaEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (err) {
        // ネットワークエラーは無視（オフライン時）
      }
    }, 300));
  }

  // ================================================================
  // 学歴・職歴
  // ================================================================
  function renderEducationList() {
    const eduContainer = document.getElementById('edu-list');
    const workContainer = document.getElementById('work-list');
    if (!eduContainer || !workContainer) return;

    const eduItems = educationData.filter((x) => x.type === '学歴');
    const workItems = educationData.filter((x) => x.type === '職歴');

    eduContainer.innerHTML = eduItems.map((item, i) => educationEntryHTML(item, i, eduItems.length)).join('');
    workContainer.innerHTML = workItems.map((item, i) => educationEntryHTML(item, i, workItems.length)).join('');

    // イベント設定
    eduContainer.querySelectorAll('.entry-row').forEach((row) => setupEntryEvents(row, '学歴'));
    workContainer.querySelectorAll('.entry-row').forEach((row) => setupEntryEvents(row, '職歴'));
  }

  function educationEntryHTML(item, index, total) {
    return `
    <div class="entry-row" data-id="${item.id}">
      <div class="entry-actions">
        <button class="btn-move btn-move-up" title="上へ" ${index === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn-move btn-move-down" title="下へ" ${index === total - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <input type="number" class="input-year" value="${item.year || ''}" placeholder="年" min="1950" max="2100">
      <input type="number" class="input-month" value="${item.month || ''}" placeholder="月" min="1" max="12">
      <input type="text" class="input-content" value="${Utils.escapeHtml(item.content || '')}" placeholder="内容">
      <button class="btn-delete" title="削除">✕</button>
    </div>`;
  }

  function setupEntryEvents(row, type) {
    const id = Number(row.dataset.id);
    const inputs = row.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('change', async () => {
        const entry = educationData.find((x) => x.id === id);
        if (!entry) return;
        entry.year = Number(row.querySelector('.input-year').value) || 0;
        entry.month = Number(row.querySelector('.input-month').value) || 0;
        entry.content = row.querySelector('.input-content').value;
        await DB.saveEducation(entry);
        educationData = await DB.loadEducation();
      });
    });
    row.querySelector('.btn-delete').addEventListener('click', async () => {
      if (!confirm('この項目を削除しますか？')) return;
      await DB.deleteEducation(id);
      educationData = await DB.loadEducation();
      renderEducationList();
    });

    // 並び替え
    const btnUp = row.querySelector('.btn-move-up');
    const btnDown = row.querySelector('.btn-move-down');
    if (btnUp) {
      btnUp.addEventListener('click', async () => {
        await swapEducationOrder(id, type, -1);
      });
    }
    if (btnDown) {
      btnDown.addEventListener('click', async () => {
        await swapEducationOrder(id, type, 1);
      });
    }
  }

  async function swapEducationOrder(id, type, direction) {
    const items = educationData.filter((x) => x.type === type);
    const idx = items.findIndex((x) => x.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    // swap order values
    const tmpOrder = items[idx].order;
    items[idx].order = items[targetIdx].order;
    items[targetIdx].order = tmpOrder;
    await DB.saveEducation(items[idx]);
    await DB.saveEducation(items[targetIdx]);
    educationData = await DB.loadEducation();
    renderEducationList();
  }

  async function addEducationEntry(type) {
    const order = educationData.filter((x) => x.type === type).length;
    const entry = { id: Utils.generateId(), year: 0, month: 0, content: '', type, order };
    await DB.saveEducation(entry);
    educationData = await DB.loadEducation();
    renderEducationList();
  }

  // ================================================================
  // 職務経歴
  // ================================================================
  function renderCareerList() {
    const container = document.getElementById('career-list');
    if (!container) return;

    container.innerHTML = careerData.map((c, i) => careerEntryHTML(c, i)).join('');

    // イベント設定
    container.querySelectorAll('.career-entry-card').forEach(setupCareerEntryEvents);
  }

  function careerEntryHTML(career, index) {
    const dutiesHtml = (career.duties || []).map((d, i) => `
      <div class="list-input-row" data-list-index="${i}">
        <input type="text" class="duty-input" value="${Utils.escapeHtml(d)}" placeholder="業務内容">
        <button class="btn-delete btn-delete-duty" title="削除">✕</button>
      </div>`).join('');

    const achievementsHtml = (career.achievements || []).map((a, i) => `
      <div class="list-input-row" data-list-index="${i}">
        <input type="text" class="achievement-input" value="${Utils.escapeHtml(a)}" placeholder="成果">
        <button class="btn-delete btn-delete-achievement" title="削除">✕</button>
      </div>`).join('');

    return `
    <div class="career-entry-card" data-id="${career.id}">
      <div class="career-entry-header">
        <span class="career-entry-num">職務経歴 ${index + 1}</span>
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="btn-move btn-move-up-career" title="上へ" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button class="btn-move btn-move-down-career" title="下へ" ${index === careerData.length - 1 ? 'disabled' : ''}>▼</button>
          <button class="btn-delete btn-delete-career" title="削除">✕</button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>開始年月</label>
          <input type="month" class="career-start" value="${career.startDate || ''}">
        </div>
        <div class="form-group">
          <label>終了年月</label>
          <input type="month" class="career-end-date" value="${career.endDate === '現在' ? '' : (career.endDate || '')}">
          <label class="checkbox-label" style="margin-top:4px;">
            <input type="checkbox" class="career-current" ${career.endDate === '現在' ? 'checked' : ''}>
            <span>現在</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label class="company-name-label">${career.isDispatch ? '派遣会社名（派遣元）' : '会社名'}</label>
        <input type="text" class="career-company" value="${Utils.escapeHtml(career.companyName || '')}" placeholder="${career.isDispatch ? '派遣会社名' : '会社名'}">
      </div>

      <label class="checkbox-label" style="margin-bottom:8px;">
        <input type="checkbox" class="career-is-dispatch" ${career.isDispatch ? 'checked' : ''}>
        <span>派遣として勤務</span>
      </label>

      <div class="dispatch-fields" style="${career.isDispatch ? '' : 'display:none;'}">
        <div class="form-group">
          <label>派遣先企業名（派遣の場合）</label>
          <input type="text" class="career-dispatch-to" value="${Utils.escapeHtml(career.dispatchTo || '')}" placeholder="派遣先の企業名">
        </div>
      </div>

      <div class="form-group">
        <label>事業内容</label>
        <input type="text" class="career-business" value="${Utils.escapeHtml(career.businessContent || '')}" placeholder="事業内容">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>資本金</label>
          <input type="text" class="career-capital" value="${Utils.escapeHtml(career.capital || '')}" placeholder="例: 1億円">
        </div>
        <div class="form-group">
          <label>売上高</label>
          <input type="text" class="career-revenue" value="${Utils.escapeHtml(career.revenue || '')}" placeholder="例: 10億円">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>従業員数</label>
          <input type="text" class="career-employees" value="${Utils.escapeHtml(career.employeeCount || '')}" placeholder="例: 100名">
        </div>
        <div class="form-group">
          <label>上場区分</label>
          <select class="career-listing">
            <option value="" ${!career.listing ? 'selected' : ''}>未選択</option>
            <option value="東証プライム" ${career.listing === '東証プライム' ? 'selected' : ''}>東証プライム</option>
            <option value="東証スタンダード" ${career.listing === '東証スタンダード' ? 'selected' : ''}>東証スタンダード</option>
            <option value="東証グロース" ${career.listing === '東証グロース' ? 'selected' : ''}>東証グロース</option>
            <option value="非上場" ${career.listing === '非上場' ? 'selected' : ''}>非上場</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>役職・ポジション</label>
          <input type="text" class="career-position" value="${Utils.escapeHtml(career.position || '')}" placeholder="例: リーダー">
        </div>
        <div class="form-group">
          <label>雇用形態</label>
          <select class="career-employment-type">
            <option value="" ${!career.employmentType ? 'selected' : ''}>未選択</option>
            <option value="正社員" ${career.employmentType === '正社員' ? 'selected' : ''}>正社員</option>
            <option value="契約社員" ${career.employmentType === '契約社員' ? 'selected' : ''}>契約社員</option>
            <option value="派遣社員" ${career.employmentType === '派遣社員' ? 'selected' : ''}>派遣社員</option>
            <option value="アルバイト" ${career.employmentType === 'アルバイト' ? 'selected' : ''}>アルバイト</option>
            <option value="業務委託" ${career.employmentType === '業務委託' ? 'selected' : ''}>業務委託</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>配属部署</label>
        <input type="text" class="career-department" value="${Utils.escapeHtml(career.department || '')}" placeholder="例: 開発部">
      </div>

      <h3 class="section-title">業務内容</h3>
      <div class="list-input-area duties-area">
        ${dutiesHtml}
      </div>
      <button type="button" class="btn-add-list-item btn-add-duty">＋ 業務内容を追加</button>

      <h3 class="section-title">業務上の工夫・成果</h3>
      <div class="list-input-area achievements-area">
        ${achievementsHtml}
      </div>
      <button type="button" class="btn-add-list-item btn-add-achievement">＋ 成果を追加</button>
    </div>`;
  }

  function setupCareerEntryEvents(card) {
    const id = Number(card.dataset.id);

    // フィールド変更時の自動保存
    const saveCareerFields = debounce(async () => {
      const entry = careerData.find((x) => x.id === id);
      if (!entry) return;

      entry.startDate = card.querySelector('.career-start').value;
      const isCurrent = card.querySelector('.career-current').checked;
      entry.endDate = isCurrent ? '現在' : (card.querySelector('.career-end-date').value || '');
      entry.companyName = card.querySelector('.career-company').value;
      entry.businessContent = card.querySelector('.career-business').value;
      entry.capital = card.querySelector('.career-capital').value;
      entry.revenue = card.querySelector('.career-revenue').value;
      entry.employeeCount = card.querySelector('.career-employees').value;
      entry.listing = card.querySelector('.career-listing').value;
      entry.position = card.querySelector('.career-position').value;
      entry.employmentType = card.querySelector('.career-employment-type').value;
      entry.department = card.querySelector('.career-department').value;
      entry.isDispatch = card.querySelector('.career-is-dispatch').checked;
      entry.dispatchTo = card.querySelector('.career-dispatch-to')?.value || '';

      // 業務内容リスト
      entry.duties = Array.from(card.querySelectorAll('.duty-input')).map((inp) => inp.value);
      // 成果リスト
      entry.achievements = Array.from(card.querySelectorAll('.achievement-input')).map((inp) => inp.value);

      await DB.saveCareer(entry);
      careerData = await DB.loadCareer();
    }, 500);

    // 全inputとselectの変更を監視
    card.querySelectorAll('input, select, textarea').forEach((el) => {
      el.addEventListener('input', saveCareerFields);
      el.addEventListener('change', saveCareerFields);
    });

    // 「現在」チェック切替
    card.querySelector('.career-current').addEventListener('change', (e) => {
      const endInput = card.querySelector('.career-end-date');
      if (e.target.checked) {
        endInput.value = '';
        endInput.disabled = true;
      } else {
        endInput.disabled = false;
      }
      saveCareerFields();
    });
    // 初期状態
    if (card.querySelector('.career-current').checked) {
      card.querySelector('.career-end-date').disabled = true;
    }

    // 派遣チェック切替
    card.querySelector('.career-is-dispatch').addEventListener('change', (ev) => {
      const dispatchFields = card.querySelector('.dispatch-fields');
      const companyLabel = card.querySelector('.company-name-label');
      const companyInput = card.querySelector('.career-company');
      if (ev.target.checked) {
        dispatchFields.style.display = '';
        companyLabel.textContent = '派遣会社名（派遣元）';
        companyInput.placeholder = '派遣会社名';
      } else {
        dispatchFields.style.display = 'none';
        companyLabel.textContent = '会社名';
        companyInput.placeholder = '会社名';
      }
      saveCareerFields();
    });

    // カード削除
    card.querySelector('.btn-delete-career').addEventListener('click', async () => {
      if (!confirm('この職務経歴を削除しますか？')) return;
      await DB.deleteCareer(id);
      careerData = await DB.loadCareer();
      renderCareerList();
    });

    // カード並び替え
    const btnUpCareer = card.querySelector('.btn-move-up-career');
    const btnDownCareer = card.querySelector('.btn-move-down-career');
    if (btnUpCareer) btnUpCareer.addEventListener('click', () => swapCareerOrder(id, -1));
    if (btnDownCareer) btnDownCareer.addEventListener('click', () => swapCareerOrder(id, 1));

    // 業務内容の追加
    card.querySelector('.btn-add-duty').addEventListener('click', async () => {
      const entry = careerData.find((x) => x.id === id);
      if (!entry) return;
      if (!entry.duties) entry.duties = [];
      entry.duties.push('');
      await DB.saveCareer(entry);
      careerData = await DB.loadCareer();
      renderCareerList();
    });

    // 成果の追加
    card.querySelector('.btn-add-achievement').addEventListener('click', async () => {
      const entry = careerData.find((x) => x.id === id);
      if (!entry) return;
      if (!entry.achievements) entry.achievements = [];
      entry.achievements.push('');
      await DB.saveCareer(entry);
      careerData = await DB.loadCareer();
      renderCareerList();
    });

    // 業務内容の削除
    card.querySelectorAll('.btn-delete-duty').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const entry = careerData.find((x) => x.id === id);
        if (!entry) return;
        const idx = Number(btn.closest('.list-input-row').dataset.listIndex);
        entry.duties.splice(idx, 1);
        await DB.saveCareer(entry);
        careerData = await DB.loadCareer();
        renderCareerList();
      });
    });

    // 成果の削除
    card.querySelectorAll('.btn-delete-achievement').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const entry = careerData.find((x) => x.id === id);
        if (!entry) return;
        const idx = Number(btn.closest('.list-input-row').dataset.listIndex);
        entry.achievements.splice(idx, 1);
        await DB.saveCareer(entry);
        careerData = await DB.loadCareer();
        renderCareerList();
      });
    });
  }

  async function addCareerEntry() {
    const entry = {
      id: Utils.generateId(),
      companyName: '',
      businessContent: '',
      capital: '',
      revenue: '',
      employeeCount: '',
      listing: '',
      position: '',
      employmentType: '',
      department: '',
      duties: [],
      achievements: [],
      dispatchTo: '',
      dispatchFrom: '',
      isDispatch: false,
      startDate: '',
      endDate: '',
      order: careerData.length,
    };
    await DB.saveCareer(entry);
    careerData = await DB.loadCareer();
    renderCareerList();
  }

  async function swapCareerOrder(id, direction) {
    const idx = careerData.findIndex((x) => x.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= careerData.length) return;
    const tmpOrder = careerData[idx].order;
    careerData[idx].order = careerData[targetIdx].order;
    careerData[targetIdx].order = tmpOrder;
    await DB.saveCareer(careerData[idx]);
    await DB.saveCareer(careerData[targetIdx]);
    careerData = await DB.loadCareer();
    renderCareerList();
  }

  // ================================================================
  // 資格・免許
  // ================================================================
  function renderQualificationsList() {
    const container = document.getElementById('qual-list');
    if (!container) return;
    container.innerHTML = qualificationsData.map((q, i) => `
    <div class="entry-row" data-id="${q.id}">
      <div class="entry-actions">
        <button class="btn-move btn-move-up" title="上へ" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn-move btn-move-down" title="下へ" ${i === qualificationsData.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <input type="number" class="input-year" value="${q.year || ''}" placeholder="年" min="1950" max="2100">
      <input type="number" class="input-month" value="${q.month || ''}" placeholder="月" min="1" max="12">
      <input type="text" class="input-content" value="${Utils.escapeHtml(q.content || '')}" placeholder="資格名">
      <button class="btn-delete" title="削除">✕</button>
    </div>`).join('');

    container.querySelectorAll('.entry-row').forEach((row) => {
      const id = Number(row.dataset.id);
      row.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', async () => {
          const entry = qualificationsData.find((x) => x.id === id);
          if (!entry) return;
          entry.year = Number(row.querySelector('.input-year').value) || 0;
          entry.month = Number(row.querySelector('.input-month').value) || 0;
          entry.content = row.querySelector('.input-content').value;
          await DB.saveQualification(entry);
          qualificationsData = await DB.loadQualifications();
        });
      });
      row.querySelector('.btn-delete').addEventListener('click', async () => {
        if (!confirm('この項目を削除しますか？')) return;
        await DB.deleteQualification(id);
        qualificationsData = await DB.loadQualifications();
        renderQualificationsList();
      });

      // 並び替え
      const btnUp = row.querySelector('.btn-move-up');
      const btnDown = row.querySelector('.btn-move-down');
      if (btnUp) btnUp.addEventListener('click', () => swapQualificationOrder(id, -1));
      if (btnDown) btnDown.addEventListener('click', () => swapQualificationOrder(id, 1));
    });
  }

  async function swapQualificationOrder(id, direction) {
    const idx = qualificationsData.findIndex((x) => x.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= qualificationsData.length) return;
    const tmpOrder = qualificationsData[idx].order;
    qualificationsData[idx].order = qualificationsData[targetIdx].order;
    qualificationsData[targetIdx].order = tmpOrder;
    await DB.saveQualification(qualificationsData[idx]);
    await DB.saveQualification(qualificationsData[targetIdx]);
    qualificationsData = await DB.loadQualifications();
    renderQualificationsList();
  }

  async function addQualificationEntry() {
    const entry = { id: Utils.generateId(), year: 0, month: 0, content: '', order: qualificationsData.length };
    await DB.saveQualification(entry);
    qualificationsData = await DB.loadQualifications();
    renderQualificationsList();
  }

  // ================================================================
  // 応募先管理
  // ================================================================
  function renderApplicationSelector() {
    const sel = document.getElementById('app-selector');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- 応募先を選択 --</option>' +
      applicationsData.map((a) =>
        `<option value="${a.id}" ${a.id === currentAppId ? 'selected' : ''}>${Utils.escapeHtml(a.companyName || '（未入力）')}</option>`
      ).join('');
  }

  function selectApplication() {
    const sel = document.getElementById('app-selector');
    currentAppId = sel.value ? Number(sel.value) : null;
    fillApplicationForm();
  }

  function fillApplicationForm() {
    const form = document.getElementById('application-form');
    if (!form) return;
    const app = applicationsData.find((a) => a.id === currentAppId);
    const fields = ['companyName', 'submissionDate', 'careerSummary', 'motivation', 'selfPR', 'careerMotivation', 'personalRequest'];
    fields.forEach((key) => {
      const el = form.querySelector(`[name="${key}"]`);
      if (el) el.value = app ? (app[key] || '') : '';
    });

    // スキル・強み
    renderSkillsList(app?.skills || []);

    // 削除ボタンの有効/無効
    const btnDel = document.getElementById('btn-delete-app');
    if (btnDel) btnDel.disabled = !currentAppId;
  }

  async function saveApplicationForm() {
    if (!currentAppId) return;
    const form = document.getElementById('application-form');
    const formData = new FormData(form);
    const app = applicationsData.find((a) => a.id === currentAppId);
    if (!app) return;

    for (const [key, val] of formData.entries()) {
      app[key] = val;
    }
    // スキルを収集
    app.skills = collectSkills();

    await DB.saveApplication(app);
    applicationsData = await DB.loadApplications();
    renderApplicationSelector();
  }

  async function addApplication() {
    const name = prompt('応募先企業名を入力してください:');
    if (!name) return;
    const entry = {
      id: Utils.generateId(),
      companyName: name,
      submissionDate: Utils.todayStr(),
      careerSummary: '',
      motivation: '',
      selfPR: '',
      skills: [],
      careerMotivation: '',
      personalRequest: '勤務形態・条件等については貴社の規定に従います。',
      createdAt: Utils.nowISO(),
      updatedAt: Utils.nowISO(),
    };
    await DB.saveApplication(entry);
    applicationsData = await DB.loadApplications();
    currentAppId = entry.id;
    renderApplicationSelector();
    fillApplicationForm();
    Utils.showToast(`「${name}」を追加しました`, 'success');
  }

  // 応募先削除
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'btn-delete-app') {
      if (!currentAppId) return;
      if (!confirm('この応募先を削除しますか？')) return;
      await DB.deleteApplication(currentAppId);
      applicationsData = await DB.loadApplications();
      currentAppId = applicationsData.length > 0 ? applicationsData[0].id : null;
      renderApplicationSelector();
      fillApplicationForm();
      Utils.showToast('応募先を削除しました', 'info');
    }
  });

  // 応募先コピー
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'btn-copy-app') {
      if (!currentAppId) return;
      const src = applicationsData.find((a) => a.id === currentAppId);
      if (!src) return;
      const copy = { ...src, id: Utils.generateId(), companyName: src.companyName + '（コピー）', createdAt: Utils.nowISO(), updatedAt: Utils.nowISO() };
      if (copy.skills) copy.skills = JSON.parse(JSON.stringify(copy.skills));
      await DB.saveApplication(copy);
      applicationsData = await DB.loadApplications();
      currentAppId = copy.id;
      renderApplicationSelector();
      fillApplicationForm();
      Utils.showToast('応募先をコピーしました', 'success');
    }
  });

  // ================================================================
  // スキル・強み
  // ================================================================
  function renderSkillsList(skills) {
    const container = document.getElementById('skills-list');
    if (!container) return;
    const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
    container.innerHTML = skills.map((s, i) => `
    <div class="skill-entry" data-index="${i}">
      <div class="skill-entry-header">
        <span class="skill-num">${circled[i] || (i + 1)}</span>
        <input type="text" class="skill-title-input" value="${Utils.escapeHtml(s.title || '')}" placeholder="スキルタイトル">
        <button class="btn-move btn-move-up-skill" title="上へ" ${i === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn-move btn-move-down-skill" title="下へ" ${i === skills.length - 1 ? 'disabled' : ''}>▼</button>
        <button type="button" class="btn-delete btn-delete-skill" title="削除">✕</button>
      </div>
      <textarea class="skill-desc-input" placeholder="説明">${Utils.escapeHtml(s.description || '')}</textarea>
    </div>`).join('');

    // 削除イベント
    container.querySelectorAll('.btn-delete-skill').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const idx = Number(btn.closest('.skill-entry').dataset.index);
        const app = applicationsData.find((a) => a.id === currentAppId);
        if (!app || !app.skills) return;
        app.skills = collectSkills();
        app.skills.splice(idx, 1);
        await DB.saveApplication(app);
        applicationsData = await DB.loadApplications();
        const updatedApp = applicationsData.find((a) => a.id === currentAppId);
        renderSkillsList(updatedApp?.skills || []);
      });
    });

    // スキル移動イベント
    container.querySelectorAll('.btn-move-up-skill').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const idx = Number(btn.closest('.skill-entry').dataset.index);
        if (idx <= 0) return;
        const app = applicationsData.find((a) => a.id === currentAppId);
        if (!app || !app.skills) return;
        app.skills = collectSkills();
        [app.skills[idx - 1], app.skills[idx]] = [app.skills[idx], app.skills[idx - 1]];
        await DB.saveApplication(app);
        applicationsData = await DB.loadApplications();
        const updatedApp = applicationsData.find((a) => a.id === currentAppId);
        renderSkillsList(updatedApp?.skills || []);
      });
    });
    container.querySelectorAll('.btn-move-down-skill').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const idx = Number(btn.closest('.skill-entry').dataset.index);
        const app = applicationsData.find((a) => a.id === currentAppId);
        if (!app || !app.skills) return;
        app.skills = collectSkills();
        if (idx >= app.skills.length - 1) return;
        [app.skills[idx], app.skills[idx + 1]] = [app.skills[idx + 1], app.skills[idx]];
        await DB.saveApplication(app);
        applicationsData = await DB.loadApplications();
        const updatedApp = applicationsData.find((a) => a.id === currentAppId);
        renderSkillsList(updatedApp?.skills || []);
      });
    });

    // 変更イベント
    container.querySelectorAll('.skill-title-input, .skill-desc-input').forEach((input) => {
      input.addEventListener('change', () => saveApplicationForm());
    });
  }

  function collectSkills() {
    const entries = document.querySelectorAll('#skills-list .skill-entry');
    return Array.from(entries).map((entry) => ({
      title: entry.querySelector('.skill-title-input').value,
      description: entry.querySelector('.skill-desc-input').value,
    }));
  }

  async function addSkillEntry() {
    if (!currentAppId) {
      Utils.showToast('先に応募先を選択してください', 'error');
      return;
    }
    const app = applicationsData.find((a) => a.id === currentAppId);
    if (!app) return;
    if (!app.skills) app.skills = [];
    // 現在の入力値を収集してから追加
    app.skills = collectSkills();
    app.skills.push({ title: '', description: '' });
    await DB.saveApplication(app);
    applicationsData = await DB.loadApplications();
    const updatedApp = applicationsData.find((a) => a.id === currentAppId);
    renderSkillsList(updatedApp?.skills || []);
  }

  // ================================================================
  // PDF生成
  // ================================================================
  async function generatePDF(type) {
    try {
      Utils.showToast('PDF生成中...', 'info');
      await loadAllData();
      const app = currentAppId
        ? applicationsData.find((a) => a.id === currentAppId)
        : applicationsData[0];
      const options = getOptions();

      switch (type) {
        case 'resume':
          await PdfGenerator.generateResumePDF(profileData, educationData, qualificationsData, app, options);
          break;
        case 'career':
          await PdfGenerator.generateCareerPDF(profileData, careerData, qualificationsData, app);
          break;
        case 'all':
          await PdfGenerator.generateAllPDF(profileData, educationData, careerData, qualificationsData, app, options);
          break;
      }
      Utils.showToast('PDFを生成しました', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('PDF生成に失敗しました: ' + err.message, 'error');
    }
  }

  // ================================================================
  // エクスポート / インポート (JSON only)
  // ================================================================
  async function exportJSON() {
    try {
      const json = await DB.exportAllJSON();
      const filename = `resume_backup_${Utils.formatDateForFile()}.json`;
      Utils.downloadFile(json, filename, 'application/json');
      Utils.showToast('JSONエクスポート完了', 'success');
    } catch (err) {
      Utils.showToast('エクスポート失敗: ' + err.message, 'error');
    }
  }

  async function importJSON() {
    try {
      const { content } = await Utils.openFileDialog('.json');
      await DB.importAllJSON(content);
      await loadAllData();
      switchTab(currentTab);
      Utils.showToast('JSONインポート完了', 'success');
    } catch (err) {
      Utils.showToast('インポート失敗: ' + err.message, 'error');
    }
  }

  // ================================================================
  // リセット
  // ================================================================
  async function resetAllData() {
    if (!confirm('すべてのデータを削除してリセットしますか？\nこの操作は元に戻せません。')) return;
    if (!confirm('本当にリセットしますか？')) return;
    try {
      await DB.clearStore(DB.STORES.PROFILE);
      await DB.clearStore(DB.STORES.EDUCATION);
      await DB.clearStore(DB.STORES.CAREER);
      await DB.clearStore(DB.STORES.QUALIFICATIONS);
      await DB.clearStore(DB.STORES.APPLICATIONS);
      profileData = {};
      educationData = [];
      careerData = [];
      qualificationsData = [];
      applicationsData = [];
      currentAppId = null;
      switchTab('profile');
      renderApplicationSelector();
      Utils.showToast('すべてのデータをリセットしました', 'info');
    } catch (err) {
      Utils.showToast('リセットに失敗しました: ' + err.message, 'error');
    }
  }

  // ================================================================
  // ユーティリティ
  // ================================================================
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // アプリ開始
  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
