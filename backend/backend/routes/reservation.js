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

// DELETE /reservations/:id
router.delete('/:id', async (req, res) => {
  try {
    const conn = getConn();
    const { id } = req.params;

    // ดึง table_id ก่อนลบ เพื่อคืนสถานะโต๊ะ
    const [rows] = await conn.query(
      'SELECT table_id FROM reservation WHERE reservation_id = ?', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'ไม่พบการจองนี้' });

    const table_id = rows[0].table_id;

    // ลบการจอง
    await conn.query(
      'DELETE FROM reservation WHERE reservation_id = ?', [id]
    );

    // คืนสถานะโต๊ะเป็น available
    await conn.query(
      'UPDATE dining_tables SET status = "available" WHERE table_id = ?',
      [table_id]
    );

    res.json({ message: 'ลบการจองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// PATCH /reservations/:id
router.patch('/:id', async (req, res) => {
  try {
    const conn = getConn();
    const { id } = req.params;
    const { status } = req.body;

    // เช็คค่า status ที่อนุญาต
    const allowed = ['pending', 'confirmed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็น ${allowed.join(', ')}` });
    }

    // เช็คว่า reservation มีอยู่จริง
    const [rows] = await conn.query(
      'SELECT * FROM reservation WHERE reservation_id = ?', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'ไม่พบการจองนี้' });

    const table_id = rows[0].table_id;

    // อัปเดต status การจอง
    await conn.query(
      'UPDATE reservation SET status = ? WHERE reservation_id = ?',
      [status, id]
    );

    // ซิงค์สถานะโต๊ะตาม status การจอง
    const tableStatus = {
      pending:   'reserved',
      confirmed: 'reserved',
      cancelled: 'available'
    }[status];

    await conn.query(
      'UPDATE dining_tables SET status = ? WHERE table_id = ?',
      [tableStatus, table_id]
    );

    res.json({ message: `อัปเดตสถานะเป็น ${status} สำเร็จ` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }

  // PATCH /reservations/:id
router.patch('/:id', async (req, res) => {
  try {
    const conn = getConn();
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'confirmed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็น ${allowed.join(', ')}` });
    }

    const [rows] = await conn.query(
      'SELECT * FROM reservation WHERE reservation_id = ?', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'ไม่พบการจองนี้' });

    await conn.query(
      'UPDATE reservation SET status = ? WHERE reservation_id = ?',
      [status, id]
    );

    const tableStatus = {
      pending:   'reserved',
      confirmed: 'reserved',
      cancelled: 'available'
    }[status];

    await conn.query(
      'UPDATE dining_tables SET status = ? WHERE table_id = ?',
      [tableStatus, rows[0].table_id]
    );

    res.json({ message: `อัปเดตสถานะเป็น ${status} สำเร็จ` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
});

module.exports = router;