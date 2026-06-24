// ============================================================
//  ⚙️  CONFIG — غير هنا بس لكل عميل جديد
// ============================================================
const CONFIG = {
  SHEET_ID:        '1ERjDKsL_fankPnhwM9VCYEhwh4fBXBiawNBID2ylLUI',
  ADMIN_PASSWORD:  '1234',
  POINTS_PER_EGP:  0.1,
  THRESHOLD:       100,
  DISCOUNT:        15,
  STAMPS_REQUIRED: 10,   // عدد أختام البطاقة الافتراضية (لو مفيش بطاقات في الشيت)
  APP_NAME:        'شيخ البلد',
  CURRENCY:        'جنيه',
};

// ============================================================
//  ENTRY POINTS
// ============================================================
function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  const p      = e.parameter || {};
  const action = p.action;
  let result;
  try {
    if      (action === 'getCustomer')            result = getCustomer(p.phone);
    else if (action === 'addCustomer')            result = addCustomer(p);
    else if (action === 'registerCustomer')       result = registerCustomer(p.phone, p.name);
    else if (action === 'addPoints')              result = addPoints(p);
    else if (action === 'adjustPoints')           result = adjustPoints(p);
    else if (action === 'getTransactions')        result = getTransactions(p.phone);
    else if (action === 'requestRedemption')      result = requestRedemption(p.phone);
    else if (action === 'getPendingRedemptions')  result = getPendingRedemptions(p);
    else if (action === 'getAllCustomers')         result = getAllCustomers(p);
    else if (action === 'approveRedemption')      result = approveRedemption(p);
    else if (action === 'rejectRedemption')       result = rejectRedemption(p);
    else if (action === 'deleteCustomer')         result = deleteCustomer(p);
    else if (action === 'getLeaderboard')         result = getLeaderboard();
    // ── أختام (بطاقة واحدة — legacy) ──
    else if (action === 'requestStamp')           result = requestStamp(p.phone);
    else if (action === 'approveStamp')           result = approveStamp(p);
    else if (action === 'rejectStamp')            result = rejectStamp(p);
    else if (action === 'addStamp')               result = addStamp(p);
    else if (action === 'adjustStamp')            result = adjustStamp(p);
    else if (action === 'getPendingStamps')       result = getPendingStamps(p);
    else if (action === 'requestStampReward')     result = requestStampReward(p.phone);
    else if (action === 'getPendingStampRewards') result = getPendingStampRewards(p);
    else if (action === 'approveStampReward')     result = approveStampReward(p);
    else if (action === 'rejectStampReward')      result = rejectStampReward(p);
    else if (action === 'fixStampRow')            result = fixStampRow(p);
    // ── بطاقات متعددة (new) ──
    else if (action === 'getCards')               result = getCards();
    else if (action === 'saveCard')               result = saveCard(p);
    else if (action === 'deleteCard')             result = deleteCard(p);
    else if (action === 'toggleCard')             result = toggleCard(p);
    else if (action === 'getCustomerCards')       result = getCustomerCards(p.phone);
    else if (action === 'addStampToCard')         result = addStampToCard(p);
    else if (action === 'requestCardReward')      result = requestCardReward(p);
    else if (action === 'getPendingCardRewards')  result = getPendingCardRewards(p);
    else if (action === 'approveCardReward')      result = approveCardReward(p);
    else if (action === 'rejectCardReward')       result = rejectCardReward(p);
    // ── مستخدمين ──
    else if (action === 'getUsers')               result = getUsers(p);
    else if (action === 'addUser')                result = addUser(p);
    else if (action === 'deleteUser')             result = deleteUser(p);
    else if (action === 'updateUserPass')         result = updateUserPass(p);
    else if (action === 'verifyMainAdmin')        result = verifyMainAdmin(p.password);
    else if (action === 'getUserNames')           result = getUserNames();
    else if (action === 'verifyUser')             result = verifyUser(p.name, p.pass);
    // ── إعدادات ──
    else if (action === 'getSettings')            result = getSettings(p);
    else if (action === 'saveSettings')           result = saveSettings(p);
    else result = { success: false, message: 'Unknown action' };
  } catch (err) {
    result = { success: false, message: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  AUTHORIZATION
// ============================================================
function authorize(p, requiredPerm) {
  if (p.password && p.password === CONFIG.ADMIN_PASSWORD)
    return { ok: true, isMainAdmin: true, name: 'الأدمن الرئيسي' };
  if (requiredPerm === null)
    return { ok: false, message: 'الإجراء ده للأدمن الرئيسي بس' };
  if (!p.actorName || !p.actorPass)
    return { ok: false, message: 'سجل دخولك تاني' };
  const sh   = getUsersSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.actorName) && String(data[i][1]) === String(p.actorPass)) {
      const role  = String(data[i][2] || '');
      const perms = String(data[i][4] || '').split(',').map(s => s.trim());
      if (role === 'super' || perms.indexOf(requiredPerm) !== -1)
        return { ok: true, isMainAdmin: false, name: p.actorName, role };
      return { ok: false, message: 'مفيش عندك صلاحية تعمل الإجراء ده' };
    }
  }
  return { ok: false, message: 'بيانات الدخول غلط، سجل دخولك تاني' };
}

// ============================================================
//  HELPERS
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange('A:A').setNumberFormat('@');
    if (name === 'Customers')
      sh.appendRow(['Phone','Name','Points','TotalSpent','JoinDate','PendingRedemption','LastVisit']);
    if (name === 'Transactions')
      sh.appendRow(['Phone','Type','Amount','Points','Date']);
    if (name === 'Stamps')
      sh.appendRow(['Phone','Name','StampCount','PendingStamp','Date','PendingReward','RewardCompleted']);
    if (name === 'Cards')
      sh.appendRow(['CardID','Name','StampsRequired','Reward','Active','CreatedAt']);
    if (name === 'StampCards')
      sh.appendRow(['Phone','CardID','StampCount','PendingStamp','PendingReward','Date']);
  }
  return sh;
}

function normalizePhone(phone) {
  let p = String(phone).trim();
  if (p.length === 10 && !p.startsWith('0')) p = '0' + p;
  return p;
}

function writePhone(sheet, row, col, phone) {
  sheet.getRange(row, col).setValue("'" + phone);
}

function findCustomer(phone) {
  const p    = normalizePhone(phone);
  const sh   = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) === p)
      return { row: i + 1, data: data[i] };
  }
  return null;
}

function generateId() {
  return Utilities.getUuid().split('-')[0].toUpperCase();
}

// ============================================================
//  CUSTOMERS
// ============================================================
function getCustomer(phone) {
  const found = findCustomer(phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const d = found.data;
  getSheet('Customers').getRange(found.row, 7).setValue(new Date());

  // legacy stamp
  let stampsCount = 0, pendingStamp = false, pendingStampReward = false, stampRewardCompleted = false;
  const stampFound = findStampCustomer(phone);
  if (stampFound) {
    stampsCount          = stampFound.data[2] || 0;
    pendingStamp         = stampFound.data[3] === true || stampFound.data[3] === 'TRUE';
    pendingStampReward   = stampFound.data[5] === true || stampFound.data[5] === 'TRUE';
    stampRewardCompleted = stampFound.data[6] === true || stampFound.data[6] === 'TRUE';
  }

  // بطاقات متعددة
  const customerCards = getCustomerCardsData(phone);

  return {
    success: true,
    customer: {
      phone:                normalizePhone(String(d[0])),
      name:                 d[1],
      points:               d[2] || 0,
      totalSpent:           d[3] || 0,
      pendingRedemption:    d[5] === true || d[5] === 'TRUE',
      lastVisit:            d[6] ? Utilities.formatDate(new Date(d[6]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : null,
      threshold:            getCurrentThreshold(),
      discount:             getCurrentDiscount(),
      stamps:               stampsCount,
      pendingStamp:         pendingStamp,
      pendingStampReward:   pendingStampReward,
      stampRewardCompleted: stampRewardCompleted,
      cards:                customerCards,
    }
  };
}

function addCustomer(p) {
  const auth = authorize(p, 'تسجيل عملاء');
  if (!auth.ok) return { success: false, message: auth.message };
  const phone = p.phone, name = p.name;
  if (!phone || !name) return { success: false, message: 'ادخل الاسم والتليفون' };
  const ph = normalizePhone(phone);
  if (findCustomer(ph)) return { success: false, message: 'الرقم ده مسجل بالفعل' };
  const sh  = getSheet('Customers');
  const row = sh.getLastRow() + 1;
  writePhone(sh, row, 1, ph);
  sh.getRange(row, 2).setValue(name);
  sh.getRange(row, 3).setValue(0);
  sh.getRange(row, 4).setValue(0);
  sh.getRange(row, 5).setValue(new Date());
  sh.getRange(row, 6).setValue(false);
  sh.getRange(row, 7).setValue('');
  return { success: true, message: `تم تسجيل ${name} بنجاح 🎉` };
}

function registerCustomer(phone, name) {
  if (!phone || !name) return { success: false, message: 'ادخل الاسم ورقم التليفون' };
  const cleanName = String(name).trim().slice(0, 50);
  if (cleanName.length < 2) return { success: false, message: 'اكتب اسم صحيح' };
  const cleanPhone = String(phone).trim();
  if (!/^01[0125]\d{8}$/.test(cleanPhone)) return { success: false, message: 'ادخل رقم مصري صحيح (11 رقم يبدأ بـ 01)' };
  const p = normalizePhone(cleanPhone);
  if (findCustomer(p)) return { success: false, message: 'الرقم ده مسجل بالفعل، جرب تسجيل الدخول' };
  const sh  = getSheet('Customers');
  const row = sh.getLastRow() + 1;
  writePhone(sh, row, 1, p);
  sh.getRange(row, 2).setValue(cleanName);
  sh.getRange(row, 3).setValue(0);
  sh.getRange(row, 4).setValue(0);
  sh.getRange(row, 5).setValue(new Date());
  sh.getRange(row, 6).setValue(false);
  sh.getRange(row, 7).setValue('');
  return { success: true, message: `أهلاً بيك ${cleanName} 🎉 تم تسجيلك بنجاح` };
}

function addPoints(p) {
  const auth = authorize(p, 'إضافة نقاط');
  if (!auth.ok) return { success: false, message: auth.message };
  const ph     = normalizePhone(p.phone);
  const amount = parseFloat(p.amount);
  const pts    = Math.floor(amount * CONFIG.POINTS_PER_EGP);
  let found = findCustomer(ph);
  if (!found) {
    const sh  = getSheet('Customers');
    const row = sh.getLastRow() + 1;
    writePhone(sh, row, 1, ph);
    sh.getRange(row, 2).setValue(ph);
    sh.getRange(row, 3).setValue(pts);
    sh.getRange(row, 4).setValue(amount);
    sh.getRange(row, 5).setValue(new Date());
    sh.getRange(row, 6).setValue(false);
    sh.getRange(row, 7).setValue(new Date());
    getSheet('Transactions').appendRow([ph, 'earn', amount, pts, new Date()]);
    return { success: true, message: `تمت إضافة ${pts} نقطة`, newTotal: pts };
  }
  const sh       = getSheet('Customers');
  const newPts   = (found.data[2] || 0) + pts;
  const newSpent = (found.data[3] || 0) + amount;
  sh.getRange(found.row, 3).setValue(newPts);
  sh.getRange(found.row, 4).setValue(newSpent);
  getSheet('Transactions').appendRow([ph, 'earn', amount, pts, new Date()]);
  return { success: true, message: `تمت إضافة ${pts} نقطة`, newTotal: newPts };
}

function getTransactions(phone) {
  const p    = normalizePhone(phone);
  const sh   = getSheet('Transactions');
  const data = sh.getDataRange().getValues();
  const txs  = [];
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) === p) {
      txs.push({
        type:   data[i][1],
        amount: data[i][2],
        points: data[i][3],
        date:   Utilities.formatDate(new Date(data[i][4]), Session.getScriptTimeZone(), 'dd/MM/yyyy')
      });
    }
  }
  return { success: true, transactions: txs.reverse() };
}

function requestRedemption(phone) {
  const found = findCustomer(phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const threshold = getCurrentThreshold();
  const discount  = getCurrentDiscount();
  const pts = found.data[2] || 0;
  if (pts < threshold) return { success: false, message: `محتاج ${threshold} نقطة — عندك ${pts} بس` };
  if (found.data[5] === true || found.data[5] === 'TRUE')
    return { success: false, message: 'عندك طلب خصم بالفعل في الانتظار' };
  getSheet('Customers').getRange(found.row, 6).setValue(true);
  return { success: true, message: `تم إرسال طلب الخصم ${discount}% للكاشير` };
}

function getPendingRedemptions(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === true || data[i][5] === 'TRUE')
      list.push({ phone: normalizePhone(String(data[i][0])), name: data[i][1], points: data[i][2] });
  }
  return { success: true, pending: list };
}

function getAllCustomers(p) {
  const auth = authorize(p, 'حذف');
  if (!auth.ok) return { success: false, message: auth.message };
  const sh       = getSheet('Customers');
  const data     = sh.getDataRange().getValues();
  const stampSh  = getStampSheet();
  const stampData = stampSh.getDataRange().getValues();
  const stampMap  = {};
  for (let i = 1; i < stampData.length; i++)
    stampMap[normalizePhone(String(stampData[i][0]))] = stampData[i][2] || 0;
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const ph = normalizePhone(String(data[i][0]));
    list.push({ phone: ph, name: data[i][1], points: data[i][2] || 0,
      totalSpent: data[i][3] || 0, pendingRedemption: data[i][5] === true || data[i][5] === 'TRUE',
      stamps: stampMap[ph] || 0 });
  }
  return { success: true, customers: list };
}

function adjustPoints(p) {
  const auth = authorize(p, 'إضافة نقاط');
  if (!auth.ok) return { success: false, message: auth.message };
  const ph    = normalizePhone(p.phone);
  const delta = Math.round(parseFloat(p.delta));
  if (isNaN(delta) || delta === 0) return { success: false, message: 'قيمة غلط' };
  const found = findCustomer(ph);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const sh     = getSheet('Customers');
  const newPts = Math.max((found.data[2] || 0) + delta, 0);
  sh.getRange(found.row, 3).setValue(newPts);
  getSheet('Transactions').appendRow([ph, 'adjust', 0, delta, new Date()]);
  return { success: true, message: `تم التعديل — النقط دلوقتي ${newPts}`, newTotal: newPts };
}

function adjustStamp(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const ph    = normalizePhone(p.phone);
  const delta = Math.round(parseFloat(p.delta));
  if (isNaN(delta) || delta === 0) return { success: false, message: 'قيمة غلط' };
  const sh   = getStampSheet();
  let found  = findStampCustomer(ph);
  const req  = CONFIG.STAMPS_REQUIRED;
  if (!found) {
    if (delta < 0) return { success: false, message: 'العميل مفيش عنده أختام أصلاً' };
    const custFound = findCustomer(ph);
    const name = custFound ? custFound.data[1] : ph;
    const row  = sh.getLastRow() + 1;
    writePhone(sh, row, 1, ph); sh.getRange(row, 2).setValue(name);
    sh.getRange(row, 3).setValue(Math.min(delta, req));
    sh.getRange(row, 4).setValue(false); sh.getRange(row, 5).setValue(new Date());
    sh.getRange(row, 6).setValue(false); sh.getRange(row, 7).setValue(false);
    return { success: true, message: 'تم التعديل', newTotal: Math.min(delta, req) };
  }
  const newCount = Math.max(0, Math.min(req, (found.data[2] || 0) + delta));
  sh.getRange(found.row, 3).setValue(newCount);
  return { success: true, message: `تم التعديل — الأختام دلوقتي ${newCount}`, newTotal: newCount };
}

function approveRedemption(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const threshold = getCurrentThreshold();
  const discount  = getCurrentDiscount();
  const sh     = getSheet('Customers');
  const newPts = Math.max((found.data[2] || 0) - threshold, 0);
  sh.getRange(found.row, 3).setValue(newPts);
  sh.getRange(found.row, 6).setValue(false);
  getSheet('Transactions').appendRow([normalizePhone(p.phone), 'redeem', 0, -threshold, new Date()]);
  return { success: true, message: `تمت الموافقة — خصم ${discount}%` };
}

function rejectRedemption(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  getSheet('Customers').getRange(found.row, 6).setValue(false);
  return { success: true, message: 'تم الرفض' };
}

function deleteCustomer(p) {
  const auth = authorize(p, 'حذف');
  if (!auth.ok) return { success: false, message: auth.message };
  const ph   = normalizePhone(p.phone);
  const sh   = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) === ph) {
      sh.deleteRow(i + 1);
      return { success: true, message: 'تم الحذف' };
    }
  }
  return { success: false, message: 'العميل مش موجود' };
}

function getLeaderboard() {
  const sh   = getSheet('Customers');
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++)
    list.push({ name: data[i][1], points: data[i][2] || 0 });
  list.sort((a, b) => b.points - a.points);
  return { success: true, leaderboard: list.slice(0, 5) };
}

// ============================================================
//  STAMPS (legacy — بطاقة واحدة)
// ============================================================
function getStampSheet() { return getSheet('Stamps'); }

function findStampCustomer(phone) {
  const p    = normalizePhone(phone);
  const sh   = getStampSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) === p)
      return { row: i + 1, data: data[i] };
  }
  return null;
}

function requestStamp(phone) {
  if (!phone) return { success: false, message: 'ادخل رقم التليفون' };
  const p         = normalizePhone(phone);
  const custFound = findCustomer(p);
  const name      = custFound ? custFound.data[1] : p;
  const sh        = getStampSheet();
  let found       = findStampCustomer(p);
  if (!found) {
    const row = sh.getLastRow() + 1;
    writePhone(sh, row, 1, p); sh.getRange(row, 2).setValue(name);
    sh.getRange(row, 3).setValue(0); sh.getRange(row, 4).setValue(true);
    sh.getRange(row, 5).setValue(new Date()); sh.getRange(row, 6).setValue(false);
    sh.getRange(row, 7).setValue(false);
    return { success: true, message: 'تم إرسال طلب الختم' };
  }
  if (found.data[3] === true || found.data[3] === 'TRUE')
    return { success: false, message: 'عندك طلب ختم بالفعل في الانتظار' };
  if ((found.data[2] || 0) >= CONFIG.STAMPS_REQUIRED)
    return { success: false, message: 'عندك هدية جاهزة! استلمها الأول' };
  sh.getRange(found.row, 4).setValue(true);
  sh.getRange(found.row, 2).setValue(name);
  return { success: true, message: 'تم إرسال طلب الختم' };
}

function approveStamp(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findStampCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  let newCount = (found.data[2] || 0) + 1;
  let completed = false;
  if (newCount >= CONFIG.STAMPS_REQUIRED) { newCount = CONFIG.STAMPS_REQUIRED; completed = true; }
  getStampSheet().getRange(found.row, 3).setValue(newCount);
  getStampSheet().getRange(found.row, 4).setValue(false);
  return { success: true, message: completed ? '🎉 اكتملت البطاقة!' : `تمت الموافقة — الختم رقم ${newCount}`, stamps: newCount, completed };
}

function rejectStamp(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findStampCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  getStampSheet().getRange(found.row, 4).setValue(false);
  return { success: true, message: 'تم الرفض' };
}

function addStamp(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const ph  = normalizePhone(p.phone);
  const sh  = getStampSheet();
  let found = findStampCustomer(ph);
  if (!found) {
    const custFound = findCustomer(ph);
    const name = custFound ? custFound.data[1] : ph;
    const row  = sh.getLastRow() + 1;
    writePhone(sh, row, 1, ph); sh.getRange(row, 2).setValue(name);
    sh.getRange(row, 3).setValue(1); sh.getRange(row, 4).setValue(false);
    sh.getRange(row, 5).setValue(new Date()); sh.getRange(row, 6).setValue(false);
    sh.getRange(row, 7).setValue(false);
    return { success: true, message: 'تمت إضافة الختم الأول', stamps: 1, completed: false };
  }
  let newCount = (found.data[2] || 0) + 1;
  let completed = false;
  if (newCount >= CONFIG.STAMPS_REQUIRED) { newCount = CONFIG.STAMPS_REQUIRED; completed = true; }
  sh.getRange(found.row, 3).setValue(newCount);
  sh.getRange(found.row, 4).setValue(false);
  return { success: true, message: completed ? '🎉 اكتملت البطاقة!' : `تمت إضافة الختم — العدد ${newCount}`, stamps: newCount, completed };
}

function getPendingStamps(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getStampSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === true || data[i][3] === 'TRUE')
      list.push({ phone: normalizePhone(String(data[i][0])), name: data[i][1], stamps: data[i][2] || 0 });
  }
  return { success: true, stamps: list };
}

function requestStampReward(phone) {
  if (!phone) return { success: false, message: 'ادخل رقم التليفون' };
  const p     = normalizePhone(phone);
  const found = findStampCustomer(p);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const stamps          = found.data[2] || 0;
  const pendingReward   = found.data[5] === true || found.data[5] === 'TRUE';
  const rewardCompleted = found.data[6] === true || found.data[6] === 'TRUE';
  if (stamps < CONFIG.STAMPS_REQUIRED) return { success: false, message: 'لسه ماكملتش الأختام' };
  if (rewardCompleted) return { success: false, message: 'تم استلام المكافأة من قبل' };
  if (pendingReward)   return { success: false, message: 'طلبك قيد المراجعة' };
  getStampSheet().getRange(found.row, 6).setValue(true);
  return { success: true, message: 'تم إرسال طلب المكافأة للأدمن' };
}

function getPendingStampRewards(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getStampSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === true || data[i][5] === 'TRUE')
      list.push({ phone: normalizePhone(String(data[i][0])), name: data[i][1], stamps: data[i][2] || 0 });
  }
  return { success: true, rewards: list };
}

function approveStampReward(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findStampCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const sh = getStampSheet();
  sh.getRange(found.row, 3).setValue(0);
  sh.getRange(found.row, 6).setValue(false);
  sh.getRange(found.row, 7).setValue(false);
  return { success: true, message: '🎉 تمت الموافقة — البطاقة بدأت من جديد' };
}

function rejectStampReward(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findStampCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  getStampSheet().getRange(found.row, 6).setValue(false);
  return { success: true, message: 'تم الرفض' };
}

function fixStampRow(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findStampCustomer(p.phone);
  if (!found) return { success: false, message: 'العميل مش موجود' };
  const sh = getStampSheet();
  sh.getRange(found.row, 3).setValue(0);
  sh.getRange(found.row, 6).setValue(false);
  sh.getRange(found.row, 7).setValue(false);
  return { success: true, message: 'تم تصحيح البيانات' };
}

// ============================================================
//  CARDS — إدارة البطاقات المتعددة (أدمن)
//  Sheet: Cards [CardID | Name | StampsRequired | Reward | Active | CreatedAt]
// ============================================================
function getCards() {
  const sh   = getSheet('Cards');
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      cardId:         String(data[i][0]),
      name:           data[i][1],
      stampsRequired: Number(data[i][2]) || 10,
      reward:         data[i][3],
      active:         data[i][4] === true || data[i][4] === 'TRUE' || data[i][4] === true,
      createdAt:      data[i][5] ? Utilities.formatDate(new Date(data[i][5]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : ''
    });
  }
  return { success: true, cards: list };
}

// إضافة أو تعديل بطاقة
// p.cardId موجود = تعديل | مش موجود = إضافة جديدة
function saveCard(p) {
  const auth = authorize(p, null); // أدمن رئيسي بس
  if (!auth.ok) return { success: false, message: auth.message };
  const name   = String(p.name || '').trim();
  const stamps = parseInt(p.stampsRequired, 10);
  const reward = String(p.reward || '').trim();
  if (!name || isNaN(stamps) || stamps < 1 || !reward)
    return { success: false, message: 'ادخل اسم البطاقة وعدد الأختام والمكافأة' };

  const sh   = getSheet('Cards');
  const data = sh.getDataRange().getValues();

  if (p.cardId) {
    // تعديل بطاقة موجودة
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(p.cardId)) {
        sh.getRange(i + 1, 2).setValue(name);
        sh.getRange(i + 1, 3).setValue(stamps);
        sh.getRange(i + 1, 4).setValue(reward);
        return { success: true, message: 'تم تحديث البطاقة ✅' };
      }
    }
    return { success: false, message: 'البطاقة مش موجودة' };
  }

  // إضافة جديدة
  const cardId = generateId();
  sh.appendRow([cardId, name, stamps, reward, true, new Date()]);
  return { success: true, message: `تمت إضافة البطاقة "${name}" ✅`, cardId };
}

function deleteCard(p) {
  const auth = authorize(p, null);
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getSheet('Cards');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.cardId)) {
      sh.deleteRow(i + 1);
      return { success: true, message: 'تم حذف البطاقة' };
    }
  }
  return { success: false, message: 'البطاقة مش موجودة' };
}

function toggleCard(p) {
  const auth = authorize(p, null);
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getSheet('Cards');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.cardId)) {
      const current = data[i][4] === true || data[i][4] === 'TRUE';
      sh.getRange(i + 1, 5).setValue(!current);
      return { success: true, active: !current, message: !current ? 'تم تفعيل البطاقة' : 'تم تعطيل البطاقة' };
    }
  }
  return { success: false, message: 'البطاقة مش موجودة' };
}

// ============================================================
//  STAMP CARDS — أختام العميل على كل بطاقة
//  Sheet: StampCards [Phone | CardID | StampCount | PendingStamp | PendingReward | Date]
// ============================================================
function findCustomerCard(phone, cardId) {
  const p    = normalizePhone(phone);
  const sh   = getSheet('StampCards');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) === p && String(data[i][1]) === String(cardId))
      return { row: i + 1, data: data[i] };
  }
  return null;
}

function getCustomerCardsData(phone) {
  const p      = normalizePhone(phone);
  const sh     = getSheet('StampCards');
  const data   = sh.getDataRange().getValues();
  const cards  = getSheet('Cards').getDataRange().getValues();
  // خريطة البطاقات
  const cardMap = {};
  for (let i = 1; i < cards.length; i++) {
    if (cards[i][4] === true || cards[i][4] === 'TRUE')
      cardMap[String(cards[i][0])] = { name: cards[i][1], stampsRequired: Number(cards[i][2]) || 10, reward: cards[i][3] };
  }
  const result = [];
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) !== p) continue;
    const cId = String(data[i][1]);
    const def = cardMap[cId];
    if (!def) continue;
    result.push({
      cardId:         cId,
      name:           def.name,
      stampsRequired: def.stampsRequired,
      reward:         def.reward,
      stampCount:     Number(data[i][2]) || 0,
      pendingStamp:   data[i][3] === true || data[i][3] === 'TRUE',
      pendingReward:  data[i][4] === true || data[i][4] === 'TRUE',
    });
  }
  // إضافة البطاقات اللي العميل ملهاش صف بعد (تظهر فاضية)
  Object.keys(cardMap).forEach(cId => {
    if (!result.find(r => r.cardId === cId)) {
      result.push({ cardId: cId, name: cardMap[cId].name, stampsRequired: cardMap[cId].stampsRequired,
        reward: cardMap[cId].reward, stampCount: 0, pendingStamp: false, pendingReward: false });
    }
  });
  return result;
}

function getCustomerCards(phone) {
  if (!phone) return { success: false, message: 'ادخل رقم التليفون' };
  return { success: true, cards: getCustomerCardsData(phone) };
}

// إضافة ختم لبطاقة معينة (من الأدمن)
function addStampToCard(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };

  const ph     = normalizePhone(p.phone);
  const cardId = p.cardId;
  if (!cardId) return { success: false, message: 'اختار البطاقة' };

  // تحقق من البطاقة
  const cardsSh  = getSheet('Cards');
  const cardsData = cardsSh.getDataRange().getValues();
  let cardDef = null;
  for (let i = 1; i < cardsData.length; i++) {
    if (String(cardsData[i][0]) === String(cardId)) { cardDef = cardsData[i]; break; }
  }
  if (!cardDef) return { success: false, message: 'البطاقة مش موجودة' };
  if (cardDef[4] !== true && cardDef[4] !== 'TRUE') return { success: false, message: 'البطاقة دي متوقفة' };

  const stampsRequired = Number(cardDef[2]) || 10;
  const sh   = getSheet('StampCards');
  let found  = findCustomerCard(ph, cardId);

  if (!found) {
    const row = sh.getLastRow() + 1;
    writePhone(sh, row, 1, ph);
    sh.getRange(row, 2).setValue(cardId);
    sh.getRange(row, 3).setValue(1);
    sh.getRange(row, 4).setValue(false);
    sh.getRange(row, 5).setValue(false);
    sh.getRange(row, 6).setValue(new Date());
    return { success: true, message: 'تمت إضافة الختم الأول ✅', stamps: 1, completed: false };
  }

  let newCount  = (found.data[2] || 0) + 1;
  let completed = false;
  if (newCount >= stampsRequired) { newCount = stampsRequired; completed = true; }
  sh.getRange(found.row, 3).setValue(newCount);
  sh.getRange(found.row, 4).setValue(false);
  return {
    success: true,
    message: completed ? `🎉 اكتملت البطاقة "${cardDef[1]}"!` : `تمت الإضافة — الختم رقم ${newCount}`,
    stamps: newCount,
    completed
  };
}

// طلب مكافأة بطاقة (من العميل)
function requestCardReward(p) {
  const ph     = normalizePhone(p.phone);
  const cardId = p.cardId;
  if (!ph || !cardId) return { success: false, message: 'بيانات ناقصة' };

  const found = findCustomerCard(ph, cardId);
  if (!found) return { success: false, message: 'مفيش أختام على البطاقة دي' };

  const cardsSh   = getSheet('Cards');
  const cardsData = cardsSh.getDataRange().getValues();
  let stampsReq   = 10;
  for (let i = 1; i < cardsData.length; i++) {
    if (String(cardsData[i][0]) === String(cardId)) { stampsReq = Number(cardsData[i][2]) || 10; break; }
  }

  if ((found.data[2] || 0) < stampsReq) return { success: false, message: 'لسه ماكملتش الأختام' };
  if (found.data[4] === true || found.data[4] === 'TRUE') return { success: false, message: 'طلبك قيد المراجعة' };

  getSheet('StampCards').getRange(found.row, 5).setValue(true);
  return { success: true, message: 'تم إرسال طلب المكافأة للأدمن ✅' };
}

// طلبات مكافآت البطاقات المعلقة (للأدمن)
function getPendingCardRewards(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };

  const sh      = getSheet('StampCards');
  const data    = sh.getDataRange().getValues();
  const cardsSh = getSheet('Cards');
  const cardsData = cardsSh.getDataRange().getValues();
  const cardMap = {};
  for (let i = 1; i < cardsData.length; i++)
    cardMap[String(cardsData[i][0])] = cardsData[i][1];

  const custSh   = getSheet('Customers');
  const custData = custSh.getDataRange().getValues();
  const custMap  = {};
  for (let i = 1; i < custData.length; i++)
    custMap[normalizePhone(String(custData[i][0]))] = custData[i][1];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === true || data[i][4] === 'TRUE') {
      const ph = normalizePhone(String(data[i][0]));
      list.push({
        phone:    ph,
        name:     custMap[ph] || ph,
        cardId:   String(data[i][1]),
        cardName: cardMap[String(data[i][1])] || '',
        stamps:   Number(data[i][2]) || 0,
      });
    }
  }
  return { success: true, rewards: list };
}

function approveCardReward(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findCustomerCard(normalizePhone(p.phone), p.cardId);
  if (!found) return { success: false, message: 'مش موجود' };
  const sh = getSheet('StampCards');
  sh.getRange(found.row, 3).setValue(0);
  sh.getRange(found.row, 5).setValue(false);
  return { success: true, message: '🎉 تمت الموافقة — البطاقة بدأت من جديد' };
}

function rejectCardReward(p) {
  const auth = authorize(p, 'موافقة خصومات');
  if (!auth.ok) return { success: false, message: auth.message };
  const found = findCustomerCard(normalizePhone(p.phone), p.cardId);
  if (!found) return { success: false, message: 'مش موجود' };
  getSheet('StampCards').getRange(found.row, 5).setValue(false);
  return { success: true, message: 'تم الرفض' };
}

// ============================================================
//  USERS
// ============================================================
function getUsersSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sh = ss.getSheetByName('Users');
  if (!sh) {
    sh = ss.insertSheet('Users');
    sh.appendRow(['Name','Pass','Role','Branch','Perms','CreatedAt']);
  }
  return sh;
}

function verifyMainAdmin(password) {
  if (password !== CONFIG.ADMIN_PASSWORD) return { success: false, message: 'باسورد غلط' };
  return { success: true };
}

function getUsers(p) {
  const auth = authorize(p, 'إدارة المستخدمين');
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getUsersSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++)
    list.push({ name: data[i][0], role: data[i][2], branch: data[i][3], perms: data[i][4] });
  return { success: true, users: list };
}

function addUser(p) {
  const auth = authorize(p, 'إدارة المستخدمين');
  if (!auth.ok) return { success: false, message: auth.message };
  const { name, pass, role, perms } = p;
  if (!name || !pass || !role) return { success: false, message: 'ادخل كل البيانات' };
  getUsersSheet().appendRow([name, pass, role, '', perms || '', new Date()]);
  return { success: true, message: `تم إضافة ${name}` };
}

function deleteUser(p) {
  const auth = authorize(p, 'إدارة المستخدمين');
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getUsersSheet();
  const data = sh.getDataRange().getValues();
  const idx  = parseInt(p.index, 10);
  if (isNaN(idx) || idx < 1 || idx >= data.length) return { success: false, message: 'index غلط' };
  sh.deleteRow(idx + 1);
  return { success: true, message: 'تم الحذف' };
}

function updateUserPass(p) {
  const auth = authorize(p, 'إدارة المستخدمين');
  if (!auth.ok) return { success: false, message: auth.message };
  if (!p.newPass) return { success: false, message: 'ادخل الباسورد الجديد' };
  const sh  = getUsersSheet();
  const idx = parseInt(p.index, 10);
  if (isNaN(idx) || idx < 1) return { success: false, message: 'index غلط' };
  sh.getRange(idx + 1, 2).setValue(p.newPass);
  return { success: true, message: 'تم تحديث الباسورد' };
}

function getUserNames() {
  const sh   = getUsersSheet();
  const data = sh.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++)
    if (data[i][0]) list.push({ name: data[i][0], role: data[i][2] });
  return { success: true, users: list };
}

function verifyUser(name, pass) {
  const sh   = getUsersSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(name) && String(data[i][1]) === String(pass)) {
      return { success: true, user: { name: data[i][0], role: data[i][2], branch: data[i][3], perms: data[i][4] } };
    }
  }
  return { success: false, message: 'اسم المستخدم أو الباسورد غلط' };
}

// ============================================================
//  SETTINGS
// ============================================================
function getSettingsSheet() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sh = ss.getSheetByName('Settings');
  if (!sh) {
    sh = ss.insertSheet('Settings');
    sh.appendRow(['Key', 'Value']);
    sh.appendRow(['discount',  CONFIG.DISCOUNT]);
    sh.appendRow(['threshold', CONFIG.THRESHOLD]);
  }
  return sh;
}

function getCurrentDiscount() {
  const sh   = getSettingsSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++)
    if (data[i][0] === 'discount' && data[i][1]) return Number(data[i][1]);
  return CONFIG.DISCOUNT;
}

function getCurrentThreshold() {
  const sh   = getSettingsSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++)
    if (data[i][0] === 'threshold' && data[i][1]) return Number(data[i][1]);
  return CONFIG.THRESHOLD;
}

function getSettings(p) {
  const auth = authorize(p, null);
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getSettingsSheet();
  const data = sh.getDataRange().getValues();
  const s    = {};
  for (let i = 1; i < data.length; i++) s[data[i][0]] = data[i][1];
  return { success: true, discount: s['discount'] || CONFIG.DISCOUNT, threshold: s['threshold'] || CONFIG.THRESHOLD };
}

function saveSettings(p) {
  const auth = authorize(p, null);
  if (!auth.ok) return { success: false, message: auth.message };
  const sh   = getSettingsSheet();
  const data = sh.getDataRange().getValues();
  let dRow = -1, tRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'discount')  dRow = i + 1;
    if (data[i][0] === 'threshold') tRow = i + 1;
  }
  if (p.discount !== undefined && p.discount !== '') {
    const v = parseFloat(p.discount);
    if (!isNaN(v) && v > 0 && v <= 100) {
      if (dRow > 0) sh.getRange(dRow, 2).setValue(v); else sh.appendRow(['discount', v]);
    }
  }
  if (p.threshold !== undefined && p.threshold !== '') {
    const v = parseFloat(p.threshold);
    if (!isNaN(v) && v > 0) {
      if (tRow > 0) sh.getRange(tRow, 2).setValue(v); else sh.appendRow(['threshold', v]);
    }
  }
  return { success: true, message: 'تم حفظ الإعدادات ✅' };
}
