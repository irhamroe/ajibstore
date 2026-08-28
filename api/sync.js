// Vercel Serverless Function for live cross-device state sync
let inMemoryState = null;

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    if (body) {
      inMemoryState = body;
    }
    return res.status(200).json({ success: true, data: inMemoryState });
  }

  return res.status(200).json({ success: true, data: inMemoryState });
};
