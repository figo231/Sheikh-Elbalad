/**
 * =============================================
 *   CONFIG - غير هنا بس لكل عميل جديد 🎯
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

  // ── الألوان الرئيسية ────────────────────────
  colors: {
    primary:      "#8B0000",
    primary2:     "#A50000",
    primaryDark:  "#6B0000",
    gold:         "#D4AF37",
    gold2:        "#F0C93A",
    background:   "#F8F4ED",
    dark:         "#1a0000",
  },

  // ── الواتساب ────────────────────────────────
  whatsappAdmin:    "201022390517",
  whatsappSupport:  "201026135795",


  // ── الفروع ───────────────────────────────────
  // كل فرع: { key: 'اسم_مختصر_انجليزي', name: 'الاسم بالعربي' }
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
    instagram: "",   // اتركه فاضي لو مش موجود
  },

  // ── الـ Backend ──────────────────────────────
  scriptUrl: "https://script.google.com/macros/s/AKfycbxgU4jZaGDdhjMGy6-80GjrzV0mHvIO8kgz_jdjRnaPOGeeAVFcPz37jVQQNMJY9Yfi/exec",

  // ── إعدادات النظام ───────────────────────────
  currency:       "جنيه",
  copyrightYear:  "2025",
  copyrightText:  "بياناتك آمنة ومشفرة",
  drawerEmoji:    "🍽️",

};

// =============================================
//   تطبيق الإعدادات على الصفحة تلقائياً
// =============================================
(function applyConfig() {
  const C = APP_CONFIG;

  // ── الألوان ──
  const root = document.documentElement;
  root.style.setProperty('--red',   C.colors.primary);
  root.style.setProperty('--red2',  C.colors.primary2);
  root.style.setProperty('--gold',  C.colors.gold);
  root.style.setProperty('--gold2', C.colors.gold2);
  root.style.setProperty('--cream', C.colors.background);
  root.style.setProperty('--dark',  C.colors.dark);

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
  document.querySelectorAll('.header-logo, .logo-img').forEach(img => {
    img.src = C.logoUrl;
    img.alt = C.appName;
  });

  // ── Splash Screen ──
  const splashTitle = document.querySelector('.login-title');
  if (splashTitle) splashTitle.textContent = 'أهلاً بيك في ' + C.appName + ' 🎉';

  // ── Drawer Header ──
  const drawerHeader = document.querySelector('.drawer-header');
  if (drawerHeader) drawerHeader.textContent = C.appName + ' ' + C.drawerEmoji;

  // ── Footer / Security Badge ──
  const badge = document.querySelector('.security-badge');
  if (badge) badge.innerHTML = '🔒 ' + C.copyrightText;

  // ── سوشيال ميديا ──
  if (C.social) {
    const fbLink = document.querySelector('a[href*="facebook"]');
    if (fbLink) {
      if (C.social.facebook) fbLink.href = C.social.facebook;
      else fbLink.style.display = 'none';
    }
    const ttLink = document.querySelector('a[href*="tiktok"]');
    if (ttLink) {
      if (C.social.tiktok) ttLink.href = C.social.tiktok;
      else ttLink.style.display = 'none';
    }
  }

  // ── header gradient ──
  const header = document.querySelector('header');
  if (header) {
    header.style.background = `linear-gradient(160deg, ${C.colors.primaryDark} 0%, ${C.colors.primary} 50%, ${C.colors.primary2} 100%)`;
  }

})();
