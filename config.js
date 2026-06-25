/**
 * =============================================
 *   CONFIG - الإعدادات العامة
 *   PREMIUM GLASSMORPHISM 2026
 * =============================================
 */

const APP_CONFIG = {

  // ── الهوية ──────────────────────────────────
  appName:        "شيخ البلد",
  appTagline:     "نقاط الولاء",
  appDescription: "اجمع نقاطك واستبدلها بمكافآت",

  // ── الأيقونات والصور ────────────────────────
  logoUrl:        "icon-192x192.png",
  iconSmall:      "icon-192x192.png",
  iconLarge:      "icon-512x512.png",

  // ── الألوان الرئيسية (Luxury 2026) ───────────
  colors: {
    primary:      "#8B0000",
    primary2:     "#A50000",
    primaryDark:  "#5C0000",
    accent:       "#D4AF37",
    accent2:      "#F0C93A",
    background:   "#FFF8F0",
    dark:         "#1A0A0A",
  },

  // ── الواتساب ────────────────────────────────
  whatsappAdmin:    "201022390517",
  whatsappSupport:  "201026135795",


  // ── الفروع ───────────────────────────────────
  branches: [
    { key: 'alfmosken',  name: 'الف مسكن'  },
    { key: 'matriya',    name: 'المطرية'    },
    { key: 'shorouk',    name: 'الشروق'     },
    { key: 'callcenter', name: 'كول سنتر', isCallCenter: true },
  ],

  // ── سوشيال ميديا ────────────────────────────
  social: {
    facebook:  "https://www.facebook.com/share/1DhbKDUUra/",
    tiktok:    "https://www.tiktok.com/@skeikh.el.balad",
    instagram: "",
  },

  // ── الـ Backend ──────────────────────────────
  scriptUrl: "https://script.google.com/macros/s/AKfycbxgU4jZaGDdhjMGy6-80GjrzV0mHvIO8kgz_jdjRnaPOGeeAVFcPz37jVQQNMJY9Yfi/exec",

  // ── إعدادات النظام ───────────────────────────
  currency:       "جنيه",
  copyrightYear:  "2025",
  copyrightText:  "البيانات محمية ومشفرة",

};

// =============================================
//   تطبيق الإعدادات على الصفحة تلقائياً
// =============================================
(function applyConfig() {
  const C = APP_CONFIG;

  // ── الألوان ──
  const root = document.documentElement;
  root.style.setProperty('--brand',        C.colors.primary);
  root.style.setProperty('--brand-soft',   'rgba(139, 0, 0, 0.12)');
  root.style.setProperty('--brand-dark',   C.colors.primaryDark);
  root.style.setProperty('--accent',       C.colors.accent);
  root.style.setProperty('--accent-soft',  'rgba(212, 175, 55, 0.12)');

  // ── العنوان ──
  document.title = C.appName + ' - ' + C.appTagline;

  // ── meta tags ──
  const themeColor = document.getElementById('themeColorMeta');
  if (themeColor) themeColor.content = C.colors.primary;

  const appleTitle = document.getElementById('appleTitleMeta');
  if (appleTitle) appleTitle.content = C.appName;

  // ── Header ──
  const h1 = document.querySelector('header h1');
  if (h1) h1.textContent = C.appName;

  const headerP = document.querySelector('header p');
  if (headerP) headerP.textContent = C.appTagline;

  // ── اللوجو ──
  document.querySelectorAll('.header-logo, .logo-img, .login-logo').forEach(img => {
    img.src = C.logoUrl;
    img.alt = C.appName;
  });

  // ── Splash Title ──
  const splashTitle = document.getElementById('splashTitle');
  if (splashTitle) splashTitle.textContent = 'مرحبًا بك في ' + C.appName;

  // ── Drawer Header ──
  const drawerHeader = document.getElementById('drawerHeader');
  if (drawerHeader) drawerHeader.textContent = C.appName;

  // ── Footer ──
  const footerCopy = document.getElementById('footerCopy');
  if (footerCopy) footerCopy.textContent = C.appName + ' \u00A9 ' + C.copyrightYear;

  // ── سوشيال ميديا ──
  if (C.social) {
    const fbLink = document.getElementById('fbLink');
    if (fbLink) {
      if (C.social.facebook) fbLink.href = C.social.facebook;
      else fbLink.style.display = 'none';
    }
    const ttLink = document.getElementById('ttLink');
    if (ttLink) {
      if (C.social.tiktok) ttLink.href = C.social.tiktok;
      else ttLink.style.display = 'none';
    }
  }

})();
