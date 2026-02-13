// ============================================================
// app.js — メインロジック・UI制御・タブ切替・イベント管理
// ============================================================

const App = (() => {
  // 現在の状態
  let currentTab = 'profile';
  let currentScreen = 'input'; // 'input' | 'preview'
  let currentAppId = null;

  // キャッシュ
  let profileData = {};
  let educationData = [];
  let careerData = [];
  let qualificationsData = [];
  let applicationsData = [];

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

    // 学歴・職歴追加
    document.getElementById('btn-add-edu').addEventListener('click', () => addEducationEntry('学歴'));
    document.getElementById('btn-add-work').addEventListener('click', () => addEducationEntry('職歴'));

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

    // メニュー
    document.getElementById('btn-menu').addEventListener('click', toggleMenu);

    // エクスポート/インポート
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);
    document.getElementById('btn-import-json').addEventListener('click', importJSON);
    document.getElementById('btn-export-csv').addEventListener('click', showCsvExportMenu);
    document.getElementById('btn-import-csv').addEventListener('click', importCSV);
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
    const app = currentAppId ? applicationsData.find((a) => a.id === currentAppId) : applicationsData[0];

    const previewArea = document.getElementById('preview-area');
    const resumeHTML = Templates.generateResumeHTML(profileData, educationData, qualificationsData, app);
    const careerHTML = Templates.generateCareerHTML(profileData, careerData, qualificationsData, app);
    previewArea.innerHTML = resumeHTML + careerHTML;

    // プレビュー用応募先セレクタ
    renderPreviewAppSelector(app?.id);
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
  }

  async function saveProfileForm() {
    const f = document.getElementById('profile-form');
    const formData = new FormData(f);
    const data = {};
    for (const [key, val] of formData.entries()) {
      data[key] = val;
    }
    data.photo = profileData.photo || '';
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
  // 学歴・職歴
  // ================================================================
  function renderEducationList() {
    const eduContainer = document.getElementById('edu-list');
    const workContainer = document.getElementById('work-list');
    if (!eduContainer || !workContainer) return;

    const eduItems = educationData.filter((x) => x.type === '学歴');
    const workItems = educationData.filter((x) => x.type === '職歴');

    eduContainer.innerHTML = eduItems.map((item) => educationEntryHTML(item)).join('');
    workContainer.innerHTML = workItems.map((item) => educationEntryHTML(item)).join('');

    // イベント設定
    eduContainer.querySelectorAll('.entry-row').forEach(setupEntryEvents);
    workContainer.querySelectorAll('.entry-row').forEach(setupEntryEvents);
  }

  function educationEntryHTML(item) {
    return `
    <div class="entry-row" data-id="${item.id}">
      <input type="number" class="input-year" value="${item.year || ''}" placeholder="年" min="1950" max="2100">
      <input type="number" class="input-month" value="${item.month || ''}" placeholder="月" min="1" max="12">
      <input type="text" class="input-content" value="${Utils.escapeHtml(item.content || '')}" placeholder="内容">
      <button class="btn-delete" title="削除">✕</button>
    </div>`;
  }

  function setupEntryEvents(row) {
    const id = Number(row.dataset.id);
    const inputs = row.querySelectorAll('input');
    inputs.forEach((input) => {
      input.addEventListener('change', async () => {
        const entry = educationData.find((x) => x.id === id);
        if (!entry) return;
        entry.year = Number(row.querySelector('.input-year').value);
        entry.month = Number(row.querySelector('.input-month').value);
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
  }

  async function addEducationEntry(type) {
    const order = educationData.filter((x) => x.type === type).length;
    const entry = { id: Utils.generateId(), year: 0, month: 0, content: '', type, order };
    await DB.saveEducation(entry);
    educationData = await DB.loadEducation();
    renderEducationList();
  }

  // ================================================================
  // 資格・免許
  // ================================================================
  function renderQualificationsList() {
    const container = document.getElementById('qual-list');
    if (!container) return;
    container.innerHTML = qualificationsData.map((q) => `
    <div class="entry-row" data-id="${q.id}">
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
          entry.year = Number(row.querySelector('.input-year').value);
          entry.month = Number(row.querySelector('.input-month').value);
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
    });
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
        <button class="btn-delete btn-delete-skill" title="削除">✕</button>
      </div>
      <textarea class="skill-desc-input" placeholder="説明">${Utils.escapeHtml(s.description || '')}</textarea>
    </div>`).join('');

    // 削除イベント
    container.querySelectorAll('.btn-delete-skill').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.closest('.skill-entry').dataset.index);
        const app = applicationsData.find((a) => a.id === currentAppId);
        if (!app) return;
        app.skills.splice(idx, 1);
        await DB.saveApplication(app);
        applicationsData = await DB.loadApplications();
        renderSkillsList(app.skills);
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
    app.skills.push({ title: '', description: '' });
    await DB.saveApplication(app);
    applicationsData = await DB.loadApplications();
    renderSkillsList(app.skills);
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

      switch (type) {
        case 'resume':
          await PdfGenerator.generateResumePDF(profileData, educationData, qualificationsData, app);
          break;
        case 'career':
          await PdfGenerator.generateCareerPDF(profileData, careerData, qualificationsData, app);
          break;
        case 'all':
          await PdfGenerator.generateAllPDF(profileData, educationData, careerData, qualificationsData, app);
          break;
      }
      Utils.showToast('PDFを生成しました', 'success');
    } catch (err) {
      console.error(err);
      Utils.showToast('PDF生成に失敗しました: ' + err.message, 'error');
    }
  }

  // ================================================================
  // メニュー
  // ================================================================
  function toggleMenu() {
    const menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('hidden');
  }

  // メニュー外クリックで閉じる
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('dropdown-menu');
    const btn = document.getElementById('btn-menu');
    if (menu && !menu.contains(e.target) && e.target !== btn) {
      menu.classList.add('hidden');
    }
  });

  // ================================================================
  // エクスポート / インポート
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
    toggleMenu();
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
    toggleMenu();
  }

  function showCsvExportMenu() {
    const stores = ['profile', 'education', 'career', 'qualifications', 'applications'];
    const labels = ['基本情報', '学歴・職歴', '職務経歴', '資格・免許', '応募先'];
    const choice = prompt(
      'CSVエクスポートするデータを番号で選択:\n' +
      stores.map((s, i) => `${i + 1}. ${labels[i]}`).join('\n') +
      '\n\n番号を入力 (1-5):'
    );
    if (!choice) { toggleMenu(); return; }
    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= stores.length) {
      Utils.showToast('無効な番号です', 'error');
      toggleMenu();
      return;
    }
    CsvHandler.exportCSV(stores[idx])
      .then(() => Utils.showToast(`${labels[idx]}をCSVエクスポートしました`, 'success'))
      .catch((err) => Utils.showToast('CSVエクスポート失敗: ' + err.message, 'error'));
    toggleMenu();
  }

  async function importCSV() {
    try {
      const { name, content } = await Utils.openFileDialog('.csv');
      const storeName = CsvHandler.guessStoreName(name);
      if (!storeName) {
        Utils.showToast('ファイル名からデータ種別を判別できません。profile/education/career/qualifications/applications.csv の名前でインポートしてください。', 'error');
        toggleMenu();
        return;
      }
      await CsvHandler.importCSV(storeName, content);
      await loadAllData();
      switchTab(currentTab);
      Utils.showToast(`CSVインポート完了（${storeName}）`, 'success');
    } catch (err) {
      Utils.showToast('CSVインポート失敗: ' + err.message, 'error');
    }
    toggleMenu();
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
