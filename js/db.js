// ============================================================
// db.js — IndexedDB 管理（5ストアのCRUD操作）
// ============================================================

const DB = (() => {
  const DB_NAME = 'ResumeCreaterDB';
  const DB_VERSION = 1;
  let db = null;

  const STORES = {
    PROFILE: 'profile',
    EDUCATION: 'education',
    CAREER: 'career',
    QUALIFICATIONS: 'qualifications',
    APPLICATIONS: 'applications',
  };

  /**
   * データベースを開く（初回はストアを作成）
   * @returns {Promise<IDBDatabase>}
   */
  function open() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        if (!database.objectStoreNames.contains(STORES.PROFILE)) {
          database.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORES.EDUCATION)) {
          const store = database.createObjectStore(STORES.EDUCATION, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('order', 'order', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.CAREER)) {
          const store = database.createObjectStore(STORES.CAREER, { keyPath: 'id' });
          store.createIndex('order', 'order', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.QUALIFICATIONS)) {
          const store = database.createObjectStore(STORES.QUALIFICATIONS, { keyPath: 'id' });
          store.createIndex('order', 'order', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.APPLICATIONS)) {
          database.createObjectStore(STORES.APPLICATIONS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  // ------ 汎用CRUD ------

  function _tx(storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function put(storeName, data) {
    return new Promise((resolve, reject) => {
      const req = _tx(storeName, 'readwrite').put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function get(storeName, id) {
    return new Promise((resolve, reject) => {
      const req = _tx(storeName, 'readonly').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function getAll(storeName) {
    return new Promise((resolve, reject) => {
      const req = _tx(storeName, 'readonly').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function remove(storeName, id) {
    return new Promise((resolve, reject) => {
      const req = _tx(storeName, 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const req = _tx(storeName, 'readwrite').clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // ------ Profile ------

  async function saveProfile(data) {
    await open();
    data.id = 1;
    return put(STORES.PROFILE, data);
  }

  async function loadProfile() {
    await open();
    return get(STORES.PROFILE, 1);
  }

  // ------ Education ------

  async function saveEducation(entry) {
    await open();
    if (!entry.id) entry.id = Utils.generateId();
    return put(STORES.EDUCATION, entry);
  }

  async function loadEducation() {
    await open();
    const items = await getAll(STORES.EDUCATION);
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async function deleteEducation(id) {
    await open();
    return remove(STORES.EDUCATION, id);
  }

  // ------ Career ------

  async function saveCareer(entry) {
    await open();
    if (!entry.id) entry.id = Utils.generateId();
    return put(STORES.CAREER, entry);
  }

  async function loadCareer() {
    await open();
    const items = await getAll(STORES.CAREER);
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async function deleteCareer(id) {
    await open();
    return remove(STORES.CAREER, id);
  }

  // ------ Qualifications ------

  async function saveQualification(entry) {
    await open();
    if (!entry.id) entry.id = Utils.generateId();
    return put(STORES.QUALIFICATIONS, entry);
  }

  async function loadQualifications() {
    await open();
    const items = await getAll(STORES.QUALIFICATIONS);
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async function deleteQualification(id) {
    await open();
    return remove(STORES.QUALIFICATIONS, id);
  }

  // ------ Applications ------

  async function saveApplication(entry) {
    await open();
    if (!entry.id) entry.id = Utils.generateId();
    if (!entry.createdAt) entry.createdAt = Utils.nowISO();
    entry.updatedAt = Utils.nowISO();
    return put(STORES.APPLICATIONS, entry);
  }

  async function loadApplications() {
    await open();
    return getAll(STORES.APPLICATIONS);
  }

  async function loadApplication(id) {
    await open();
    return get(STORES.APPLICATIONS, id);
  }

  async function deleteApplication(id) {
    await open();
    return remove(STORES.APPLICATIONS, id);
  }

  // ------ Export / Import (JSON) ------

  async function exportAllJSON() {
    await open();
    const data = {
      version: 1,
      exportedAt: Utils.nowISO(),
      profile: await loadProfile(),
      education: await loadEducation(),
      career: await loadCareer(),
      qualifications: await loadQualifications(),
      applications: await loadApplications(),
    };
    return JSON.stringify(data, null, 2);
  }

  async function importAllJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    await open();

    // profile
    if (data.profile) {
      await clearStore(STORES.PROFILE);
      await saveProfile(data.profile);
    }
    // education
    if (data.education) {
      await clearStore(STORES.EDUCATION);
      for (const item of data.education) await put(STORES.EDUCATION, item);
    }
    // career
    if (data.career) {
      await clearStore(STORES.CAREER);
      for (const item of data.career) await put(STORES.CAREER, item);
    }
    // qualifications
    if (data.qualifications) {
      await clearStore(STORES.QUALIFICATIONS);
      for (const item of data.qualifications) await put(STORES.QUALIFICATIONS, item);
    }
    // applications
    if (data.applications) {
      await clearStore(STORES.APPLICATIONS);
      for (const item of data.applications) await put(STORES.APPLICATIONS, item);
    }
  }

  return {
    STORES,
    open,
    put,
    get,
    getAll,
    remove,
    clearStore,
    saveProfile,
    loadProfile,
    saveEducation,
    loadEducation,
    deleteEducation,
    saveCareer,
    loadCareer,
    deleteCareer,
    saveQualification,
    loadQualifications,
    deleteQualification,
    saveApplication,
    loadApplications,
    loadApplication,
    deleteApplication,
    exportAllJSON,
    importAllJSON,
  };
})();
