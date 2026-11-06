/* Chạy setup() một lần trước khi triển khai ứng dụng web. */
var BOOKING_HEADERS = ['Mã đăng ký', 'Ngày tập', 'Giờ tập', 'Học viên', 'Thầy', 'Hạng xe', 'Biển số xe', 'Mã xe', 'Mã khung giờ', 'Thời điểm đăng ký'];
var TARGET_BOOKING_SHEET_ID = '19xq611MGY32ztxaOQ1ekJwogb8CisCwAJD9byqm_xlQ';
function targetBookingSheet(initialize) {
  var spreadsheet = SpreadsheetApp.openById(TARGET_BOOKING_SHEET_ID);
  var sheet = spreadsheet.getSheets().find(function(s) { return s.getSheetId() === 0; });
  if (!sheet) throw new Error('Không tìm thấy trang tính gid=0 trong bảng đăng ký.');
  if (sheet.getLastRow() === 0 && initialize) {
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.hideColumns(1);
    sheet.hideColumns(8, 3);
  }
  var headers = sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).getValues()[0];
  if (headers.some(function(h, i) { return h !== BOOKING_HEADERS[i]; })) throw new Error('Trang tính gid=0 chưa có đúng tiêu đề cột. Sao lưu dữ liệu sẵn có và chạy setup() trên trang tính trống; ứng dụng không ghi đè dữ liệu khác.');
  return sheet;
}
function vehiclePlate(category, name) {
  var prefix = category + ' · ';
  name = String(name || '');
  return name.indexOf(prefix) === 0 ? name.slice(prefix.length) : name;
}
function bookingToRow(booking) {
  return [booking.id, booking.date, booking.start + ' – ' + booking.end, booking.name, booking.teacher, booking.category, vehiclePlate(booking.category, booking.vehicleName), booking.vehicleId, booking.slotId, booking.createdAt];
}
function readBookings(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, BOOKING_HEADERS.length).getValues().filter(function(row) { return row[0]; }).map(function(row) {
    var times = String(row[2]).split(' – ');
    return {id:String(row[0]), date:row[1] instanceof Date ? Utilities.formatDate(row[1], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(row[1]), start:times[0] || '', end:times[1] || '', name:String(row[3]), teacher:String(row[4]), category:String(row[5]), vehicleName:String(row[6]), vehicleId:String(row[7]), slotId:String(row[8]), createdAt:row[9] instanceof Date ? row[9].toISOString() : String(row[9] || '')};
  });
}
function appendBookings(sheet, bookings) {
  if (!bookings.length) return;
  var rows = bookings.map(bookingToRow).map(function(row) {
    return row.map(function(value) { return typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : value; });
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, bookings.length, BOOKING_HEADERS.length).setNumberFormat('@').setValues(rows);
  SpreadsheetApp.flush();
}
function deleteBookingRow(sheet, id) {
  if (sheet.getLastRow() < 2) return;
  var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) sheet.deleteRow(i + 2);
}
function setup() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
  var p = PropertiesService.getScriptProperties();
  var sheet = targetBookingSheet(true);
  if (!p.getProperty('DATA_FILE_ID')) {
    var vehicles = [];
    ['B.01', 'B', 'C1'].forEach(function(c, j) {
      for (var i = 1; i <= (j === 0 ? 5 : 7); i++) vehicles.push({id: Utilities.getUuid(), category: c, name: 'Xe ' + ('0' + i).slice(-2)});
    });
    var file = DriveApp.createFile('dat-lich-xe.json', JSON.stringify({vehicles: vehicles, slots: [{id:'s1', start:'06:00', end:'07:00'}, {id:'s2', start:'07:00', end:'08:00'}], bookings: []}), MimeType.PLAIN_TEXT);
    p.setProperty('DATA_FILE_ID', file.getId());
  }
  var dataFile = DriveApp.getFileById(p.getProperty('DATA_FILE_ID'));
  var db = JSON.parse(dataFile.getBlob().getDataAsString());
  db.vehicles = db.vehicles.map(function(v) { return {id:v.id, category:v.category, name:vehiclePlate(v.category, v.name)}; });
  var previousId = p.getProperty('BOOKING_SHEET_ID');
  var previousBookings = db.bookings || [];
  if (previousId && previousId !== TARGET_BOOKING_SHEET_ID) {
    var previousSheet = SpreadsheetApp.openById(previousId).getSheetByName('Đăng ký');
    if (!previousSheet) throw new Error('Không tìm thấy trang Đăng ký trong Sheet cũ. Chưa chuyển dữ liệu.');
    previousBookings = previousBookings.concat(readBookings(previousSheet));
  }
  var existingIds = new Set(readBookings(sheet).map(function(b) { return b.id; }));
  var migrate = previousBookings.filter(function(b) {
    if (existingIds.has(b.id)) return false;
    existingIds.add(b.id);
    return true;
  });
  appendBookings(sheet, migrate);
  p.setProperty('BOOKING_SHEET_ID', TARGET_BOOKING_SHEET_ID);
  db.bookings = [];
  dataFile.setContent(JSON.stringify(db));
  if (!p.getProperty('ADMIN_PASSWORD')) p.setProperty('ADMIN_PASSWORD', Utilities.getUuid());
  console.log('Thiết lập xong. Lịch đăng ký lưu tại https://docs.google.com/spreadsheets/d/' + TARGET_BOOKING_SHEET_ID + '/edit#gid=0. Đã chuyển ' + migrate.length + ' lượt cũ.');
  } finally { lock.releaseLock(); }
}
function doGet() { return HtmlService.createHtmlOutputFromFile('Index').setTitle('Trung tâm đào tạo và sát hạch lái xe Chiến Thắng - Tiền Giang · Đặt lịch tập xe').addMetaTag('viewport', 'width=device-width, initial-scale=1'); }
function doPost(e) {
  var result;
  try {
    var request = JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (!request.action) throw new Error('Yêu cầu không hợp lệ.');
    result = api(request.action, request.payload || {});
  } catch (error) {
    result = {error:error && error.message ? error.message : 'Không thể xử lý yêu cầu.'};
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
function api(action, payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var p = PropertiesService.getScriptProperties();
    if (!p.getProperty('DATA_FILE_ID') || !p.getProperty('BOOKING_SHEET_ID')) throw new Error('Quản trị cần chạy setup() trước.');
    var file = DriveApp.getFileById(p.getProperty('DATA_FILE_ID'));
    var db = JSON.parse(file.getBlob().getDataAsString());
    db.vehicles = db.vehicles.map(function(v) { return {id:v.id, category:v.category, name:vehiclePlate(v.category, v.name)}; });
    if (p.getProperty('BOOKING_SHEET_ID') !== TARGET_BOOKING_SHEET_ID) throw new Error('Quản trị cần chạy setup() để kết nối bảng Google Sheets mới.');
    var sheet = targetBookingSheet(false);
    db.bookings = readBookings(sheet);
    var admin = payload.password && payload.password === p.getProperty('ADMIN_PASSWORD');
    if (['admin','vehicle','slot','deleteBooking'].indexOf(action) >= 0 && !admin) throw new Error('Mật khẩu quản trị không đúng.');
    if (action === 'book') {
      var b = payload.booking || {};
      if (!b.name || !b.teacher || b.name.trim().length > 100 || b.teacher.trim().length > 100) throw new Error('Nhập tên học viên và giáo viên (tối đa 100 ký tự).');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || isNaN(Date.parse(b.date)) || new Date(b.date).toISOString().slice(0,10) !== b.date || b.date < Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd')) throw new Error('Ngày đăng ký không hợp lệ hoặc đã qua.');
      if (!db.vehicles.some(function(v){return v.id === b.vehicleId;})) throw new Error('Xe không còn tồn tại.');
      if (!Array.isArray(b.slotIds) || b.slotIds.length < 1 || b.slotIds.length > 2 || new Set(b.slotIds).size !== b.slotIds.length) throw new Error('Chọn từ 1 đến 2 khung giờ.');
      b.slotIds.forEach(function(id) {
        var slot = db.slots.find(function(s){return s.id === id;});
        if (!slot) throw new Error('Khung giờ đã thay đổi. Vui lòng tải lại.');
        if (b.date === Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') && slot.start <= Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm')) throw new Error('Khung giờ này đã bắt đầu.');
        if (db.bookings.some(function(x){return x.date === b.date && x.vehicleId === b.vehicleId && x.slotId === id;})) throw new Error('Xe vừa được đặt trong khung giờ này. Hãy chọn lại.');
      });
      var vehicle = db.vehicles.find(function(v){return v.id === b.vehicleId;});
      var newBookings = [];
      b.slotIds.forEach(function(id) {
        var slot = db.slots.find(function(s){return s.id === id;});
        newBookings.push({id:Utilities.getUuid(), name:b.name.trim(), teacher:b.teacher.trim(), date:b.date, vehicleId:b.vehicleId, vehicleName:vehicle.name, category:vehicle.category, slotId:id, start:slot.start, end:slot.end, createdAt:new Date().toISOString()});
      });
      appendBookings(sheet, newBookings);
      db.bookings = db.bookings.concat(newBookings);
    } else if (action === 'vehicle' || action === 'slot') {
      var list = action === 'vehicle' ? db.vehicles : db.slots;
      var item = payload.item || {};
      var idx = list.findIndex(function(x){return x.id === item.id;});
      if (payload.remove) {
        if (idx < 0) throw new Error('Không tìm thấy dữ liệu.');
        if (db.bookings.some(function(b){return b.date >= Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh','yyyy-MM-dd') && (action === 'vehicle' ? b.vehicleId : b.slotId) === item.id;})) throw new Error('Đang có lịch đặt. Hãy hủy lịch trước khi xóa.');
        list.splice(idx,1);
      } else {
        var clean;
        if (action === 'vehicle') {
          if (!item.name || item.name.trim().length > 80 || ['B.01','B','C1'].indexOf(item.category) < 0) throw new Error('Thông tin xe không hợp lệ.');
          clean = {id:idx >= 0 ? item.id : Utilities.getUuid(), name:item.name.trim(), category:item.category};
        } else {
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.start || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.end || '') || item.start >= item.end) throw new Error('Giờ bắt đầu phải trước giờ kết thúc.');
          if (list.some(function(s){return s.id !== item.id && s.start < item.end && item.start < s.end;})) throw new Error('Khung giờ bị chồng lấn.');
          if (idx >= 0 && db.bookings.some(function(b){return b.slotId === item.id && b.date >= Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');})) throw new Error('Khung giờ đang có lịch đặt. Hãy hủy lịch trước khi sửa.');
          clean = {id:idx >= 0 ? item.id : Utilities.getUuid(), start:item.start, end:item.end};
        }
        if (idx >= 0) list[idx] = clean; else list.push(clean);
      }
    } else if (action === 'deleteBooking') {
      deleteBookingRow(sheet, payload.id);
      db.bookings = db.bookings.filter(function(b){return b.id !== payload.id;});
    } else if (action !== 'state' && action !== 'admin') throw new Error('Yêu cầu không hợp lệ.');
    if (action === 'vehicle' || action === 'slot') file.setContent(JSON.stringify({vehicles:db.vehicles, slots:db.slots, bookings:[]}));
    return {vehicles:db.vehicles, slots:db.slots.sort(function(a,b){return a.start.localeCompare(b.start);}), bookings:admin ? db.bookings : db.bookings.map(function(b){return {date:b.date, vehicleId:b.vehicleId, slotId:b.slotId};})};
  } finally { lock.releaseLock(); }
}
