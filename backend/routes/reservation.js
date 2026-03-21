const express     = require('express');
const router      = express.Router();
const { getConn } = require('../db');
const jwt         = require('jsonwebtoken');
const nodemailer  = require('nodemailer');

const SECRET = 'omakase_secret_key';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bbaitoeytoeyy2234@gmail.com',      // ← เปลี่ยนเป็น Gmail ของคุณ
    pass: 'gnvw cgrf uiru obni'  // ← App Password 16 หลัก
  },
  tls: { rejectUnauthorized: false }
});

function getUserId(req) {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    return jwt.verify(token, SECRET).user_id;
  } catch { return null; }
}

// GET /reservations — ดูทั้งหมด
router.get('/', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query(`
      SELECT r.*, dt.table_number, c.firstname, c.lastname
      FROM reservation r
      JOIN dining_tables dt ON r.table_id    = dt.table_id
      JOIN customer      c  ON r.customer_id = c.customer_id
      ORDER BY r.create_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /reservations/my — ดูการจองของตัวเอง
router.get('/my', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });

    const conn = getConn();
    const [userRows] = await conn.query(
      'SELECT customer_id FROM users WHERE user_id = ?', [userId]
    );
    if (!userRows.length) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const [rows] = await conn.query(`
      SELECT r.*, dt.table_number
      FROM reservation r
      JOIN dining_tables dt ON r.table_id = dt.table_id
      WHERE r.customer_id = ?
      ORDER BY r.create_at DESC
    `, [userRows[0].customer_id]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /reservations/:id — ดูการจองอันเดียว
router.get('/:id', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query(`
      SELECT r.*, dt.table_number, c.firstname, c.lastname
      FROM reservation r
      JOIN dining_tables dt ON r.table_id    = dt.table_id
      JOIN customer      c  ON r.customer_id = c.customer_id
      WHERE r.reservation_id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ message: 'ไม่พบการจองนี้' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /reservations — จองโต๊ะ
router.post('/', async (req, res) => {
  try {
    const { table_id, date, time, number_of_people, special_request, email, firstname, lastname } = req.body;

    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });

    const conn = getConn();

    const [userRows] = await conn.query(
      'SELECT customer_id FROM users WHERE user_id = ?', [userId]
    );
    if (!userRows.length) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const customer_id = userRows[0].customer_id;

    const [tableRows] = await conn.query(
      'SELECT * FROM dining_tables WHERE table_id = ?', [table_id]
    );
    if (!tableRows.length) return res.status(404).json({ message: 'ไม่พบโต๊ะนี้' });
    if (tableRows[0].status !== 'available') {
      return res.status(400).json({ message: 'โต๊ะนี้ไม่ว่างแล้ว' });
    }

    await conn.query(
      `INSERT INTO reservation
       (table_id, customer_id, reservation_date, reservation_time, number_of_people, special_request, status, create_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [table_id, customer_id, date, time, number_of_people, special_request || null]
    );

    await conn.query(
      'UPDATE dining_tables SET status = "reserved" WHERE table_id = ?', [table_id]
    );

    // ส่งอีเมล
    if (email) {
      try {
        await transporter.sendMail({
          from:    '"Kaiseki Omakase" <your@gmail.com>',
          to:      email,
          subject: 'ยืนยันการจองโต๊ะ – Kaiseki Omakase',
          html: `
            <div style="background:#0a0a0a;max-width:520px;margin:auto;border-radius:10px;overflow:hidden;border:1px solid #1e1e1e;font-family:sans-serif;">
              <div style="background:#000;padding:32px 40px 24px;border-bottom:1px solid #1a1a1a;">
                <p style="font-size:11px;letter-spacing:4px;color:#8a6a2a;margin:0 0 6px;">KAISEKI OMAKASE</p>
                <h1 style="font-size:24px;font-weight:400;color:#fff5e2;margin:0;letter-spacing:3px;">ยืนยันการจองโต๊ะ</h1>
              </div>
              <div style="padding:32px 40px;">
                <p style="font-size:14px;color:#aaa;margin:0 0 24px;line-height:1.8;">
                  สวัสดีคุณ <span style="color:#fff5e2;font-weight:500;">${firstname} ${lastname}</span><br>
                  การจองของท่านได้รับการยืนยันเรียบร้อยแล้ว
                </p>
                <div style="border-top:1px solid #1e1e1e;margin-bottom:24px;"></div>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #111;width:40%;">โต๊ะ</td>
                      <td style="padding:10px 0;color:#fff5e2;text-align:right;border-bottom:1px solid #111;">โต๊ะ ${tableRows[0].table_number}</td></tr>
                  <tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #111;">วันที่</td>
                      <td style="padding:10px 0;color:#fff5e2;text-align:right;border-bottom:1px solid #111;">${date}</td></tr>
                  <tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #111;">เวลา</td>
                      <td style="padding:10px 0;color:#fff5e2;text-align:right;border-bottom:1px solid #111;">${time}</td></tr>
                  <tr><td style="padding:10px 0;color:#666;border-bottom:1px solid #111;">จำนวนคน</td>
                      <td style="padding:10px 0;color:#fff5e2;text-align:right;border-bottom:1px solid #111;">${number_of_people} คน</td></tr>
                  <tr><td style="padding:10px 0;color:#666;">คำขอพิเศษ</td>
                      <td style="padding:10px 0;color:#fff5e2;text-align:right;">${special_request || '-'}</td></tr>
                </table>
                <div style="border-top:1px solid #1e1e1e;margin:24px 0;"></div>
                <div style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.25);border-radius:6px;padding:16px;text-align:center;">
                  <p style="font-size:11px;letter-spacing:3px;color:#8a6a2a;margin:0 0 4px;">สถานะการจอง</p>
                  <p style="font-size:15px;color:#c9a96e;margin:0;">รอการยืนยัน (Pending)</p>
                </div>
                <p style="font-size:12px;color:#444;margin:24px 0 0;line-height:1.8;">
                  หากมีข้อสงสัยกรุณาติดต่อร้านโดยตรง<br>ขอบคุณที่เลือกใช้บริการ Kaiseki Omakase
                </p>
              </div>
              <div style="background:#000;padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center;">
                <p style="font-size:11px;color:#333;margin:0;letter-spacing:2px;">© 2026 KAISEKI OMAKASE</p>
              </div>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('ส่งเมลไม่สำเร็จ:', mailErr.message);
      }
    }

    res.json({ message: 'จองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /reservations/:id — แก้ไขสถานะ
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
      'UPDATE reservation SET status = ? WHERE reservation_id = ?', [status, id]
    );

    const tableStatus = { pending: 'reserved', confirmed: 'reserved', cancelled: 'available' }[status];
    await conn.query(
      'UPDATE dining_tables SET status = ? WHERE table_id = ?', [tableStatus, rows[0].table_id]
    );

    res.json({ message: `อัปเดตสถานะเป็น ${status} สำเร็จ` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /reservations/:id — ลบการจอง
router.delete('/:id', async (req, res) => {
  try {
    const conn = getConn();
    const { id } = req.params;

    const [rows] = await conn.query(
      'SELECT table_id FROM reservation WHERE reservation_id = ?', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'ไม่พบการจองนี้' });

    await conn.query('DELETE FROM reservation WHERE reservation_id = ?', [id]);
    await conn.query(
      'UPDATE dining_tables SET status = "available" WHERE table_id = ?', [rows[0].table_id]
    );

    res.json({ message: 'ลบการจองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
