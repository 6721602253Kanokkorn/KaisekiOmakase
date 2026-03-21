const express     = require('express');
const router      = express.Router();
const { getConn } = require('../db');

// GET /tables
router.get('/', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query('SELECT * FROM dining_tables ORDER BY table_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /tables/:id
router.get('/:id', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query(
      'SELECT * FROM dining_tables WHERE table_id = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'ไม่พบโต๊ะนี้' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /tables/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['available', 'reserved', 'occupied'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็น ${allowed.join(', ')}` });
    }
    const conn = getConn();
    await conn.query(
      'UPDATE dining_tables SET status = ? WHERE table_id = ?', [status, req.params.id]
    );
    res.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
