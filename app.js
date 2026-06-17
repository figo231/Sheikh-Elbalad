/**
 * ═══════════════════════════════════════════
 * شيخ البلد - نظام نقاط الولاء
 * Sheikh El Balad - Loyalty Points System
 * ═══════════════════════════════════════════
 */

// ─── Configuration ───────────────────────────────────────
const SCRIPT_URL = (() => {
  try {
    return window.parentScriptUrl || 'https://script.google.com/macros/s/AKfycbwbHRvQ1U6MdFmyD61rK6hSymZCYX_Of_zwl3-1LGpvhVTBj1Omg0yTAWu7ROFvM777/exec';
  } catch {
    return 'https://script.google.com/macros/s/AKfycbwbHRvQ1U6MdFmyD61rK6hSymZCYX_Of_zwl3-1LGpvhVTBj1Omg0yTAWu7ROFvM777/exec';
  }
})();

const SESSION_KEY = 'skeikh_session';
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// ─── State ───────────────────────────────────────────────
let session = null;
let deferredInstallPrompt = null;
let confettiColors = ['#D4AF37', '#F0C93A', '#8B0000', '#27AE60', '#CD853F', '#FFD700', '#C0C0C0'];

// ─── DOM Cache ───────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Validation ──────────────────────────────────────────
function validateEgyptPhone(p) {
  return /^01[0125]\d{8}$/.test(p);
}

// ─── Login Brute Force Protection ────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function getLoginAttempts() {
  try {
    const data = JSON.parse(localStorage.getItem('loginAttempts') || '{}');
    if (data.lockedUntil && Date.now() > data.lockedUntil) {
      localStorage.removeItem('loginAttempts');
      return { count: 0, lockedUntil: null };
    }
    return data;
  } catch { return { count: 0, lockedUntil: null }; }
}
function recordLoginAttempt() {
  const data = getLoginAttempts();
  data.count = (data.count || 0) + 1;
  if (data.count >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }
  localStorage.setItem('loginAttempts', JSON.stringify(data));
  return data;
}
function clearLoginAttempts() {
  localStorage.removeItem('loginAttempts');
}
function isLoginLockedOut() {
  const data = getLoginAttempts();
  return !!(data.lockedUntil && Date.now() < data.lockedUntil);
}
function getRemainingLockoutMinutes() {
  const data = getLoginAttempts();
  if (!data.lockedUntil) return 0;
  return Math.max(0, Math.ceil((data.lockedUntil - Date.now()) / 60000));
}

// ═══════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initSalahPopup();
  initDarkMode();
  initDrawer();
  initInstallBanner();
  initLoginForm();

  // Check for existing session
  session = loadSession();
  if (session && session.phone) {
    showDashboard();
    refreshData();
  } else {
    showLoginCard();
  }
});

// ─── Floating Particles ──────────────────────────────────
function initParticles() {
  const container = $('particles');
  if (!container) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (10 + Math.random() * 15) + 's';
    p.style.animationDelay = Math.random() * 10 + 's';
    p.style.width = p.style.height = (3 + Math.random() * 5) + 'px';
    p.style.opacity = 0.15 + Math.random() * 0.3;
    container.appendChild(p);
  }
}

// ─── Salah Popup ─────────────────────────────────────────
function initSalahPopup() {
  const overlay = $('salahOverlay');
  const closeBtn = $('salahCloseBtn');
  if (!overlay || !closeBtn) return;

  const shouldShow = () => {
    const lastShown = localStorage.getItem('salahPopupLast');
    if (!lastShown) return true;
    return Date.now() - parseInt(lastShown) > 24 * 60 * 60 * 1000;
  };

  if (shouldShow()) {
    overlay.style.display = 'flex';
    localStorage.setItem('salahPopupLast', Date.now().toString());
  } else {
    overlay.style.display = 'none';
  }

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

// ─── Dark Mode ───────────────────────────────────────────
function initDarkMode() {
  const btn = $('darkBtn');
  if (!btn) return;

  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) document.body.classList.add('dark');
  updateDarkIcon(isDark);

  btn.addEventListener('click', () => {
    const nowDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', nowDark);
    updateDarkIcon(nowDark);
  });
}

function updateDarkIcon(isDark) {
  const btn = $('darkBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ─── Drawer / Navigation ─────────────────────────────────
function initDrawer() {
  const menuBtn = $('menuBtn');
  const drawer = $('drawer');
  const overlay = $('drawerOverlay');
  if (!menuBtn || !drawer || !overlay) return;

  menuBtn.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Nav items
  $$('.drawer-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      switchTab(tabId);
      updateDrawerActive(item);
      closeDrawer();
    });
  });

  // Contact
  $('nav-contact')?.addEventListener('click', () => {
    window.open('https://wa.me/201026135795', '_blank', 'noopener,noreferrer');
    closeDrawer();
  });

  // Logout
  $('nav-logout')?.addEventListener('click', () => {
    doLogout();
    closeDrawer();
  });

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('show');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
  }
}

function updateDrawerActive(activeItem) {
  $$('.drawer-item[data-tab]').forEach(item => {
    item.classList.toggle('active', item === activeItem);
  });
}

function switchTab(tabId) {
  $$('.tab-page').forEach(tab => tab.classList.remove('active'));
  const target = $(tabId);
  if (target) target.classList.add('active');

  if (tabId === 'tab-history') loadTransactions();
  if (tabId === 'tab-leader') loadLeaderboard();

  // Update drawer active state
  $$('.drawer-item[data-tab]').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });
}

// ─── Install Banner (PWA) ────────────────────────────────
function initInstallBanner() {
  const banner = $('installBanner');
  const installBtn = $('installBtn');
  const dismissBtn = $('dismissInstallBtn');
  if (!banner) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!localStorage.getItem('installDismissed')) {
      banner.classList.add('show');
    }
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('✅ تم التثبيت بنجاح!', 'success');
    }
    deferredInstallPrompt = null;
    banner.classList.remove('show');
  });

  dismissBtn?.addEventListener('click', () => {
    banner.classList.remove('show');
    localStorage.setItem('installDismissed', 'true');
  });
}

// ═══════════════════════════════════════════════════════════
//  SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Check TTL
    if (data.timestamp && Date.now() - data.timestamp > SESSION_TTL) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveSession(data) {
  session = { ...data, timestamp: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function showLoginCard() {
  $('loginCard')?.classList.remove('hidden');
  $('dashboard')?.classList.add('hidden');
  $('menuBtn')?.classList.add('hidden');
}

function showDashboard() {
  $('loginCard')?.classList.add('hidden');
  $('dashboard')?.classList.remove('hidden');
  $('menuBtn')?.classList.remove('hidden');
  renderDashboard();
}

// ─── Embedded Login Form ─────────────────────────────────
function initLoginForm() {
  const phoneInput = $('phoneInput');
  const lookupBtn = $('lookupBtn');
  const phoneError = $('phoneError');
  const lockoutMsg = $('lockoutMsg');
  const lockoutTimer = $('lockoutTimer');
  if (!phoneInput || !lookupBtn) return;

  // Input sanitization
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    e.target.classList.remove('error');
    if (phoneError) phoneError.style.display = 'none';
  });

  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupBtn.click();
  });

  // Check lockout
  updateLoginLockoutUI();

  lookupBtn.addEventListener('click', async () => {
    if (isLoginLockedOut()) return;

    const phone = phoneInput.value.trim();
    if (!validateEgyptPhone(phone)) {
      phoneInput.classList.add('error');
      if (phoneError) phoneError.style.display = 'block';
      return;
    }

    const btnText = $('loginBtnText');
    const originalText = btnText ? btnText.textContent : 'عرض نقاطي';
    if (btnText) btnText.innerHTML = 'جاري التحقق... <span class="spinner"></span>';
    lookupBtn.disabled = true;

    try {
      const res = await fetch(SCRIPT_URL + '?action=getCustomer&phone=' + encodeURIComponent(phone), {
        method: 'GET',
        redirect: 'follow'
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        const clean = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        json = JSON.parse(clean);
      }

      const c = json.customer;
      if (json.success && c) {
        clearLoginAttempts();
        const pts = c.points || 0;

        // Calculate level dynamically
        let level = 'bronze';
        let levelName = 'مشترك جديد';
        if (pts >= 500) { level = 'plat'; levelName = 'بلاتيني 💎'; }
        else if (pts >= 200) { level = 'gold'; levelName = 'ذهبي 🥇'; }
        else if (pts >= 100) { level = 'silver'; levelName = 'فضي 🥈'; }

        const threshold = c.settings?.threshold || 100;
        const discount = c.settings?.discount || 15;

        const newSession = {
          phone: phone,
          name: c.name || 'عميلنا العزيز',
          points: pts,
          stamps: c.stamps || 0,
          stampStatus: c.pendingStamp ? 'pending' : 'none',
          completedCards: 0,
          lastVisit: c.lastVisit || '',
          pendingRedemption: c.pendingRedemption || false,
          redeemedToday: false,
          canRedeem: pts >= threshold,
          level: level,
          levelName: levelName,
          progress: Math.min((pts / threshold) * 100, 100),
          progressText: pts + ' / ' + threshold,
          nextRewardAt: threshold,
          redeemDiscountPercent: discount,
          warning80: pts >= (threshold * 0.8) && pts < threshold,
          warning80pts: pts,
          transactions: c.transactions || [],
          timestamp: Date.now()
        };
        saveSession(newSession);
        showDashboard();
      } else {
        recordLoginAttempt();
        showToast('❌ الرقم مش مسجل عندنا. تواصل مع الكاشير', 'error');
      }
    } catch (err) {
      showToast('⚠️ حصل مشكلة في الاتصال. جرب تاني', 'error');
    } finally {
      if (btnText) btnText.textContent = originalText;
      lookupBtn.disabled = false;
      updateLoginLockoutUI();
    }
  });
}

function updateLoginLockoutUI() {
  const lockoutMsg = $('lockoutMsg');
  const lookupBtn = $('lookupBtn');
  const lockoutTimer = $('lockoutTimer');
  if (!lockoutMsg || !lookupBtn) return;

  if (isLoginLockedOut()) {
    lockoutMsg.style.display = 'block';
    lookupBtn.disabled = true;
    if (lockoutTimer) lockoutTimer.textContent = getRemainingLockoutMinutes();
    // Update timer every 30 seconds
    const timer = setInterval(() => {
      const remaining = getRemainingLockoutMinutes();
      if (lockoutTimer) lockoutTimer.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        lockoutMsg.style.display = 'none';
        lookupBtn.disabled = false;
        clearLoginAttempts();
      }
    }, 30000);
  } else {
    lockoutMsg.style.display = 'none';
    lookupBtn.disabled = false;
  }
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD RENDERING
// ═══════════════════════════════════════════════════════════

// ─── Safe Event Binding ──────────────────────────────────
const _boundEvents = new Set();
function bindOnce(id, handler) {
  const el = $(id);
  if (!el || _boundEvents.has(id)) return;
  _boundEvents.add(id);
  el.addEventListener('click', handler);
}

function renderDashboard() {
  if (!session) return;

  // Recalculate level dynamically based on current points
  const pts = session.points || 0;
  const threshold = session.nextRewardAt || 100;
  let level = 'bronze';
  let levelName = 'مشترك جديد';
  if (pts >= 500) { level = 'plat'; levelName = 'بلاتيني 💎'; }
  else if (pts >= 200) { level = 'gold'; levelName = 'ذهبي 🥇'; }
  else if (pts >= 100) { level = 'silver'; levelName = 'فضي 🥈'; }

  // Hero
  const custName = $('custName');
  if (custName) custName.textContent = session.name || 'عميلنا العزيز';
  animateNumber('custPoints', pts);
  const lastVisitTxt = $('lastVisitTxt');
  if (lastVisitTxt) lastVisitTxt.textContent = session.lastVisit ? 'آخر زيارة: ' + session.lastVisit : '';

  // Level badge
  const levelBadge = $('levelBadge');
  if (levelBadge) {
    const levelIcons = { bronze: '🥉', silver: '🥈', gold: '🥇', plat: '💎' };
    levelBadge.innerHTML = `<div class="level-badge level-${level}"><span>${levelIcons[level] || '⭐'}</span><span>${levelName}</span></div>`;
  }

  // Progress bar
  const progress = Math.min((pts / threshold) * 100, 100);
  const progressText = pts + ' / ' + threshold;
  const progressTextEl = $('progressText');
  if (progressTextEl) progressTextEl.textContent = progressText;
  setTimeout(() => {
    const progressBar = $('progressBar');
    if (progressBar) progressBar.style.width = progress + '%';
  }, 300);

  // Quick stats
  const statLevel = $('statLevel');
  if (statLevel) statLevel.textContent = levelName;
  const statProgress = $('statProgress');
  if (statProgress) statProgress.textContent = Math.round(progress) + '%';
  const statStamps = $('statStamps');
  if (statStamps) statStamps.textContent = (session.stamps || 0) + '/10';

  // Update howItWorks values
  const howItWorksThreshold = $('howItWorksThreshold');
  if (howItWorksThreshold) howItWorksThreshold.textContent = threshold;
  const howItWorksDiscount = $('howItWorksDiscount');
  if (howItWorksDiscount) howItWorksDiscount.textContent = session.redeemDiscountPercent || 15;

  // Reward ready
  const canRedeem = pts >= threshold;
  const rewardReady = $('rewardReady');
  if (canRedeem && !session.pendingRedemption) {
    rewardReady?.classList.remove('hidden');
    const discountPercent = $('discountPercent');
    if (discountPercent) discountPercent.textContent = session.redeemDiscountPercent || 15;
  } else {
    rewardReady?.classList.add('hidden');
  }

  // Pending redemption
  const pendingBadge = $('pendingBadge');
  if (session.pendingRedemption) {
    pendingBadge?.classList.remove('hidden');
  } else {
    pendingBadge?.classList.add('hidden');
  }

  // Warning 80%
  const warning80 = $('warning80');
  const isNearThreshold = pts >= (threshold * 0.8) && pts < threshold;
  if (isNearThreshold) {
    warning80?.classList.remove('hidden');
    const warning80pts = $('warning80pts');
    if (warning80pts) warning80pts.textContent = threshold - pts;
  } else {
    warning80?.classList.add('hidden');
  }

  // Stamps
  renderStamps(session.stamps || 0, session.stampStatus || 'none');

  // Completed card tab
  if (session.completedCards > 0) {
    $('drawerCompletedBtn')?.classList.remove('hidden');
    renderCompletedStamps(session.completedCards);
  } else {
    $('drawerCompletedBtn')?.classList.add('hidden');
  }

  // Bind buttons (use once to avoid duplicate listeners)
  bindOnce('redeemBtn', handleRedeem);
  bindOnce('stampRequestBtn', handleStampRequest);
  bindOnce('claimRewardBtn', handleClaimReward);
  bindOnce('logoutBtn', doLogout);
  bindOnce('shareBtn', handleShare);
}

// ─── Number Animation ────────────────────────────────────
function animateNumber(elementId, targetValue) {
  const el = $(elementId);
  if (!el) return;
  const duration = 1200;
  const startTime = performance.now();
  const startValue = 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startValue + (targetValue - startValue) * ease);
    el.textContent = current.toLocaleString('ar-EG');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Stamps Grid ─────────────────────────────────────────
function renderStamps(count, status) {
  const grid = $('stampsGrid');
  const countEl = $('stampCount');
  const requestBtn = $('stampRequestBtn');
  const rewardReady = $('stampRewardReady');
  const stampPending = $('stampPending');
  const claimBtn = $('claimRewardBtn');
  const claimPending = $('rewardClaimPending');

  if (!grid) return;

  countEl.textContent = count;
  grid.innerHTML = '';

  for (let i = 0; i < 10; i++) {
    const stamp = document.createElement('div');
    stamp.className = 'stamp' + (i < count ? ' filled' : '');
    stamp.textContent = i < count ? '🍽️' : '';
    grid.appendChild(stamp);
  }

  // Status management
  if (status === 'completed') {
    rewardReady.style.display = 'block';
    requestBtn.style.display = 'none';
    stampPending.style.display = 'none';
    if (session.stampClaimStatus === 'pending') {
      claimBtn.style.display = 'none';
      claimPending.style.display = 'block';
    } else {
      claimBtn.style.display = 'block';
      claimPending.style.display = 'none';
    }
  } else if (status === 'pending') {
    rewardReady.style.display = 'none';
    requestBtn.style.display = 'none';
    stampPending.style.display = 'block';
    claimBtn.style.display = 'none';
    claimPending.style.display = 'none';
  } else {
    rewardReady.style.display = 'none';
    requestBtn.style.display = 'block';
    stampPending.style.display = 'none';
    claimBtn.style.display = 'none';
    claimPending.style.display = 'none';
    requestBtn.disabled = false;
    requestBtn.innerHTML = '✨ طلب ختم جديد';
  }
}

function renderCompletedStamps(completedCount) {
  const grid = $('completedStampsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const totalStamps = completedCount * 10;
  for (let i = 0; i < Math.min(totalStamps, 10); i++) {
    const stamp = document.createElement('div');
    stamp.className = 'stamp filled';
    stamp.textContent = '🍽️';
    grid.appendChild(stamp);
  }
}

// ═══════════════════════════════════════════════════════════
//  API CALLS
// ═══════════════════════════════════════════════════════════

async function apiCall(action, data = {}) {
  if (!session?.phone) throw new Error('No session');

  const params = new URLSearchParams();
  params.append('phone', session.phone);
  params.append('action', action);
  Object.keys(data).forEach(key => params.append(key, data[key]));

  const res = await fetch(SCRIPT_URL + '?' + params.toString(), {
    method: 'GET',
    redirect: 'follow'
  });
  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const clean = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    json = JSON.parse(clean);
  }
  return json;
}

function refreshData() {
  if (!session?.phone) return;
  apiCall('getCustomer')
    .then(data => {
      const c = data.customer;
      if (data.success && c) {
        const pts = c.points || 0;
        saveSession({
          ...session,
          name: c.name || session.name,
          points: pts,
          stamps: c.stamps || 0,
          stampStatus: c.pendingStamp ? 'pending' : 'none',
          stampClaimStatus: c.pendingStampReward ? 'pending' : 'none',
          completedCards: session.completedCards || 0,
          lastVisit: c.lastVisit || '',
          pendingRedemption: c.pendingRedemption || false,
          canRedeem: pts >= 100,
          level: session.level || 'bronze',
          levelName: session.levelName || 'مشترك جديد',
          progress: Math.min((pts / 100) * 100, 100),
          progressText: pts + ' / 100',
          redeemDiscountPercent: 15,
          warning80: pts >= 80 && pts < 100,
          warning80pts: pts,
          transactions: session.transactions || [],
        });
        renderDashboard();
      }
    })
    .catch(() => {
      // Silently fail on refresh
    });
}

// ─── Redeem ──────────────────────────────────────────────
async function handleRedeem() {
  const btn = $('redeemBtn');
  btn.disabled = true;
  btn.innerHTML = 'جاري التقديم... <span class="spinner"></span>';

  try {
    const data = await apiCall('requestRedemption');
    if (data.success) {
      fireConfetti();
      showToast(`🎉 تم طلب الخصم ${session.redeemDiscountPercent || 15}%! انتظر الموافقة`, 'success');
      refreshData();
    } else {
      showToast('❌ ' + (data.message || 'مشكلة في الطلب'), 'error');
    }
  } catch {
    showToast('⚠️ مشكلة في الاتصال', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'استخدم الخصم 🎁';
  }
}

// ─── Stamp Request ───────────────────────────────────────
async function handleStampRequest() {
  const btn = $('stampRequestBtn');
  btn.disabled = true;
  btn.innerHTML = 'جاري الإرسال... <span class="spinner"></span>';

  try {
    const data = await apiCall('requestStamp');
    if (data.success) {
      showToast('✅ طلب الختم تم إرساله! انتظر الموافقة', 'success');
      refreshData();
    } else {
      showToast('❌ ' + (data.message || 'مشكلة في الطلب'), 'error');
    }
  } catch {
    showToast('⚠️ مشكلة في الاتصال', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ طلب ختم جديد';
  }
}

// ─── Claim Reward ────────────────────────────────────────
async function handleClaimReward() {
  const btn = $('claimRewardBtn');
  btn.disabled = true;
  btn.innerHTML = 'جاري الطلب... <span class="spinner"></span>';

  try {
    const data = await apiCall('requestStampReward');
    if (data.success) {
      fireConfetti();
      showToast('🏆 تم طلب المكافأة! أبلّغ الكاشير', 'success');
      refreshData();
    } else {
      showToast('❌ ' + (data.message || 'مشكلة في الطلب'), 'error');
    }
  } catch {
    showToast('⚠️ مشكلة في الاتصال', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🏆 المطالبة بالمكافأة';
  }
}

// ─── Transactions ────────────────────────────────────────
function loadTransactions() {
  const txList = $('txList');
  if (!txList) return;

  const txs = session?.transactions || [];
  if (txs.length === 0) {
    txList.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">لا توجد معاملات حتى الآن</p>';
    return;
  }

  txList.innerHTML = '';
  txs.slice(0, 20).forEach(tx => {
    const isEarn = tx.points > 0;
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.innerHTML = `
      <div class="tx-icon">${isEarn ? '🟢' : '🔴'}</div>
      <div class="tx-info">
        <div class="tx-type">${tx.type || (isEarn ? 'كسب نقاط' : 'استبدال')}</div>
        <div class="tx-date">${tx.date || ''}</div>
      </div>
      <div class="tx-points ${isEarn ? 'earn' : 'redeem'}">
        ${isEarn ? '+' : ''}${tx.points}
      </div>
    `;
    txList.appendChild(item);
  });
}

// ─── Leaderboard ─────────────────────────────────────────
async function loadLeaderboard() {
  const list = $('leaderboardList');
  const shareCard = $('shareCard');
  if (!list) return;

  list.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">جاري التحميل...</p>';

  try {
    const data = await apiCall('getLeaderboard');
    const leaders = data.leaderboard || [];

    if (leaders.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">لا يوجد بيانات</p>';
      return;
    }

    list.innerHTML = '';
    leaders.forEach((leader, i) => {
      const rank = i + 1;
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
      const rankIcons = { 1: '🥇', 2: '🥈', 3: '🥉' };
      const isMe = leader.phone === session?.phone;

      const item = document.createElement('div');
      item.className = 'leader-item';
      if (isMe) item.style.background = 'rgba(212,175,55,0.08)';
      item.innerHTML = `
        <div class="leader-rank ${rankClass}">${rankIcons[rank] || rank}</div>
        <div class="leader-name">${leader.name || 'عميل'}${isMe ? ' <span style="color:var(--gold);font-size:10px;">(أنت)</span>' : ''}</div>
        <div class="leader-pts">${(leader.points || 0).toLocaleString('ar-EG')}</div>
      `;
      list.appendChild(item);
    });

    shareCard.style.display = 'block';
  } catch {
    list.innerHTML = '<p style="text-align:center;color:#ccc;font-size:12px;padding:14px;">⚠️ خطأ في التحميل</p>';
  }
}

// ─── Share ───────────────────────────────────────────────
function handleShare() {
  const text = `🏆 أنا في نظام ولاء شيخ البلد!\n` +
    `⭐ عندي ${session?.points || 0} نقطة\n` +
    `🍽️ ${session?.stamps || 0} أختام من 10\n` +
    `💎 المرحلة: ${session?.levelName || 'مشترك جديد'}\n\n` +
    `انضم لينا: https://sheikhelbalad.com`;

  const url = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── Logout ──────────────────────────────────────────────
function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  session = null;
  showLoginCard();
  showToast('👋 تم تسجيل الخروج بنجاح');
}

// ═══════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════

function showToast(msg, type) {
  const t = $('toast');
  t.textContent = msg;
  t.className = type || '';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Confetti Effect ─────────────────────────────────────
function fireConfetti() {
  const container = $('confettiContainer');
  if (!container) return;

  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}

// ─── Periodic Session Refresh ────────────────────────────
setInterval(() => {
  if (session && session.phone) {
    refreshData();
  }
}, 60 * 1000); // Every minute
