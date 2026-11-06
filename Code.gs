/* Chạy setup() một lần trước khi triển khai ứng dụng web. */
function setup() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('DATA_FILE_ID')) {
    var vehicles = [];
    ['B.01', 'B', 'C1'].forEach(function(c, j) {
      for (var i = 1; i <= (j === 0 ? 5 : 7); i++) vehicles.push({id: Utilities.getUuid(), category: c, name: c + ' · Xe ' + ('0' + i).slice(-2)});
    });
    var file = DriveApp.createFile('dat-lich-xe.json', JSON.stringify({vehicles: vehicles, slots: [{id:'s1', start:'06:00', end:'07:00'}, {id:'s2', start:'07:00', end:'08:00'}], bookings: []}), MimeType.PLAIN_TEXT);
    p.setProperty('DATA_FILE_ID', file.getId());
  }
  if (!p.getProperty('ADMIN_PASSWORD')) p.setProperty('ADMIN_PASSWORD', Utilities.getUuid());
  console.log('Thiết lập xong. Xem ADMIN_PASSWORD và DATA_FILE_ID trong Project Settings > Script properties.');
}
function doGet() { return HtmlService.createHtmlOutputFromFile('Index').setTitle('Trung tâm đào tạo và sát hạch lái xe Chiến Thắng - Tiền Giang · Đặt lịch tập xe').addMetaTag('viewport', 'width=device-width, initial-scale=1'); }
function api(action, payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var p = PropertiesService.getScriptProperties();
    if (!p.getProperty('DATA_FILE_ID')) throw new Error('Quản trị cần chạy setup() trước.');
    var file = DriveApp.getFileById(p.getProperty('DATA_FILE_ID'));
    var db = JSON.parse(file.getBlob().getDataAsString());
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
      b.slotIds.forEach(function(id) {
        var slot = db.slots.find(function(s){return s.id === id;});
        db.bookings.push({id:Utilities.getUuid(), name:b.name.trim(), teacher:b.teacher.trim(), date:b.date, vehicleId:b.vehicleId, vehicleName:vehicle.name, category:vehicle.category, slotId:id, start:slot.start, end:slot.end, createdAt:new Date().toISOString()});
      });
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
      db.bookings = db.bookings.filter(function(b){return b.id !== payload.id;});
    } else if (action !== 'state' && action !== 'admin') throw new Error('Yêu cầu không hợp lệ.');
    if (['state','admin'].indexOf(action) < 0) file.setContent(JSON.stringify(db));
    return {vehicles:db.vehicles, slots:db.slots.sort(function(a,b){return a.start.localeCompare(b.start);}), bookings:admin ? db.bookings : db.bookings.map(function(b){return {date:b.date, vehicleId:b.vehicleId, slotId:b.slotId};})};
  } finally { lock.releaseLock(); }
}
