const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTwpKzSpVCHn7cs2nBr_NNcsAAEE6lA8PZs7XeGku74in9SBmbqy33YGD21oy3SkGo/exec';
const ALLOWED_ACTIONS = new Set(['state', 'admin', 'book', 'vehicle', 'slot', 'deleteBooking']);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, {error:'Phương thức không được hỗ trợ.'});
  }

  let request;
  try {
    request = JSON.parse(event.body || '{}');
  } catch (error) {
    return response(400, {error:'Yêu cầu không hợp lệ.'});
  }

  if (!request || !ALLOWED_ACTIONS.has(request.action)) {
    return response(400, {error:'Yêu cầu không hợp lệ.'});
  }

  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(request)
    });
    const result = await upstream.json();
    if (!upstream.ok) return response(502, {error:'Máy chủ đặt lịch chưa sẵn sàng. Vui lòng thử lại.'});
    if (result && result.error) return response(400, {error:result.error});
    if (!result || !Array.isArray(result.vehicles) || !Array.isArray(result.slots) || !Array.isArray(result.bookings)) {
      return response(502, {error:'Apps Script chưa đúng phiên bản của website. Vui lòng cập nhật TrienKhai.gs và triển khai phiên bản mới.'});
    }
    return response(200, result);
  } catch (error) {
    return response(502, {error:'Không kết nối được hệ thống đặt lịch. Vui lòng thử lại.'});
  }
};

function response(statusCode, body) {
  return {
    statusCode:statusCode,
    headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},
    body:JSON.stringify(body)
  };
}
