const express = require('express');
const router = express.Router();
const { getConn } = require('../db');

// GET dining_tables
router.get('/', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query('SELECT * FROM dining_tables ORDER BY table_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const conn = getConn();

    await conn.query(
      'UPDATE dining_tables SET status = ? WHERE table_id = ?',
      [status, req.params.id]
    );

    res.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;