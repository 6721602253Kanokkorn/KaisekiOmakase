const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET tables
router.get('/', async (req, res) => {
  try {
    const conn = getPool();
    const [rows] = await conn.query('SELECT * FROM tables ORDER BY table_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const conn = getPool();

    await conn.query(
      'UPDATE tables SET status = ? WHERE table_id = ?',
      [status, req.params.id]
    );

    res.json({ message: 'อัปเดตสถานะสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;