(function() {
  'use strict';

  // ===== SECURITY MODULE =====

  // 1. Enforce HTTPS (except localhost)
  if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    window.location.href = window.location.href.replace(/^http:/, 'https:');
    return;
  }

  // 2. API URL hidden inside closure via base64
  const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4Z1U0alphR0RkaGpNR3k2LTgwR2pyelYwbUh2SU84a2d6X2pkalJuYVBPR2VlQVZGY1B6MzdqVlFRTk1KWTlZZmkvZXhlYw==');

  // 3. NO HARDCODED PASSWORD - stored in closure only after login
  // The admin password is entered by user and kept in memory only
  let adminPassword = '';
  let allCustomers = [];
  let currentUser = '';
  let currentUserObj = null;
  let cachedUsers = [];
  let mainAdminPassword = '';  // فصل باسورد الأدمن الرئيسي عن باسورد المستخدم الحالي

  // 4. Escape HTML to prevent XSS
  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 5. Sanitize phone number
  function sanitizePhone(phone) {
    return String(phone).replace(/\D/g, '').slice(0, 11);
  }

  // 6. Validate Egyptian phone
  function isValidEgyptianPhone(phone) {
    return /^01[0-2,5]{1}[0-9]{8}$/.test(phone);
  }

  // 7. Sanitize name (letters, spaces, Arabic only)
  function sanitizeName(name) {
    return String(name).replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\w\-_]/g, '').trim().slice(0, 50);
  }

  // 8. Rate limiter for API calls
  var rateLimiter = {
    timestamps: [],
    maxRequests: 15,
    windowMs: 60000,
    canProceed: function() {
      var now = Date.now();
      this.timestamps = this.timestamps.filter(function(t) { return now - t < this.windowMs; }.bind(this));
      if (this.timestamps.length >= this.maxRequests) return false;
      this.timestamps.push(now);
      return true;
    }
  };

  // 9. Brute force protection for login
  var bruteForce = {
    attempts: parseInt(sessionStorage.getItem('admin_bf_attempts') || '0', 10),
    lockoutEnd: parseInt(sessionStorage.getItem('admin_bf_lockout') || '0', 10),
    maxAttempts: 5,
    lockoutMinutes: 15,
    isLocked: function() {
      var now = Date.now();
      if (now < this.lockoutEnd) return true;
      if (this.lockoutEnd > 0 && now >= this.lockoutEnd) {
        this.attempts = 0;
        this.lockoutEnd = 0;
        sessionStorage.removeItem('admin_bf_attempts');
        sessionStorage.removeItem('admin_bf_lockout');
      }
      return false;
    },
    recordFail: function() {
      this.attempts++;
      sessionStorage.setItem('admin_bf_attempts', String(this.attempts));
      if (this.attempts >= this.maxAttempts) {
        this.lockoutEnd = Date.now() + (this.lockoutMinutes * 60000);
        sessionStorage.setItem('admin_bf_lockout', String(this.lockoutEnd));
      }
    },
    recordSuccess: function() {
      this.attempts = 0;
      this.lockoutEnd = 0;
      sessionStorage.removeItem('admin_bf_attempts');
      sessionStorage.removeItem('admin_bf_lockout');
    },
    getRemainingMinutes: function() {
      return Math.ceil((this.lockoutEnd - Date.now()) / 60000);
    }
  };

  // 10. Secure API wrapper
  async function api(params) {
    if (!rateLimiter.canProceed()) {
      throw new Error('Rate limit exceeded. Please wait.');
    }
    var url = new URL(SCRIPT_URL);
    Object.entries(params).forEach(function(_ref) {
      var k = _ref[0], v = _ref[1];
      url.searchParams.set(k, typeof v === 'string' ? v : String(v));
    });
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
    try {
      var res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') throw new Error('Request timed out');
      throw e;
    }
  }

  // ===== DOM REFERENCES =====
  var els = {
    loginScreen: document.getElementById('loginScreen'),
    adminScreen: document.getElementById('adminScreen'),
    userSelect: document.getElementById('userSelect'),
    passInput: document.getElementById('passInput'),
    loginLockoutBanner: document.getElementById('loginLockoutBanner'),
    loginLockoutMinutes: document.getElementById('loginLockoutMinutes'),
    loginFieldError: document.getElementById('loginFieldError'),
    adminLoginBtn: document.getElementById('adminLoginBtn'),
    currentUserLabel: document.getElementById('currentUserLabel'),
    pendingCount: document.getElementById('pendingCount'),
    tabsBar: document.getElementById('tabsBar'),
    darkBtnAdmin: document.getElementById('darkBtnAdmin'),
    toast: document.getElementById('toast'),
    drawer: document.getElementById('drawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    salahOverlay2: document.getElementById('salahOverlay2'),
    changePassModal: document.getElementById('changePassModal'),
    changePassUserLabel: document.getElementById('changePassUserLabel'),
    oldPassInput: document.getElementById('oldPassInput'),
    newPassInput: document.getElementById('newPassInput'),
    confirmPassInput: document.getElementById('confirmPassInput'),
    changePassError: document.getElementById('changePassError'),
    statTotal: document.getElementById('statTotal'),
    statPending: document.getElementById('statPending'),
    statTotalPts: document.getElementById('statTotalPts'),
    statReady: document.getElementById('statReady'),
    quickSearchPhone: document.getElementById('quickSearchPhone'),
    quickResult: document.getElementById('quickResult'),
    ptPhone: document.getElementById('ptPhone'),
    ptAmount: document.getElementById('ptAmount'),
    ptPreview: document.getElementById('ptPreview'),
    ptCalc: document.getElementById('ptCalc'),
    pendingList: document.getElementById('pendingList'),
    stampRewardPendingList: document.getElementById('stampRewardPendingList'),
    stampPendingList: document.getElementById('stampPendingList'),
    stampPhone: document.getElementById('stampPhone'),
    stampCustomerInfo: document.getElementById('stampCustomerInfo'),
    customersBody: document.getElementById('customersBody'),
    newName: document.getElementById('newName'),
    newPhone: document.getElementById('newPhone'),
    addCustomerError: document.getElementById('addCustomerError'),
    adminLeaderboard: document.getElementById('adminLeaderboard'),
    branchChart: document.getElementById('branchChart'),
    b1Total: document.getElementById('b1Total'),
    b2Total: document.getElementById('b2Total'),
    b3Total: document.getElementById('b3Total'),
    b4Total: document.getElementById('b4Total'),
    b1Sales: document.getElementById('b1Sales'),
    b2Sales: document.getElementById('b2Sales'),
    b3Sales: document.getElementById('b3Sales'),
    b4Sales: document.getElementById('b4Sales'),
    activityLog: document.getElementById('activityLog'),
    usersList: document.getElementById('usersList'),
    addUserCard: document.getElementById('addUserCard'),
    newUserName: document.getElementById('newUserName'),
    newUserPass: document.getElementById('newUserPass'),
    newUserRole: document.getElementById('newUserRole'),
    absentList: document.getElementById('absentList'),
  };

  // ===== TOAST =====
  function showToast(msg, type) {
    els.toast.textContent = msg;
    els.toast.className = (type || '') + ' show';
    setTimeout(function() { els.toast.classList.remove('show'); }, 3500);
  }

  // ===== SALAH POPUP =====
  var salahClosed = localStorage.getItem('adminSalahClosed');
  if (salahClosed === '1') {
    els.salahOverlay2.style.display = 'none';
  }
  document.getElementById('salahCloseBtn2').addEventListener('click', function() {
    localStorage.setItem('adminSalahClosed', '1');
    els.salahOverlay2.style.animation = 'fadeInOverlay 0.3s ease reverse';
    setTimeout(function() { els.salahOverlay2.remove(); }, 280);
  });

  // ===== LOGIN =====
  function populateUserSelect(users) {
    if (users !== undefined) cachedUsers = users;
    var select = els.userSelect;
    select.innerHTML = '<option value="">\u2014 اختار المستخدم \u2014</option>';
    var opt = document.createElement('option');
    opt.value = '__admin__';
    opt.textContent = '\uD83D\uDC51 الأدمن الرئيسي';
    select.appendChild(opt);

    var branchLabel = {
      cashier_alfmosken: 'الف مسكن',
      cashier_matriya: 'المطرية',
      cashier_shorouk: 'الشروق',
      callcenter: 'كول سنتر',
      super: 'سوبر أدمن'
    };
    cachedUsers.forEach(function(u, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = escapeHTML(u.name) + ' \u2014 ' + escapeHTML(branchLabel[u.role] || u.role);
      select.appendChild(o);
    });
  }

  async function adminLogin() {
    // Check brute force lockout
    if (bruteForce.isLocked()) {
      var mins = bruteForce.getRemainingMinutes();
      els.loginLockoutMinutes.textContent = String(mins);
      els.loginLockoutBanner.style.display = 'block';
      showToast('الحساب مقفول مؤقتاً. انتظر ' + mins + ' دقيقة.', 'error');
      return;
    }
    els.loginLockoutBanner.style.display = 'none';
    els.loginFieldError.style.display = 'none';

    var selectedVal = els.userSelect.value;
    var pass = els.passInput.value;

    if (!selectedVal) { showToast('اختار المستخدم الأول \u274C', 'error'); return; }
    if (!pass) { showToast('ادخل الباسورد \u274C', 'error'); return; }

    if (selectedVal === '__admin__') {
      // For main admin: password is NOT hardcoded here.
      // The admin must have set their password in the Google Apps Script backend.
      // We send the password to the server for verification.
      try {
        var verifyData = await api({ action: 'verifyMainAdmin', password: pass });
        if (!verifyData || !verifyData.success) {
          bruteForce.recordFail();
          els.loginFieldError.style.display = 'block';
          showToast('باسورد غلط \u274C', 'error');
          return;
        }
        bruteForce.recordSuccess();
        adminPassword = pass;
        mainAdminPassword = pass;  // تخزين باسورد الأدمن الرئيسي بشكل منفصل
        currentUser = 'الأدمن الرئيسي';
        currentUserObj = { name: 'الأدمن الرئيسي', role: 'super', perms: ['إضافة نقاط','تسجيل عملاء','موافقة خصومات','حذف','تصدير','إدارة المستخدمين','إحصائيات الفروع'] };
      } catch(e) {
        showToast('خطأ في الاتصال مع السيرفر \u274C', 'error');
        return;
      }
    } else {
      try {
        var fresh = await api({ action: 'getUsers' });
        var freshUsers = (fresh && fresh.success) ? fresh.users : [];
        populateUserSelect(freshUsers);
        var idx = parseInt(selectedVal, 10);
        var u = freshUsers[idx];
        if (!u) { showToast('المستخدم مش موجود \u274C', 'error'); return; }
        if (pass !== String(u.pass)) {
          bruteForce.recordFail();
          els.loginFieldError.style.display = 'block';
          showToast('باسورد غلط \u274C', 'error');
          return;
        }
        bruteForce.recordSuccess();
        adminPassword = pass;
        currentUser = u.name;
        currentUserObj = u;
      } catch(e) {
        showToast('خطأ في الاتصال \u274C', 'error');
        return;
      }
    }

    els.loginScreen.style.display = 'none';
    els.adminScreen.style.display = 'block';
    els.currentUserLabel.textContent = '\uD83D\uDC64 ' + escapeHTML(currentUser);
    logActivity('تسجيل دخول');
    applyPermissions();
    loadAll();
  }

  els.adminLoginBtn.addEventListener('click', adminLogin);
  els.passInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') adminLogin();
  });
  els.userSelect.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') els.passInput.focus();
  });

  // ===== PERMISSIONS =====
  function applyPermissions() {
    var isMainAdmin = currentUser === 'الأدمن الرئيسي';
    var perms = (currentUserObj && currentUserObj.perms) ? currentUserObj.perms : [];
    var hasUsers = isMainAdmin || perms.indexOf('إدارة المستخدمين') !== -1;
    var hasBranches = isMainAdmin || perms.indexOf('إحصائيات الفروع') !== -1;

    document.querySelectorAll('.tab').forEach(function(tab) {
      var onclick = tab.getAttribute('onclick') || '';
      var dt = tab.dataset.tab;
      if (dt === 'users' && !hasUsers) tab.style.display = 'none';
      else if (dt === 'branches' && !hasBranches) tab.style.display = 'none';
      else if (dt === 'users' && hasUsers) tab.style.display = '';
      else if (dt === 'branches' && hasBranches) tab.style.display = '';
    });

    document.querySelectorAll('.drawer-item[data-tab]').forEach(function(btn) {
      if (btn.dataset.tab === 'users' && !hasUsers) btn.style.display = 'none';
      if (btn.dataset.tab === 'branches' && !hasBranches) btn.style.display = 'none';
    });

    if (els.addUserCard) els.addUserCard.style.display = hasUsers ? '' : 'none';
  }

  // ===== LOGOUT =====
  function adminLogout() {
    logActivity('تسجيل خروج');
    // Clear sensitive data from memory
    adminPassword = '';
    mainAdminPassword = '';  // مسح باسورد الأدمن الرئيسي
    currentUser = '';
    currentUserObj = null;
    allCustomers = [];
    cachedUsers = [];
    els.adminScreen.style.display = 'none';
    els.loginScreen.style.display = 'flex';
    els.passInput.value = '';
    els.loginFieldError.style.display = 'none';
    els.loginLockoutBanner.style.display = 'none';
    els.currentUserLabel.textContent = '';
    populateUserSelect([]);
  }
  document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);
  document.getElementById('drawer-logout').addEventListener('click', adminLogout);

  // ===== CHANGE PASSWORD =====
  function openChangePassModal() {
    els.changePassUserLabel.textContent = '\uD83D\uDC64 ' + escapeHTML(currentUser);
    els.oldPassInput.value = '';
    els.newPassInput.value = '';
    els.confirmPassInput.value = '';
    els.changePassError.style.display = 'none';
    els.changePassModal.style.display = 'flex';
  }
  function closeChangePass() {
    els.changePassModal.style.display = 'none';
  }
  async function changePassword() {
    var oldPass = els.oldPassInput.value;
    var newPass = els.newPassInput.value;
    var confirm = els.confirmPassInput.value;
    els.changePassError.style.display = 'none';

    if (!oldPass || !newPass || !confirm) {
      els.changePassError.textContent = 'اكمل كل الحقول \u274C';
      els.changePassError.style.display = 'block';
      return;
    }
    if (newPass !== confirm) {
      els.changePassError.textContent = 'الباسورد الجديد مش متطابق \u274C';
      els.changePassError.style.display = 'block';
      return;
    }
    if (newPass.length < 4) {
      els.changePassError.textContent = 'الباسورد لازم ٤ أحرف على الأقل \u274C';
      els.changePassError.style.display = 'block';
      return;
    }

    if (currentUserObj && currentUserObj.role === 'super' && currentUser === 'الأدمن الرئيسي') {
      els.changePassError.textContent = 'باسورد الأدمن الرئيسي بيتغير من السيرفر مش من هنا \u1F512';
      els.changePassError.style.display = 'block';
      return;
    }

    var idx = cachedUsers.findIndex(function(u) { return u.name === currentUser; });
    if (idx === -1) {
      els.changePassError.textContent = 'مش لاقي المستخدم';
      els.changePassError.style.display = 'block';
      return;
    }
    if (cachedUsers[idx].pass !== oldPass) {
      els.changePassError.textContent = 'الباسورد الحالي غلط \u274C';
      els.changePassError.style.display = 'block';
      return;
    }

    try {
      var data = await api({ action: 'updateUserPass', password: mainAdminPassword || adminPassword, index: idx, newPass: newPass });
      if (!data || !data.success) {
        els.changePassError.textContent = (data && data.message) || 'فيه مشكلة';
        els.changePassError.style.display = 'block';
        return;
      }
      cachedUsers[idx].pass = newPass;
      currentUserObj = cachedUsers[idx];
      showToast('تم تغيير الباسورد بنجاح \u2705', 'success');
      logActivity('تغيير الباسورد');
      closeChangePass();
    } catch(e) {
      els.changePassError.textContent = 'خطأ في الاتصال';
      els.changePassError.style.display = 'block';
    }
  }
  document.getElementById('changePassOpenBtn').addEventListener('click', openChangePassModal);
  document.getElementById('changePassBtn').addEventListener('click', changePassword);
  document.getElementById('closeChangePassBtn').addEventListener('click', closeChangePass);

  // ===== DRAWER =====
  function openDrawer() {
    els.drawer.classList.add('open');
    els.drawerOverlay.classList.add('show');
  }
  function closeDrawer() {
    els.drawer.classList.remove('open');
    els.drawerOverlay.classList.remove('show');
  }
  document.getElementById('menuToggleBtn').addEventListener('click', openDrawer);
  els.drawerOverlay.addEventListener('click', closeDrawer);
  document.getElementById('drawer-contact').addEventListener('click', function() {
    var msg = 'مرحباً، أنا مهتم بتطوير تطبيق ولاء مشابه لشيخ البلد \u1F37D';
    window.open('https://wa.me/201022390517?text=' + encodeURIComponent(msg), '_blank');
    closeDrawer();
  });

  // ===== TAB SWITCHING =====
  function switchTab(name) {
    document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
    var target = document.getElementById('tab-' + name);
    if (target) target.classList.add('active');
    document.querySelectorAll('.drawer-item[data-tab]').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    document.querySelectorAll('.tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    closeDrawer();
    window.scrollTo(0, 0);
    if (name === 'pending') loadPending();
    if (name === 'stamps') { loadStampRequests(); loadStampRewardRequests(); }
    if (name === 'leaderboard') renderAdminLeaderboard();
    if (name === 'branches') loadBranchStats();
    if (name === 'activity') loadActivityLog();
    if (name === 'users') loadUsers();
    if (name === 'export') loadAbsentCustomers();
  }

  // Tab click handlers
  ['home','addPoints','pending','stamps','customers','addCustomer','leaderboard','branches','activity','users','export'].forEach(function(tabName) {
    var btn = document.getElementById('tab-' + tabName + '-btn');
    var drawerBtn = document.getElementById('drawer-' + tabName);
    if (btn) btn.addEventListener('click', function() { switchTab(tabName); });
    if (drawerBtn) drawerBtn.addEventListener('click', function() { switchTab(tabName); });
  });

  // ===== DARK MODE =====
  function toggleDarkAdmin() {
    document.body.classList.toggle('dark');
    var isDark = document.body.classList.contains('dark');
    els.darkBtnAdmin.textContent = isDark ? '\u2600' : '\u1F319';
    try { localStorage.setItem('darkModeAdmin', isDark); } catch(e) {}
  }
  els.darkBtnAdmin.addEventListener('click', toggleDarkAdmin);
  try {
    if (localStorage.getItem('darkModeAdmin') === 'true') {
      document.body.classList.add('dark');
      els.darkBtnAdmin.textContent = '\u2600';
    }
  } catch(e) {}

  // ===== STATS =====
  function renderStats() {
    var total = allCustomers.length;
    var pending = allCustomers.filter(function(c) { return c.pendingRedemption; }).length;
    var totalPts = allCustomers.reduce(function(s, c) { return s + (c.points || 0); }, 0);
    var ready = allCustomers.filter(function(c) { return c.points >= 100 && !c.pendingRedemption; }).length;

    els.statTotal.textContent = total;
    els.statPending.textContent = pending;
    els.statTotalPts.textContent = totalPts;
    els.statReady.textContent = ready;
    els.pendingCount.textContent = pending > 0 ? ('\u1F514 ' + pending + ' طلب معلق') : '';
  }

  // ===== CUSTOMERS TABLE (XSS-SAFE DOM RENDERING) =====
  function renderCustomers() {
    var tbody = els.customersBody;
    if (!allCustomers.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">مفيش عملاء لحد دلوقتي</td></tr>';
      return;
    }
    var sorted = allCustomers.slice().sort(function(a, b) { return (b.points || 0) - (a.points || 0); });

    var fragment = document.createDocumentFragment();
    sorted.forEach(function(c) {
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      var strong = document.createElement('strong');
      strong.textContent = c.name || '';
      tdName.appendChild(strong);

      var tdPhone = document.createElement('td');
      tdPhone.style.direction = 'ltr';
      tdPhone.textContent = c.phone || '';

      var tdPts = document.createElement('td');
      var ptsStrong = document.createElement('strong');
      ptsStrong.style.color = 'var(--red)';
      ptsStrong.textContent = String(c.points || 0);
      tdPts.appendChild(ptsStrong);

      var tdStatus = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'badge';
      if (c.pendingRedemption) {
        badge.className = 'badge badge-gold';
        badge.textContent = 'طلب معلق';
      } else if (c.points >= 100) {
        badge.className = 'badge badge-green';
        badge.textContent = 'جاهز للخصم';
      } else {
        badge.textContent = 'عادي';
      }
      tdStatus.appendChild(badge);

      var tdDelete = document.createElement('td');
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = '\u1F5D1 حذف';
      delBtn.addEventListener('click', function() { deleteCustomer(c.phone, c.name); });
      tdDelete.appendChild(delBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdPhone);
      tr.appendChild(tdPts);
      tr.appendChild(tdStatus);
      tr.appendChild(tdDelete);
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
  }

  // ===== PENDING LIST (XSS-SAFE DOM RENDERING) =====
  function renderPending(pending) {
    var list = els.pendingList;
    if (!pending || !pending.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">\u2705</div>مفيش طلبات معلقة</div>';
      return;
    }
    var fragment = document.createDocumentFragment();
    pending.forEach(function(p) {
      var item = document.createElement('div');
      item.className = 'pending-item';
      item.id = 'pend-' + sanitizePhone(p.phone);

      var info = document.createElement('div');
      info.className = 'pending-info';

      var nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = p.name || '';

      var phoneEl = document.createElement('div');
      phoneEl.className = 'phone';
      phoneEl.textContent = p.phone || '';

      var ptsEl = document.createElement('div');
      ptsEl.className = 'pts';
      ptsEl.textContent = '\u2B50 ' + String(p.points || 0) + ' نقطة \u2192 خصم 15%';

      info.appendChild(nameEl);
      info.appendChild(phoneEl);
      info.appendChild(ptsEl);

      var actions = document.createElement('div');
      actions.className = 'pending-actions';

      var approveBtn = document.createElement('button');
      approveBtn.className = 'btn btn-green btn-sm';
      approveBtn.textContent = '\u2713 وافق';
      approveBtn.addEventListener('click', function() { approveRedemption(p.phone, p.name); });

      var rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn btn-danger btn-sm';
      rejectBtn.textContent = '\u2717 ارفض';
      rejectBtn.addEventListener('click', function() { rejectRedemption(p.phone, p.name); });

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);

      item.appendChild(info);
      item.appendChild(actions);
      fragment.appendChild(item);
    });
    list.innerHTML = '';
    list.appendChild(fragment);
  }

  // ===== INPUT SANITIZATION LISTENERS =====
  [els.quickSearchPhone, els.ptPhone, els.stampPhone, els.newPhone].forEach(function(input) {
    if (!input) return;
    input.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 11);
    });
  });

  if (els.newName) {
    els.newName.addEventListener('input', function() {
      this.value = sanitizeName(this.value);
    });
  }

  if (els.ptAmount) {
    els.ptAmount.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 7);
      var amt = parseFloat(this.value) || 0;
      var pts = Math.floor(amt * 0.1);
      els.ptCalc.textContent = String(pts);
      els.ptPreview.style.display = amt > 0 ? 'block' : 'none';
    });
  }

  // ===== ADD POINTS =====
  async function addPoints() {
    var phone = sanitizePhone(els.ptPhone.value);
    var amount = parseFloat(els.ptAmount.value) || 0;

    if (!isValidEgyptianPhone(phone)) { showToast('ادخل رقم تليفون مصري صحيح', 'error'); return; }
    if (!amount || amount <= 0 || amount > 1000000) { showToast('ادخل مبلغ صحيح بين 1 و 1,000,000', 'error'); return; }

    var btn = document.querySelector('#tab-addPoints .btn-green');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      var data = await api({ action: 'addPoints', phone: phone, amount: amount, password: adminPassword });
      if (data && data.success) {
        showToast('\u2705 ' + (data.message || 'تم') + ' \u2014 الإجمالي: ' + (data.newTotal || ''), 'success');
        logActivity('إضافة نقاط للعميل: ' + phone + ' \u2014 مبلغ: ' + amount + ' ج');
        els.ptPhone.value = '';
        els.ptAmount.value = '';
        els.ptPreview.style.display = 'none';
        loadAll();
      } else {
        showToast((data && data.message) || 'خطأ', 'error');
      }
    } catch(e) {
      showToast('خطأ في الاتصال', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'إضافة النقاط \u2705';
    }
  }
  document.getElementById('addPointsBtn').addEventListener('click', addPoints);

  // ===== APPROVE/REJECT REDEMPTION =====
  async function approveRedemption(phone, name) {
    if (!confirm('تأكيد الموافقة على خصم 15% لـ ' + (name || '') + '؟')) return;
    try {
      var data = await api({ action: 'approveRedemption', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('\u2705 تمت الموافقة لـ ' + (name || ''), 'success');
        logActivity('موافقة خصم لـ: ' + (name || '') + ' \u2014 ' + phone);
        var el = document.getElementById('pend-' + sanitizePhone(phone));
        if (el) el.remove();
        loadAll();
      } else {
        showToast((data && data.message) || 'خطأ', 'error');
      }
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
  }

  async function rejectRedemption(phone, name) {
    if (!confirm('تأكيد رفض طلب ' + (name || '') + '؟')) return;
    try {
      var data = await api({ action: 'rejectRedemption', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('تم الرفض', 'error');
        logActivity('رفض طلب خصم لـ: ' + (name || '') + ' \u2014 ' + phone);
        var el = document.getElementById('pend-' + sanitizePhone(phone));
        if (el) el.remove();
        loadAll();
      } else {
        showToast((data && data.message) || 'خطأ', 'error');
      }
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
  }

  // ===== ADD CUSTOMER =====
  async function addCustomer() {
    var name = sanitizeName(els.newName.value);
    var phone = sanitizePhone(els.newPhone.value);
    els.addCustomerError.style.display = 'none';

    if (!name || name.length < 2) {
      els.addCustomerError.textContent = 'ادخل اسم صحيح (حرفين على الأقل)';
      els.addCustomerError.style.display = 'block';
      return;
    }
    if (!isValidEgyptianPhone(phone)) {
      els.addCustomerError.textContent = 'ادخل رقم مصري صحيح (11 رقم يبدأ بـ 01)';
      els.addCustomerError.style.display = 'block';
      return;
    }

    var btn = document.querySelector('#tab-addCustomer .btn');
    btn.disabled = true;
    try {
      var data = await api({ action: 'addCustomer', phone: phone, name: name, password: adminPassword });
      if (data && data.success) {
        showToast('\u1F389 ' + (data.message || 'تم'), 'success');
        logActivity('تسجيل عميل جديد: ' + name + ' \u2014 ' + phone);
        els.newName.value = '';
        els.newPhone.value = '';
        loadAll();
      } else {
        els.addCustomerError.textContent = (data && data.message) || 'فيه مشكلة';
        els.addCustomerError.style.display = 'block';
      }
    } catch(e) {
      els.addCustomerError.textContent = 'خطأ في الاتصال';
      els.addCustomerError.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  }
  document.getElementById('addCustomerBtn').addEventListener('click', addCustomer);

  // ===== DELETE CUSTOMER =====
  async function deleteCustomer(phone, name) {
    if (!confirm('هتحذف ' + (name || '') + ' نهائياً؟')) return;
    try {
      var data = await api({ action: 'deleteCustomer', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('تم حذف ' + (name || '') + ' \u2705', 'success');
        logActivity('حذف عميل: ' + (name || '') + ' \u2014 ' + phone);
        loadAll();
      } else {
        showToast((data && data.message) || 'خطأ', 'error');
      }
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
  }

  // ===== QUICK SEARCH =====
  async function quickSearch() {
    var phone = sanitizePhone(els.quickSearchPhone.value);
    if (!phone) return;
    if (!isValidEgyptianPhone(phone)) {
      els.quickResult.innerHTML = '<p style="color:#c0392b;font-size:14px;">رقم غير صحيح</p>';
      return;
    }
    els.quickResult.innerHTML = '<p style="color:#aaa;font-size:13px;">جاري البحث...</p>';
    try {
      var data = await api({ action: 'getCustomer', phone: phone });
      if (data && data.success && data.customer) {
        var c = data.customer;
        els.quickResult.innerHTML = '';
        var box = document.createElement('div');
        box.style.cssText = 'background:#f9f9f9;border-radius:12px;padding:16px;border:1px solid rgba(212,175,55,0.2);';
        box.innerHTML = '<div style="font-weight:900;font-size:16px;margin-bottom:8px;">\uD83D\uDC64 ' + escapeHTML(c.name || '') + '</div>' +
          '<div style="font-size:14px;color:#666;line-height:2;">' +
          '\uD83D\uDCF1 ' + escapeHTML(c.phone || '') + '<br>' +
          '\u2B50 <strong style="color:var(--red);">' + String(c.points || 0) + ' نقطة</strong><br>' +
          (c.pendingRedemption ? '\u23F3 <span style="color:#856404;">طلب معلق</span>' : c.points >= 100 ? '\u1F381 <span style="color:var(--green);">جاهز للخصم!</span>' : '') +
          '</div>';
        els.quickResult.appendChild(box);
      } else {
        els.quickResult.innerHTML = '<p style="color:#c0392b;font-size:14px;">العميل مش موجود</p>';
      }
    } catch(e) {
      els.quickResult.innerHTML = '<p style="color:#c0392b;font-size:14px;">خطأ في الاتصال</p>';
    }
  }
  document.getElementById('quickSearchBtn').addEventListener('click', quickSearch);

  // ===== ADMIN LEADERBOARD (XSS-SAFE DOM RENDERING) =====
  async function renderAdminLeaderboard() {
    try {
      var data = await api({ action: 'getAllCustomers', password: adminPassword });
      var div = els.adminLeaderboard;
      if (!data || !data.success || !data.customers || !data.customers.length) {
        div.innerHTML = '<div class="empty-state"><div class="icon">\u1F3C5</div>مفيش عملاء لحد دلوقتي</div>';
        return;
      }
      var sorted = data.customers.slice().sort(function(a, b) { return (b.points || 0) - (a.points || 0); }).slice(0, 10);

      var fragment = document.createDocumentFragment();
      sorted.forEach(function(c, i) {
        var medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : ('#' + (i + 1));
        var levelTxt = '', levelColor = '';
        if (c.points >= 500)      { levelTxt = 'بلاتيني \uD83D\uDC8E'; levelColor = '#3498DB'; }
        else if (c.points >= 200) { levelTxt = 'ذهبي \uD83E\uDD47';    levelColor = '#D4AF37'; }
        else if (c.points >= 100) { levelTxt = 'فضي \uD83E\uDD48';     levelColor = '#aaa'; }
        else                      { levelTxt = 'برونزي \uD83E\uDD49';  levelColor = '#CD853F'; }

        var item = document.createElement('div');
        item.className = 'pending-item';

        var medalEl = document.createElement('div');
        medalEl.style.cssText = 'font-size:24px;flex-shrink:0;';
        medalEl.textContent = medal;

        var info = document.createElement('div');
        info.className = 'pending-info';
        info.style.flex = '1';

        var nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = c.name || '';

        var phoneEl = document.createElement('div');
        phoneEl.className = 'phone';
        phoneEl.textContent = c.phone || '';

        var levelEl = document.createElement('div');
        levelEl.style.cssText = 'font-size:12px;color:' + levelColor + ';font-weight:700;';
        levelEl.textContent = levelTxt;

        info.appendChild(nameEl);
        info.appendChild(phoneEl);
        info.appendChild(levelEl);

        var ptsEl = document.createElement('div');
        ptsEl.style.cssText = 'font-weight:900;color:var(--red);font-size:18px;';
        ptsEl.textContent = String(c.points || 0);

        item.appendChild(medalEl);
        item.appendChild(info);
        item.appendChild(ptsEl);
        fragment.appendChild(item);
      });
      div.innerHTML = '';
      div.appendChild(fragment);
    } catch(e) {}
  }

  // ===== PENDING =====
  async function loadPending() {
    try {
      var pd = await api({ action: 'getPendingRedemptions', password: adminPassword });
      if (pd && pd.success) renderPending(pd.pending);
    } catch(e) {}
  }

  // ===== USERS =====
  async function loadUsers() {
    var div = els.usersList;
    div.innerHTML = '<div class="empty-state">جاري التحميل...</div>';
    try {
      var data = await api({ action: 'getUsers' });
      if (!data || !data.success || !data.users || !data.users.length) {
        div.innerHTML = '<div class="empty-state"><div class="icon">\u1F454</div>مفيش مستخدمين مضافين</div>';
        populateUserSelect([]);
        return;
      }
      var roleLabel = { cashier_alfmosken:'كاشير - الف مسكن', cashier_matriya:'كاشير - المطرية', cashier_shorouk:'كاشير - الشروق', callcenter:'\uD83D\uDCDE كول سنتر', super:'\uD83D\uDC51 سوبر أدمن' };

      var fragment = document.createDocumentFragment();
      data.users.forEach(function(u, i) {
        var item = document.createElement('div');
        item.className = 'user-item';

        var info = document.createElement('div');

        var nameEl = document.createElement('div');
        nameEl.style.fontWeight = '700';
        nameEl.textContent = u.name || '';

        var roleEl = document.createElement('div');
        roleEl.style.cssText = 'font-size:12px;color:#888;';
        roleEl.textContent = roleLabel[u.role] || u.role;

        var permsEl = document.createElement('div');
        permsEl.className = 'perm-check';
        permsEl.style.marginTop = '4px';
        if (u.perms && Array.isArray(u.perms)) {
          u.perms.forEach(function(p) {
            var tag = document.createElement('span');
            tag.className = 'perm-tag';
            tag.textContent = p;
            permsEl.appendChild(tag);
          });
        }

        info.appendChild(nameEl);
        info.appendChild(roleEl);
        info.appendChild(permsEl);

        var delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger btn-sm';
        delBtn.textContent = 'حذف';
        delBtn.addEventListener('click', function() { deleteUser(i, u.name); });

        item.appendChild(info);
        item.appendChild(delBtn);
        fragment.appendChild(item);
      });
      div.innerHTML = '';
      div.appendChild(fragment);
      populateUserSelect(data.users);
    } catch(e) {
      div.innerHTML = '<div class="empty-state">خطأ في التحميل</div>';
    }
  }

  async function addUser() {
    var name = sanitizeName(els.newUserName.value);
    var pass = els.newUserPass.value.trim();
    var role = els.newUserRole.value;

    if (!name || !pass) { showToast('ادخل الاسم والباسورد', 'error'); return; }
    if (pass.length < 4) { showToast('الباسورد لازم ٤ أحرف على الأقل', 'error'); return; }

    var perms = [];
    if (document.getElementById('perm_addPoints').checked)   perms.push('إضافة نقاط');
    if (document.getElementById('perm_addCustomer').checked) perms.push('تسجيل عملاء');
    if (document.getElementById('perm_approve').checked)     perms.push('موافقة خصومات');
    if (document.getElementById('perm_delete').checked)      perms.push('حذف');
    if (document.getElementById('perm_export').checked)      perms.push('تصدير');
    if (document.getElementById('perm_users').checked)       perms.push('إدارة المستخدمين');
    if (document.getElementById('perm_branches').checked)    perms.push('إحصائيات الفروع');

    try {
      var data = await api({ action: 'addUser', password: mainAdminPassword || adminPassword, name: name, pass: pass, role: role, perms: perms.join(',') });
      if (data && data.success) {
        els.newUserName.value = '';
        els.newUserPass.value = '';
        showToast('تم إضافة ' + name + ' \u2705', 'success');
        logActivity('إضافة مستخدم: ' + name);
        loadUsers();
      } else {
        showToast((data && data.message) || 'فيه مشكلة', 'error');
      }
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
  }
  document.getElementById('addUserBtn').addEventListener('click', addUser);

  async function deleteUser(i, name) {
    if (!confirm('هتحذف ' + (name || '') + '؟')) return;
    try {
      var data = await api({ action: 'deleteUser', password: mainAdminPassword || adminPassword, index: i });
      if (data && data.success) {
        showToast('تم الحذف', 'error');
        logActivity('حذف مستخدم: ' + (name || ''));
        loadUsers();
      } else {
        showToast((data && data.message) || 'فيه مشكلة', 'error');
      }
    } catch(e) { showToast('خطأ في الاتصال', 'error'); }
  }

  // ===== ACTIVITY LOG =====
  function logActivity(action) {
    var log = [];
    try {
      log = JSON.parse(localStorage.getItem('sheikh_activity') || '[]');
    } catch(e) { log = []; }
    log.unshift({ action: action, time: new Date().toLocaleString('ar-EG'), user: currentUser || 'غير معروف' });
    if (log.length > 100) log.pop();
    try { localStorage.setItem('sheikh_activity', JSON.stringify(log)); } catch(e) {}
  }

  function loadActivityLog() {
    var log = [];
    try { log = JSON.parse(localStorage.getItem('sheikh_activity') || '[]'); } catch(e) { log = []; }
    var div = els.activityLog;
    if (!log.length) {
      div.innerHTML = '<div class="empty-state"><div class="icon">\u1F4CB</div>مفيش نشاط لحد دلوقتي</div>';
      return;
    }
    var fragment = document.createDocumentFragment();
    log.slice(0, 50).forEach(function(l) {
      var item = document.createElement('div');
      item.className = 'log-item';

      var content = document.createElement('div');
      content.style.flex = '1';

      var userEl = document.createElement('span');
      userEl.className = 'log-user';
      userEl.textContent = l.user || '';

      var actionEl = document.createElement('span');
      actionEl.style.color = '#555';
      actionEl.textContent = ' \u2014 ' + (l.action || '');

      content.appendChild(userEl);
      content.appendChild(actionEl);

      var timeEl = document.createElement('div');
      timeEl.className = 'log-time';
      timeEl.textContent = l.time || '';

      item.appendChild(content);
      item.appendChild(timeEl);
      fragment.appendChild(item);
    });
    div.innerHTML = '';
    div.appendChild(fragment);
  }

  // ===== BRANCHES =====
  function loadBranchStats() {
    if (!allCustomers.length) return;
    var branches = {
      alfmosken:  { name: 'الف مسكن',  customers: 0, sales: 0, pts: 0 },
      matriya:    { name: 'المطرية',   customers: 0, sales: 0, pts: 0 },
      shorouk:    { name: 'الشروق',    customers: 0, sales: 0, pts: 0 },
      callcenter: { name: 'كول سنتر', customers: 0, sales: 0, pts: 0 }
    };

    allCustomers.forEach(function(c) {
      var b = c.branch || 'alfmosken';
      if (branches[b]) {
        branches[b].customers++;
        branches[b].sales += c.totalSpent || 0;
        branches[b].pts   += c.points || 0;
      }
    });

    els.b1Total.textContent = branches.alfmosken.customers;
    els.b2Total.textContent = branches.matriya.customers;
    els.b3Total.textContent = branches.shorouk.customers;
    els.b4Total.textContent = branches.callcenter.customers;
    els.b1Sales.textContent = branches.alfmosken.sales + ' ج';
    els.b2Sales.textContent = branches.matriya.sales + ' ج';
    els.b3Sales.textContent = branches.shorouk.sales + ' ج';
    els.b4Sales.textContent = branches.callcenter.sales + ' ج';

    var maxPts = Math.max.apply(null, Object.values(branches).map(function(b) { return b.pts; }).concat([1]));
    els.branchChart.innerHTML = Object.values(branches).map(function(b) {
      return '<div class="chart-bar-item">' +
        '<div class="chart-bar-val">' + b.pts + '</div>' +
        '<div class="chart-bar" style="height:' + Math.max((b.pts/maxPts)*100, 4) + '%"></div>' +
        '<div class="chart-bar-lbl">' + escapeHTML(b.name) + '</div>' +
      '</div>';
    }).join('');
  }

  // ===== EXPORT =====
  function exportCSV() {
    if (!allCustomers.length) { showToast('مفيش بيانات', 'error'); return; }
    var rows = [['الاسم','التليفون','النقاط','إجمالي الإنفاق','الحالة']];
    allCustomers.forEach(function(c) {
      rows.push([c.name || '', c.phone || '', c.points || 0, c.totalSpent || 0, c.pendingRedemption ? 'طلب معلق' : 'عادي']);
    });
    var csv = rows.map(function(r) { return r.join(','); }).join('\n');
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sheikh_customers_' + new Date().toLocaleDateString('ar-EG').replace(/\//g, '-') + '.csv';
    a.click();
    logActivity('تصدير بيانات العملاء CSV');
    showToast('تم التصدير \u2705', 'success');
  }

  function exportReport() {
    if (!allCustomers.length) { showToast('مفيش بيانات', 'error'); return; }
    var total = allCustomers.length;
    var totalPts = allCustomers.reduce(function(s, c) { return s + (c.points || 0); }, 0);
    var totalSales = allCustomers.reduce(function(s, c) { return s + (c.totalSpent || 0); }, 0);
    var ready = allCustomers.filter(function(c) { return c.points >= 100; }).length;
    var report = 'تقرير شيخ البلد\n' + new Date().toLocaleDateString('ar-EG') + '\n\nإجمالي العملاء: ' + total + '\nإجمالي النقاط: ' + totalPts + '\nإجمالي المبيعات: ' + totalSales + ' جنيه\nجاهزين للخصم: ' + ready;
    var blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sheikh_report.txt';
    a.click();
    showToast('تم تصدير التقرير \u2705', 'success');
  }
  document.getElementById('exportCSVBtn').addEventListener('click', exportCSV);
  document.getElementById('exportReportBtn').addEventListener('click', exportReport);

  function loadAbsentCustomers() {
    var div = els.absentList;
    if (!allCustomers.length) {
      div.innerHTML = '<div class="empty-state">جاري تحميل البيانات...</div>';
      return;
    }
    var fragment = document.createDocumentFragment();
    allCustomers.slice(0, 5).forEach(function(c) {
      var item = document.createElement('div');
      item.style.cssText = 'padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;';
      var nameStrong = document.createElement('strong');
      nameStrong.textContent = c.name || '';
      item.appendChild(nameStrong);
      item.appendChild(document.createTextNode(' \u2014 ' + (c.phone || '')));
      var sub = document.createElement('div');
      sub.style.cssText = 'color:#aaa;font-size:11px;';
      sub.textContent = 'آخر نشاط غير محدد';
      item.appendChild(sub);
      fragment.appendChild(item);
    });
    div.innerHTML = '';
    if (!fragment.childNodes.length) {
      div.innerHTML = '<div class="empty-state">مفيش عملاء غايبين</div>';
      return;
    }
    div.appendChild(fragment);
  }

  // ===== LOAD ALL =====
  async function loadAll() {
    try {
      var data = await api({ action: 'getAllCustomers', password: adminPassword });
      if (data && data.success) {
        allCustomers = data.customers || [];
        renderStats();
        renderCustomers();
        loadBranchStats();
      }
      var pd = await api({ action: 'getPendingRedemptions', password: adminPassword });
      if (pd && pd.success) renderPending(pd.pending);
    } catch(e) {
      showToast('خطأ في تحميل البيانات', 'error');
    }
  }

  // ===== STAMPS (XSS-SAFE) =====
  async function loadStampRequests() {
    try {
      var data = await api({ action: 'getPendingStamps', password: adminPassword });
      var div = els.stampPendingList;
      if (!data || !data.success || !data.stamps || !data.stamps.length) {
        div.innerHTML = '<div class="empty-state"><div class="icon">\u2705</div>مفيش طلبات أختام دلوقتي</div>';
        return;
      }
      var fragment = document.createDocumentFragment();
      data.stamps.forEach(function(s) {
        var item = document.createElement('div');
        item.className = 'pending-item';

        var info = document.createElement('div');
        info.className = 'pending-info';

        var nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = s.name || '';

        var phoneEl = document.createElement('div');
        phoneEl.className = 'phone';
        phoneEl.textContent = s.phone || '';

        var ptsEl = document.createElement('div');
        ptsEl.className = 'pts';
        ptsEl.textContent = 'عنده ' + String(s.stamps || 0) + ' أختام';

        info.appendChild(nameEl);
        info.appendChild(phoneEl);
        info.appendChild(ptsEl);

        var actions = document.createElement('div');
        actions.className = 'pending-actions';

        var apprBtn = document.createElement('button');
        apprBtn.className = 'btn btn-green btn-sm';
        apprBtn.textContent = '\u2705 موافقة';
        apprBtn.addEventListener('click', function() { approveStamp(s.phone, s.name); });

        var rejBtn = document.createElement('button');
        rejBtn.className = 'btn btn-danger btn-sm';
        rejBtn.textContent = '\u2715 رفض';
        rejBtn.addEventListener('click', function() { rejectStamp(s.phone); });

        actions.appendChild(apprBtn);
        actions.appendChild(rejBtn);

        item.appendChild(info);
        item.appendChild(actions);
        fragment.appendChild(item);
      });
      div.innerHTML = '';
      div.appendChild(fragment);
    } catch(e) {
      els.stampPendingList.innerHTML = '<div class="empty-state">خطأ في التحميل</div>';
    }
  }

  async function approveStamp(phone, name) {
    try {
      var data = await api({ action: 'approveStamp', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('تم إضافة ختم لـ ' + (name || '') + ' \u2705', 'success');
        if (data.completed) showToast('\u1F389 ' + (name || '') + ' أكمل 10 أختام! صينية هدية', 'success');
        loadStampRequests();
      } else {
        showToast((data && data.message) || 'فيه مشكلة', 'error');
      }
    } catch(e) { showToast('مشكلة في الاتصال', 'error'); }
  }

  async function rejectStamp(phone) {
    try {
      var data = await api({ action: 'rejectStamp', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('تم رفض طلب الختم', 'error');
        loadStampRequests();
      }
    } catch(e) { showToast('مشكلة في الاتصال', 'error'); }
  }

  async function loadStampRewardRequests() {
    try {
      var data = await api({ action:'getPendingStampRewards', password: adminPassword });
      var div = els.stampRewardPendingList;
      if (!data || !data.success || !data.rewards || !data.rewards.length) {
        div.innerHTML = '<div class="empty-state"><div class="icon">\u2705</div>مفيش طلبات مكافآت دلوقتي</div>';
        return;
      }
      var fragment = document.createDocumentFragment();
      data.rewards.forEach(function(r) {
        var item = document.createElement('div');
        item.className = 'pending-item';

        var info = document.createElement('div');
        info.className = 'pending-info';

        var nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = r.name || '';

        var phoneEl = document.createElement('div');
        phoneEl.className = 'phone';
        phoneEl.textContent = r.phone || '';

        var ptsEl = document.createElement('div');
        ptsEl.className = 'pts';
        ptsEl.textContent = '\u1F37D اكمل 10 أختام \u2014 صينية هدية';

        info.appendChild(nameEl);
        info.appendChild(phoneEl);
        info.appendChild(ptsEl);

        var actions = document.createElement('div');
        actions.className = 'pending-actions';

        var apprBtn = document.createElement('button');
        apprBtn.className = 'btn btn-green btn-sm';
        apprBtn.textContent = '\u2705 موافقة';
        apprBtn.addEventListener('click', function() { approveStampReward(r.phone, r.name); });

        var rejBtn = document.createElement('button');
        rejBtn.className = 'btn btn-danger btn-sm';
        rejBtn.textContent = '\u2715 رفض';
        rejBtn.addEventListener('click', function() { rejectStampReward(r.phone); });

        actions.appendChild(apprBtn);
        actions.appendChild(rejBtn);

        item.appendChild(info);
        item.appendChild(actions);
        fragment.appendChild(item);
      });
      div.innerHTML = '';
      div.appendChild(fragment);
    } catch(e) {
      els.stampRewardPendingList.innerHTML = '<div class="empty-state">خطأ في التحميل</div>';
    }
  }

  async function approveStampReward(phone, name) {
    if (!confirm('تأكيد الموافقة على مكافأة ' + (name || '') + ' (صينية هدية)؟')) return;
    try {
      var data = await api({ action: 'approveStampReward', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('\u1F389 تمت الموافقة على مكافأة ' + (name || ''), 'success');
        logActivity('موافقة مكافأة أختام لـ: ' + (name || '') + ' \u2014 ' + phone);
        loadStampRewardRequests();
      } else {
        showToast((data && data.message) || 'فيه مشكلة', 'error');
      }
    } catch(e) { showToast('مشكلة في الاتصال', 'error'); }
  }

  async function rejectStampReward(phone) {
    try {
      var data = await api({ action: 'rejectStampReward', phone: sanitizePhone(phone), password: adminPassword });
      if (data && data.success) {
        showToast('تم رفض طلب المكافأة', 'error');
        loadStampRewardRequests();
      }
    } catch(e) { showToast('مشكلة في الاتصال', 'error'); }
  }

  async function addStampManual() {
    var phone = sanitizePhone(els.stampPhone.value);
    if (!isValidEgyptianPhone(phone)) { showToast('ادخل رقم تليفون مصري صحيح', 'error'); return; }
    try {
      var data = await api({ action: 'addStamp', phone: phone, password: adminPassword });
      if (data && data.success) {
        showToast('\u2705 تم إضافة ختم \u2014 عنده دلوقتي ' + String(data.stamps || 0) + ' أختام', 'success');
        if (data.completed) showToast('\u1F389 اكتملت البطاقة! صينية هدية', 'success');
        els.stampPhone.value = '';
        els.stampCustomerInfo.style.display = 'none';
      } else {
        showToast((data && data.message) || 'مشكلة', 'error');
      }
    } catch(e) { showToast('مشكلة في الاتصال', 'error'); }
  }
  document.getElementById('addStampManualBtn').addEventListener('click', addStampManual);

  // ===== INIT: Load users for login dropdown =====
  api({ action: 'getUsers' })
    .then(function(d) { populateUserSelect((d && d.success) ? d.users : []); })
    .catch(function() { populateUserSelect([]); });

  // ===== SECURITY: Console warning =====
  console.log('%c\u26A0 Attention', 'color:#c0392b;font-size:20px;font-weight:bold;');
  console.log('%cThis is a browser feature intended for developers. Do not paste any code here.', 'color:#666;font-size:12px;');

})();
