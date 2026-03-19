const express = require('express');
const router = express.Router();
const { getConn } = require('../db');

// GET reservations
router.get('/', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query(`
      SELECT r.*, dt.table_number, c.firstname, c.lastname
      FROM reservation r
      JOIN dining_tables dt ON r.table_id = dt.table_id
      JOIN customer c ON r.customer_id = c.customer_id
      ORDER BY r.create_at DESC
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
      table_id, customer_id,
      reservation_date, reservation_time,
      number_of_people, special_request
    } = req.body;

    const conn = getConn();

    await conn.query(
      `INSERT INTO reservation
      (table_id, customer_id, reservation_date, reservation_time, number_of_people, special_request, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [table_id, customer_id, reservation_date, reservation_time, number_of_people, special_request || null]
    );

    // อัปเดตสถานะโต๊ะเป็น reserved
    await conn.query(
      'UPDATE dining_tables SET status = "reserved" WHERE table_id = ?',
      [table_id]
    );

    res.json({ message: 'จองสำเร็จ' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;