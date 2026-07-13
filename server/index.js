const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ponytail: JSON 文件做持久层，并发写会丢数据、单文件无限增长。
// 流量上来后换成 SQLite 或 PostgreSQL。
const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const API_KEY = process.env.API_KEY || '';

// 简易 API Key 鉴权中间件
function authMiddleware(req, res, next) {
  const token = req.headers['x-api-key'] || req.query.api_key;
  if (token === API_KEY) return next();
  res.status(401).json({ code: 1, message: 'unauthorized' });
}
function ensureDataFile(){
  const dir = path.dirname(DATA_FILE);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ records: [], contents: [] }, null, 2));
}
function readData(){ ensureDataFile(); return JSON.parse(fs.readFileSync(DATA_FILE)); }
function writeData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api', authMiddleware);

ensureDataFile();

// POST /api/v1/report
app.post('/api/v1/report', (req, res) => {
  try{
    const body = req.body || {};
    const d = readData();
    const record = {
      record_id: 'r_' + uuidv4(),
      user_id: body.user_id || null,
      timestamp: body.timestamp || new Date().toISOString(),
      lat: body.lat || null,
      lng: body.lng || null,
      address: body.address || '',
      result: body.result || 'failure',
      summary_text: body.summary || '',
      screenshot_url: body.screenshot_url || null,
      uploaded_at: new Date().toISOString()
    };
    d.records.unshift(record);
    writeData(d);
    res.json({ code: 0, record_id: record.record_id });
  }catch(err){
    console.error(err);
    res.status(500).json({ code: 1, message: 'internal error' });
  }
});

// GET /api/v1/records
app.get('/api/v1/records', (req, res) => {
  const { user_id, page = 1, size = 20 } = req.query;
  const d = readData();
  let records = d.records;
  if(user_id) records = records.filter(r => r.user_id === user_id);
  const p = parseInt(page,10); const s = parseInt(size,10);
  const start = (p-1)*s; const end = start + s;
  const pageItems = records.slice(start, end);
  res.json({ code: 0, total: records.length, page: p, size: s, items: pageItems });
});

// POST /api/v1/associate
app.post('/api/v1/associate', (req, res) => {
  // Simple stub: echo success
  const { user_id, gov_account_id } = req.body || {};
  if(!user_id || !gov_account_id) return res.status(400).json({ code:1, message: 'missing params' });
  res.json({ code:0, message: 'associated', user_id, gov_account_id });
});

// GET /api/v1/heatmap
app.get('/api/v1/heatmap', (req, res) => {
  // Very simple aggregation: grid by 0.01 degree
  const { bbox } = req.query; // optional bbox
  const d = readData();
  const cells = {};
  d.records.forEach(r => {
    if(r.lat == null || r.lng == null) return;
    const gx = Math.floor(r.lng / 0.01);
    const gy = Math.floor(r.lat / 0.01);
    const key = `${gx}_${gy}`;
    if(!cells[key]) cells[key] = { cell_id: key, count_success:0, count_failure:0, last_report_at: r.timestamp, center: { lat: (gy+0.5)*0.01, lng: (gx+0.5)*0.01 } };
    if(r.result === 'success') cells[key].count_success++;
    else cells[key].count_failure++;
    if(new Date(r.timestamp) > new Date(cells[key].last_report_at)) cells[key].last_report_at = r.timestamp;
  });
  const list = Object.values(cells).map(c => ({ ...c, heat_value: c.count_success + c.count_failure }));
  res.json({ code:0, cells: list });
});

// GET /api/v1/content/search
app.get('/api/v1/content/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const d = readData();
  const items = (d.contents || []).filter(c => c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q));
  res.json({ code:0, total: items.length, items });
});

// seed some content if empty
function seedContents(){
  const d = readData();
  if(!d.contents || d.contents.length === 0){
    d.contents = [
      { content_id: 'c_law_1', type: 'law', title: '上海市控制吸烟条例（摘要）', body: '第十二条：公共场所禁烟......', tags:['law'], updated_at: new Date().toISOString() },
      { content_id: 'c_faq_1', type: 'faq', title: '遇到烟民不服劝阻怎么办？', body: '建议保持冷静，优先选择拍照并举报......', tags:['faq','safety'], updated_at: new Date().toISOString() }
    ];
    writeData(d);
  }
}
seedContents();

// Simple AI stub endpoint (simulated)
app.post('/api/v1/ai/respond', (req, res) => {
  const { utterance } = req.body || {};
  const replyMap = [
    { match: '活到', reply: '个例不能代表整体，吸烟会增加多种疾病风险。' },
    { match: '自由', reply: '自由不应以损害他人健康为代价，公共场所禁烟是依法规定。' }
  ];
  const u = (utterance || '').toLowerCase();
  const found = replyMap.find(r => u.includes(r.match));
  res.json({ code:0, reply: found ? found.reply : '请您配合维护无烟环境，谢谢。' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`linzezhu server listening on ${PORT}`));
