const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET reservations
router.get('/', async (req, res) => {
  try {
    const conn = getPool();
    const [rows] = await conn.query(`
      SELECT r.*, t.table_name
      FROM reservations r
      JOIN tables t ON r.table_id = t.table_id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE reservation
router.post('/', async (req, res) => {
  try {
    const {
      table_id, firstname, lastname, phone,
      email, date, time, number_of_people
    } = req.body;

    const conn = getPool();

    await conn.query(
      `INSERT INTO reservations
      (table_id, firstname, lastname, phone, email, date, time, number_of_people)
      VALUES (?,?,?,?,?,?,?,?)`,
      [table_id, firstname, lastname, phone, email, date, time, number_of_people]
    );

    await conn.query(
      'UPDATE tables SET status = "reserved" WHERE table_id = ?',
      [table_id]
    );

    res.json({ message: 'จองสำเร็จ' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;