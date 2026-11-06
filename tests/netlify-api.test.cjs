const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../netlify/functions/api.js'), 'utf8');
const state = {vehicles:[], slots:[], bookings:[]};

function createHandler(fetch) {
  const context = {exports:{}, fetch};
  vm.runInNewContext(source, context);
  return context.exports.handler;
}

async function main() {
  const neverFetch = () => { throw new Error('Unexpected network call'); };
  const handler = createHandler(neverFetch);
  assert.equal((await handler({httpMethod:'GET'})).statusCode, 405);
  for (const body of ['{', 'null', '[]', '{}', '{"action":"setup"}']) {
    assert.equal((await handler({httpMethod:'POST', body})).statusCode, 400);
  }

  const booking = {action:'book', payload:{booking:{name:'Học viên thử', teacher:'Giáo viên thử', date:'2099-01-01', vehicleId:'v1', slotIds:['s1','s2']}}};
  let forwarded = 0;
  const save = createHandler(async (url, options) => {
    forwarded++;
    assert.match(url, /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/);
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), booking);
    return {ok:true, json:async () => state};
  });
  const success = await save({httpMethod:'POST', body:JSON.stringify(booking)});
  assert.equal(success.statusCode, 200);
  assert.equal(forwarded, 1);
  assert.deepEqual(JSON.parse(success.body), state);
  assert.equal(success.headers['Cache-Control'], 'no-store');

  const cases = [
    {reply:{ok:true, json:async () => ({error:'Xe đã được đặt.'})}, status:400, text:'Xe đã được đặt.'},
    {reply:{ok:true, json:async () => ({status:'success', maDangKy:'CT-1'})}, status:502, text:'Apps Script'},
    {reply:{ok:true, json:async () => null}, status:502, text:'Apps Script'},
    {reply:{ok:false, json:async () => ({error:'unavailable'})}, status:502, text:'chưa sẵn sàng'},
    {reply:{ok:true, json:async () => { throw new SyntaxError('HTML login page'); }}, status:502, text:'Không kết nối'}
  ];
  for (const item of cases) {
    const result = await createHandler(async () => item.reply)({httpMethod:'POST', body:JSON.stringify(booking)});
    assert.equal(result.statusCode, item.status);
    assert.ok(JSON.parse(result.body).error.includes(item.text));
  }
  const disconnected = await createHandler(async () => { throw new Error('offline'); })({httpMethod:'POST', body:JSON.stringify(booking)});
  assert.equal(disconnected.statusCode, 502);
  console.log('PASS: input validation, booking forwarding, API errors, incompatible Apps Script, HTML responses and network failure. No live bookings created.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
