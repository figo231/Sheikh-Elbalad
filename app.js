  // ===== SECURITY MODULE =====
  (function() {
    'use strict';

    // 1. Enforce HTTPS (except localhost)
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      window.location.href = window.location.href.replace(/^http:/, 'https:');
      return;
    }

    // 2. API URL hidden inside closure - not exposed globally
    const SCRIPT_URL = atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J4Z1U0alphR0RkaGpNR3k2LTgwR2pyelYwbUh2SU84a2d6X2pkalJuYVBPR2VlQVZGY1B6MzdqVlFRTk1KWTlZZmkvZXhlYw==');
    // Base64 decoded: https://script.google.com/macros/s/AKfycbxgU4jZaGDdhjMGy6-80GjrzV0mHvIO8kgz_jdjRnaPOGeeAVFcPz37jVQQNMJY9Yfi/exec

    // 3. Escape HTML to prevent XSS
    function escapeHTML(str) {
      if (typeof str !== 'string') return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // 4. Sanitize phone number
    function sanitizePhone(phone) {
      return String(phone).replace(/\D/g, '').slice(0, 11);
    }

    // 5. Validate Egyptian phone
    function isValidEgyptianPhone(phone) {
      return /^01[0-2,5]{1}[0-9]{8}$/.test(phone);
    }

    // 6. Rate limiter
    const rateLimiter = {
      timestamps: [],
      maxRequests: 10,
      windowMs: 60000, // 1 minute
      canProceed() {
        const now = Date.now();
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
        if (this.timestamps.length >= this.maxRequests) return false;
        this.timestamps.push(now);
        return true;
      }
    };

    // 7. Brute force protection for login
    const bruteForce = {
      attempts: parseInt(sessionStorage.getItem('bf_attempts') || '0', 10),
      lockoutEnd: parseInt(sessionStorage.getItem('bf_lockout') || '0', 10),
      maxAttempts: 5,
      lockoutMinutes: 15,
      isLocked() {
        const now = Date.now();
        if (now < this.lockoutEnd) return true;
        if (this.lockoutEnd > 0 && now >= this.lockoutEnd) {
          // Lockout expired, reset
          this.attempts = 0;
          this.lockoutEnd = 0;
          sessionStorage.removeItem('bf_attempts');
          sessionStorage.removeItem('bf_lockout');
        }
        return false;
      },
      recordFail() {
        this.attempts++;
        sessionStorage.setItem('bf_attempts', String(this.attempts));
        if (this.attempts >= this.maxAttempts) {
          this.lockoutEnd = Date.now() + (this.lockoutMinutes * 60000);
          sessionStorage.setItem('bf_lockout', String(this.lockoutEnd));
        }
      },
      recordSuccess() {
        this.attempts = 0;
        this.lockoutEnd = 0;
        sessionStorage.removeItem('bf_attempts');
        sessionStorage.removeItem('bf_lockout');
      },
      getRemainingMinutes() {
        return Math.ceil((this.lockoutEnd - Date.now()) / 60000);
      }
    };

    // 8. Secure API call wrapper
    async function api(params) {
      if (!rateLimiter.canProceed()) {
        throw new Error('Rate limit exceeded. Please wait a minute.');
      }
      try {
        const url = new URL(SCRIPT_URL);
        Object.entries(params).forEach(([k, v]) => {
          if (typeof v === 'string') {
            url.searchParams.set(k, v);
          } else {
            url.searchParams.set(k, String(v));
          }
        });
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        const res = await fetch(url.toString(), { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) {
        if (e.name === 'AbortError') throw new Error('Request timed out');
        throw e;
      }
    }

    // ===== STATE =====
    let currentPhone = '';
    let rewardPollInterval = null;
    const STAMPS_REQUIRED_CLIENT = 10;

    // ===== DOM REFERENCES =====
    const els = {
      phoneInput: document.getElementById('phoneInput'),
      phoneError: document.getElementById('phoneError'),
      lookupBtn: document.getElementById('lookupBtn'),
      loginBtnText: document.getElementById('loginBtnText'),
      loginCard: document.getElementById('loginCard'),
      dashboard: document.getElementById('dashboard'),
      menuBtn: document.getElementById('menuBtn'),
      custName: document.getElementById('custName'),
      custPoints: document.getElementById('custPoints'),
      levelBadge: document.getElementById('levelBadge'),
      lastVisitTxt: document.getElementById('lastVisitTxt'),
      progressBar: document.getElementById('progressBar'),
      progressText: document.getElementById('progressText'),
      rewardReady: document.getElementById('rewardReady'),
      redeemBtn: document.getElementById('redeemBtn'),
      pendingBadge: document.getElementById('pendingBadge'),
      warning80: document.getElementById('warning80'),
      warning80pts: document.getElementById('warning80pts'),
      stampsGrid: document.getElementById('stampsGrid'),
      stampCount: document.getElementById('stampCount'),
      stampRequestBtn: document.getElementById('stampRequestBtn'),
      stampRewardReady: document.getElementById('stampRewardReady'),
      stampPending: document.getElementById('stampPending'),
      claimRewardBtn: document.getElementById('claimRewardBtn'),
      rewardClaimPending: document.getElementById('rewardClaimPending'),
      drawerCompletedBtn: document.getElementById('drawerCompletedBtn'),
      txList: document.getElementById('txList'),
      leaderboardList: document.getElementById('leaderboardList'),
      shareCard: document.getElementById('shareCard'),
      completedStampsGrid: document.getElementById('completedStampsGrid'),
      toast: document.getElementById('toast'),
      confettiContainer: document.getElementById('confettiContainer'),
      darkBtn: document.getElementById('darkBtn'),
      salahOverlay: document.getElementById('salahOverlay'),
      drawer: document.getElementById('drawer'),
      drawerOverlay: document.getElementById('drawerOverlay'),
      installBanner: document.getElementById('installBanner'),
      lockoutMsg: document.getElementById('lockoutMsg'),
      lockoutTimer: document.getElementById('lockoutTimer'),
    };

    // ===== SALAH POPUP =====
    const salahClosed = localStorage.getItem('salahClosed');
    if (salahClosed === '1') {
      els.salahOverlay.style.display = 'none';
    }
    document.getElementById('salahCloseBtn').addEventListener('click', function() {
      localStorage.setItem('salahClosed', '1');
      els.salahOverlay.style.animation = 'fadeInOv 0.3s ease reverse';
      setTimeout(function() { els.salahOverlay.remove(); }, 280);
    });

    // ===== TOAST =====
    function showToast(msg, type) {
      els.toast.textContent = msg;
      els.toast.className = (type || '') + ' show';
      setTimeout(function() { els.toast.classList.remove('show'); }, 3000);
    }

    // ===== LOGIN / LOOKUP =====
    function setLoading(isLoading) {
      els.lookupBtn.disabled = isLoading;
      els.loginBtnText.innerHTML = isLoading ? 'جاري البحث <span class="spinner"></span>' : 'عرض نقاطي';
    }

    async function lookupCustomer() {
      // Check brute force lockout
      if (bruteForce.isLocked()) {
        const mins = bruteForce.getRemainingMinutes();
        els.lockoutTimer.textContent = mins;
        els.lockoutMsg.style.display = 'block';
        showToast('الحساب مقفول مؤقتاً. انتظر ' + mins + ' دقيقة.', 'error');
        return;
      }
      els.lockoutMsg.style.display = 'none';

      const rawPhone = els.phoneInput.value;
      const phone = sanitizePhone(rawPhone);
      els.phoneInput.value = phone;

      if (!isValidEgyptianPhone(phone)) {
        els.phoneInput.classList.add('error');
        els.phoneError.style.display = 'block';
        showToast('ادخل رقم مصري صحيح (11 رقم يبدأ بـ 01)', 'error');
        bruteForce.recordFail();
        return;
      }
      els.phoneInput.classList.remove('error');
      els.phoneError.style.display = 'none';

      setLoading(true);
      try {
        const data = await api({ action:'getCustomer', phone: phone });
        if (data.success && data.customer) {
          bruteForce.recordSuccess();
          currentPhone = phone;
          renderDashboard(data.customer);
          loadTransactions(phone);
        } else {
          bruteForce.recordFail();
          showToast('الرقم ده مش مسجل عندنا، تكلم الكاشير', 'error');
        }
      } catch (e) {
        showToast('في مشكلة في الاتصال، حاول تاني', 'error');
      } finally {
        setLoading(false);
      }
    }

    els.lookupBtn.addEventListener('click', lookupCustomer);
    els.phoneInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') lookupCustomer();
    });
    els.phoneInput.addEventListener('input', function() {
      // Auto-sanitize: digits only
      this.value = this.value.replace(/\D/g, '').slice(0, 11);
      if (this.classList.contains('error')) {
        this.classList.remove('error');
        els.phoneError.style.display = 'none';
      }
    });

    // ===== RENDER DASHBOARD (XSS-SAFE) =====
    function renderDashboard(c) {
      if (!c || typeof c !== 'object') return;
      els.loginCard.classList.add('hidden');
      els.dashboard.classList.remove('hidden');
      els.menuBtn.classList.remove('hidden');

      // Use textContent for user data - XSS safe
      els.custName.textContent = 'أهلاً ' + String(c.name || '').trim() + ' \uD83D\uDC4B';
      els.custPoints.textContent = String(c.points || '0');

      const threshold = c.threshold || 100;
      const pts = Math.min(parseInt(c.points || 0, 10), 999999);
      const pct = Math.min((pts / threshold) * 100, 100);
      els.progressBar.style.width = pct + '%';
      els.progressText.textContent = pts + ' / ' + threshold;

      const remaining = Math.max(threshold - pts, 0);
      renderLevel(pts);

      // Last visit
      const lastVisitKey = 'lastVisit_' + String(c.phone || '').replace(/\D/g, '');
      const now = new Date();
      try {
        const lastVisit = localStorage.getItem(lastVisitKey);
        if (lastVisit) {
          const diff = Math.floor((now - new Date(lastVisit)) / (1000*60*60*24));
          let txt;
          if (diff === 0) txt = 'آخر زيارة: النهارده';
          else if (diff === 1) txt = 'آخر زيارة: إمبارح';
          else txt = 'آخر زيارة: منذ ' + diff + ' يوم';
          els.lastVisitTxt.textContent = txt;
        }
        localStorage.setItem(lastVisitKey, now.toISOString());
      } catch(e) { /* localStorage blocked */ }

      els.rewardReady.classList.toggle('hidden', pts < threshold || !!c.pendingRedemption);
      els.pendingBadge.classList.toggle('hidden', !c.pendingRedemption);

      if (pts >= threshold && !c.pendingRedemption) launchConfetti();

      loadLeaderboard();
      renderStamps(
        c.stamps || 0,
        c.pendingStamp || false,
        c.stampRewardCompleted || false,
        c.pendingStampReward || false
      );

      els.shareCard.style.display = 'block';
      if (pts >= threshold * 0.8 && pts < threshold) {
        els.warning80.classList.remove('hidden');
        els.warning80pts.textContent = String(remaining);
      } else {
        els.warning80.classList.add('hidden');
      }
    }

    function renderLevel(points) {
      let level, cls;
      if (points >= 500)      { level = 'بلاتيني \uD83D\uDC8E'; cls = 'level-plat'; }
      else if (points >= 200) { level = 'ذهبي \uD83E\uDD47'; cls = 'level-gold'; }
      else if (points >= 100) { level = 'فضي \uD83E\uDD48'; cls = 'level-silver'; }
      else                    { level = 'برونزي \uD83E\uDD49'; cls = 'level-bronze'; }
      els.levelBadge.innerHTML = '<span class="level-badge ' + cls + '">' + escapeHTML(level) + '</span>';
    }

    // ===== STAMPS (XSS-SAFE) =====
    function renderStamps(stamps, pendingStamp, rewardCompleted, pendingStampReward) {
      const count = Math.min(Math.max(parseInt(stamps || 0, 10), 0), 999);
      els.stampCount.textContent = String(count);
      els.stampsGrid.innerHTML = '';

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = 'stamp' + (i < count ? ' filled' : '');
        div.textContent = i < count ? '\uD83C\uDF7D' : '';
        fragment.appendChild(div);
      }
      els.stampsGrid.appendChild(fragment);

      els.stampRewardReady.style.display = 'none';
      els.stampPending.style.display = 'none';
      els.claimRewardBtn.style.display = 'none';
      els.rewardClaimPending.style.display = 'none';
      els.stampRequestBtn.style.display = 'none';

      if (rewardCompleted) {
        els.drawerCompletedBtn.classList.remove('hidden');
        renderCompletedCard();
        return;
      }

      els.drawerCompletedBtn.classList.add('hidden');

      if (count >= 10) {
        if (pendingStampReward) {
          els.stampRewardReady.style.display = 'block';
          els.rewardClaimPending.style.display = 'block';
          startRewardPolling();
        } else {
          els.stampRewardReady.style.display = 'block';
          els.claimRewardBtn.style.display = 'block';
          els.claimRewardBtn.disabled = false;
          els.claimRewardBtn.textContent = '\uD83C\uDFC6 المطالبة بالمكافأة';
          stopRewardPolling();
        }
      } else if (pendingStamp) {
        els.stampPending.style.display = 'block';
        els.stampRequestBtn.disabled = true;
        els.stampRequestBtn.textContent = '\u23F3 في انتظار الموافقة';
        els.stampRequestBtn.style.display = 'block';
        stopRewardPolling();
      } else {
        els.stampRequestBtn.style.display = 'block';
        els.stampRequestBtn.disabled = false;
        els.stampRequestBtn.textContent = '\u1FA84 طلب ختم جديد';
        stopRewardPolling();
      }
    }

    function renderCompletedCard() {
      els.completedStampsGrid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.className = 'stamp filled';
        div.textContent = '\uD83C\uDF7D';
        fragment.appendChild(div);
      }
      els.completedStampsGrid.appendChild(fragment);
    }

    // ===== STAMP ACTIONS =====
    async function requestStamp() {
      const btn = els.stampRequestBtn;
      btn.disabled = true;
      btn.textContent = 'جاري الإرسال...';
      try {
        const data = await api({ action:'requestStamp', phone: currentPhone });
        if (data.success) {
          showToast('تم إرسال طلب الختم للأدمن \u2705', 'success');
          els.stampPending.style.display = 'block';
          btn.textContent = '\u23F3 في انتظار الموافقة';
        } else {
          showToast(data.message || 'مشكلة في الإرسال', 'error');
          btn.disabled = false;
          btn.textContent = '\u1FA84 طلب ختم جديد';
        }
      } catch (e) {
        showToast('مشكلة في الاتصال', 'error');
        btn.disabled = false;
        btn.textContent = '\u1FA84 طلب ختم جديد';
      }
    }
    els.stampRequestBtn.addEventListener('click', requestStamp);

    async function requestStampReward() {
      const btn = els.claimRewardBtn;
      btn.disabled = true;
      btn.textContent = 'جاري الإرسال...';
      try {
        const data = await api({ action:'requestStampReward', phone: currentPhone });
        if (data.success) {
          showToast('تم إرسال طلب المكافأة للأدمن \u2705', 'success');
          els.rewardClaimPending.style.display = 'block';
          btn.style.display = 'none';
        } else {
          showToast(data.message || 'مشكلة في الإرسال', 'error');
          btn.disabled = false;
          btn.textContent = '\uD83C\uDFC6 المطالبة بالمكافأة';
        }
      } catch (e) {
        showToast('مشكلة في الاتصال', 'error');
        btn.disabled = false;
        btn.textContent = '\uD83C\uDFC6 المطالبة بالمكافأة';
      }
    }
    els.claimRewardBtn.addEventListener('click', requestStampReward);

    // ===== AUTO-REFRESH POLLING =====
    function startRewardPolling() {
      if (rewardPollInterval) return;
      rewardPollInterval = setInterval(async function() {
        if (!currentPhone) { stopRewardPolling(); return; }
        try {
          const data = await api({ action:'getCustomer', phone: currentPhone });
          if (data.success && data.customer) {
            const c = data.customer;
            if (!c.pendingStampReward && (c.stamps || 0) < STAMPS_REQUIRED_CLIENT) {
              stopRewardPolling();
              renderStamps(c.stamps || 0, c.pendingStamp || false, c.stampRewardCompleted || false, c.pendingStampReward || false);
              showToast('\uD83C\uDF89 تمت الموافقة على المكافأة! البطاقة بدأت من جديد', 'success');
              launchConfetti();
            }
          }
        } catch (e) {}
      }, 5000);
    }
    function stopRewardPolling() {
      if (rewardPollInterval) { clearInterval(rewardPollInterval); rewardPollInterval = null; }
    }

    // ===== REDEMPTION =====
    async function requestRedemption() {
      const btn = els.redeemBtn;
      btn.disabled = true;
      btn.textContent = 'جاري الإرسال...';
      try {
        const data = await api({ action:'requestRedemption', phone: currentPhone });
        if (data.success) {
          showToast('تم إرسال طلبك للكاشير! \u2705', 'success');
          els.rewardReady.classList.add('hidden');
          els.pendingBadge.classList.remove('hidden');
        } else {
          showToast(data.message || 'مشكلة في الإرسال', 'error');
        }
      } catch (e) {
        showToast('مشكلة في الاتصال', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'استخدم الخصم \u1F381';
      }
    }
    els.redeemBtn.addEventListener('click', requestRedemption);

    // ===== TRANSACTIONS (XSS-SAFE DOM RENDERING) =====
    async function loadTransactions(phone) {
      try {
        const data = await api({ action:'getTransactions', phone: phone });
        const list = els.txList;
        if (!data.success || !data.transactions || data.transactions.length === 0) {
          list.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">مفيش معاملات لحد دلوقتي</p>';
          return;
        }
        const fragment = document.createDocumentFragment();
        data.transactions.slice(0, 8).forEach(function(tx) {
          const item = document.createElement('div');
          item.className = 'tx-item';

          const icon = document.createElement('span');
          icon.className = 'tx-icon';
          icon.textContent = tx.type === 'earn' ? '\u2B50' : '\u1F381';

          const info = document.createElement('div');
          info.className = 'tx-info';

          const typeEl = document.createElement('div');
          typeEl.className = 'tx-type';
          typeEl.textContent = tx.type === 'earn' ? ('شراء بـ ' + String(tx.amount || 0) + ' جنيه') : 'استرداد خصم';

          const dateEl = document.createElement('div');
          dateEl.className = 'tx-date';
          dateEl.textContent = String(tx.date || '');

          info.appendChild(typeEl);
          info.appendChild(dateEl);

          const ptsEl = document.createElement('div');
          ptsEl.className = 'tx-points ' + (tx.type === 'earn' ? 'earn' : 'redeem');
          ptsEl.textContent = (tx.type === 'earn' ? '+' : '') + String(tx.points || 0);

          item.appendChild(icon);
          item.appendChild(info);
          item.appendChild(ptsEl);
          fragment.appendChild(item);
        });
        list.innerHTML = '';
        list.appendChild(fragment);
      } catch(e) {
        els.txList.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">مشكلة في تحميل المعاملات</p>';
      }
    }

    // ===== LEADERBOARD (XSS-SAFE DOM RENDERING) =====
    async function loadLeaderboard() {
      try {
        const data = await api({ action:'getLeaderboard' });
        const list = els.leaderboardList;
        if (!data.success || !data.leaderboard || data.leaderboard.length === 0) {
          list.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">مفيش بيانات لحد دلوقتي</p>';
          return;
        }
        const fragment = document.createDocumentFragment();
        data.leaderboard.forEach(function(c, i) {
          const item = document.createElement('div');
          item.className = 'leader-item';

          const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
          const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : ('#' + (i + 1));

          const rank = document.createElement('div');
          rank.className = 'leader-rank ' + rankClass;
          rank.textContent = medal;

          const name = document.createElement('div');
          name.className = 'leader-name';
          const firstName = String(c.name || '').split(' ')[0];
          name.textContent = firstName;

          const pts = document.createElement('div');
          pts.className = 'leader-pts';
          pts.textContent = String(c.points || '0') + ' نقطة';

          item.appendChild(rank);
          item.appendChild(name);
          item.appendChild(pts);
          fragment.appendChild(item);
        });
        list.innerHTML = '';
        list.appendChild(fragment);
      } catch(e) {
        els.leaderboardList.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">مشكلة في تحميل البيانات</p>';
      }
    }

    // ===== CONFETTI =====
    function launchConfetti() {
      const colors = ['#D4AF37', '#8B0000', '#F0C93A', '#fff', '#27AE60'];
      els.confettiContainer.innerHTML = '';
      for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        const size = 6 + Math.random() * 8;
        piece.style.cssText = 'left:' + (Math.random() * 100) + 'vw;background:' + colors[Math.floor(Math.random() * colors.length)] + ';animation-duration:' + (1.5 + Math.random() * 2) + 's;animation-delay:' + (Math.random() * 0.5) + 's;transform:rotate(' + (Math.random() * 360) + 'deg);width:' + size + 'px;height:' + size + 'px;';
        els.confettiContainer.appendChild(piece);
      }
      setTimeout(function() { els.confettiContainer.innerHTML = ''; }, 4000);
    }

    // ===== NAVIGATION =====
    function switchTab(tabId) {
      document.querySelectorAll('.tab-page').forEach(function(el) { el.classList.remove('active'); });
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
      document.querySelectorAll('.drawer-item[data-tab]').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      closeDrawer();
      window.scrollTo(0, 0);
    }

    // Drawer nav
    document.getElementById('nav-home').addEventListener('click', function() { switchTab('tab-home'); });
    document.getElementById('nav-history').addEventListener('click', function() { switchTab('tab-history'); });
    document.getElementById('nav-leader').addEventListener('click', function() { switchTab('tab-leader'); });
    document.getElementById('drawerCompletedBtn').addEventListener('click', function() { switchTab('tab-completed'); });
    document.getElementById('nav-contact').addEventListener('click', function() {
      var msg = 'مرحباً، أنا مهتم بتطوير تطبيق ولاء مشابه لشيخ البلد \u1F37D';
      window.open('https://wa.me/201022390517?text=' + encodeURIComponent(msg), '_blank');
      closeDrawer();
    });
    document.getElementById('nav-logout').addEventListener('click', logout);

    function openDrawer() {
      els.drawer.classList.add('open');
      els.drawerOverlay.classList.add('show');
    }
    function closeDrawer() {
      els.drawer.classList.remove('open');
      els.drawerOverlay.classList.remove('show');
    }
    els.menuBtn.addEventListener('click', openDrawer);
    els.drawerOverlay.addEventListener('click', closeDrawer);

    // ===== LOGOUT =====
    function logout() {
      stopRewardPolling();
      currentPhone = '';
      els.dashboard.classList.add('hidden');
      els.menuBtn.classList.add('hidden');
      closeDrawer();
      els.loginCard.classList.remove('hidden');
      els.phoneInput.value = '';
      els.phoneInput.classList.remove('error');
      els.phoneError.style.display = 'none';
      switchTab('tab-home');
      // Clear session-sensitive data
      try {
        Object.keys(localStorage).forEach(function(k) {
          if (k.startsWith('lastVisit_')) localStorage.removeItem(k);
        });
      } catch(e) {}
    }

    // ===== DARK MODE =====
    function toggleDark() {
      document.body.classList.toggle('dark');
      var isDark = document.body.classList.contains('dark');
      els.darkBtn.textContent = isDark ? '\u2600' : '\u1F319';
      try { localStorage.setItem('darkMode', isDark); } catch(e) {}
    }
    els.darkBtn.addEventListener('click', toggleDark);
    try {
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        els.darkBtn.textContent = '\u2600';
      }
    } catch(e) {}

    // ===== HOW IT WORKS =====
    var howItWorksItems = [
      '\u1F6D2 كل 10 جنيه = نقطة واحدة',
      '\u1F4F8 ارفع الفاتورة وانتظر الموافقة',
      '\u1F381 لما توصل 100 نقطة تاخد خصم 15%',
      '\u1F37D اجمع 10 أختام تاخد صينية هدية',
      '\u267E\uFE0F النقاط مش بتنتهي أبداً'
    ];
    var howContainer = document.getElementById('howItWorks');
    if (howContainer) {
      howContainer.innerHTML = howItWorksItems.join('<br>');
    }

    // ===== SHARE =====
    function shareOnWhatsapp() {
      var pts = els.custPoints.textContent;
      var nameRaw = els.custName.textContent || '';
      var name = nameRaw.replace('أهلاً ', '').replace(' \uD83D\uDC4B', '');
      var msg = 'مرحباً! أنا ' + name + ' عندي ' + pts + ' نقطة ولاء في شيخ البلد \u1F37D\nسجّل معانا: https://figo231.github.io/Sheikh-Elbalad/index.html';
      window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(msg), '_blank');
    }
    document.getElementById('shareBtn').addEventListener('click', shareOnWhatsapp);

    // ===== PWA INSTALL =====
    var deferredPrompt;
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      els.installBanner.classList.add('show');
    });
    document.getElementById('installBtn').addEventListener('click', function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function() {
          deferredPrompt = null;
          els.installBanner.classList.remove('show');
        });
      }
    });
    document.getElementById('dismissInstallBtn').addEventListener('click', function() {
      els.installBanner.classList.remove('show');
    });

    // ===== SECURITY: Clear console hints =====
    console.log('%c\u26A0 Attention', 'color:#c0392b;font-size:20px;font-weight:bold;');
    console.log('%cThis is a browser feature intended for developers. Do not paste any code here.', 'color:#666;font-size:12px;');

  })();
