const express      = require('express');
const router       = express.Router();
const { getConn }  = require('../db');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');

const SECRET = 'omakase_secret_key';

// ===== Gmail transporter =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bbaitoeytoeyy2234@gmail.com',       // ← เปลี่ยนเป็น Gmail ของคุณ
    pass: 'gnvw cgrf uiru obni'   // ← App Password 16 หลัก
  },
  tls: {
    rejectUnauthorized: false     // ✅ แก้ self-signed certificate error
  }
})

// ===== helper: ดึง user_id จาก JWT =====
function getUserId(req) {
  try {
    const auth    = req.headers['authorization'] || ''
    const token   = auth.split(' ')[1]
    const decoded = jwt.verify(token, SECRET)
    return decoded.user_id
  } catch { return null }
}

// ===== GET /reservations =====
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

// ===== POST /reservations =====
router.post('/', async (req, res) => {
  try {
    const {
      table_id,
      date, time,
      number_of_people,
      special_request,
      email,           // รับ email จาก bookingData เพื่อส่งเมล
      firstname,
      lastname
    } = req.body;

    const conn = getConn();

    // 1) ดึง customer_id จาก token
    const userId = getUserId(req)
    if (!userId) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' })

    const [userRows] = await conn.query(
      'SELECT customer_id FROM users WHERE user_id = ?', [userId]
    )
    if (!userRows.length) return res.status(404).json({ message: 'ไม่พบผู้ใช้' })

    const customer_id = userRows[0].customer_id

    // 2) ดึงข้อมูลโต๊ะ
    const [tableRows] = await conn.query(
      'SELECT * FROM dining_tables WHERE table_id = ?', [table_id]
    )
    if (!tableRows.length) return res.status(404).json({ message: 'ไม่พบโต๊ะนี้' })
    if (tableRows[0].status !== 'available') {
      return res.status(400).json({ message: 'โต๊ะนี้ไม่ว่างแล้ว' })
    }

    // 3) INSERT reservation
    await conn.query(
      `INSERT INTO reservation
       (table_id, customer_id, reservation_date, reservation_time,
        number_of_people, special_request, status, create_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [table_id, customer_id, date, time, number_of_people, special_request || null]
    );

    // 4) อัปเดตสถานะโต๊ะ
    await conn.query(
      'UPDATE dining_tables SET status = "reserved" WHERE table_id = ?',
      [table_id]
    );

    // 5) ส่งอีเมลยืนยัน
    if (email) {
      try {
        await transporter.sendMail({
          from:    '"Kaiseki Omakase" <your@gmail.com>',
          to:      email,
          subject: 'ยืนยันการจองโต๊ะ – Kaiseki Omakase',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;
                        background:#0a0a0a;color:#eee;border-radius:8px;">
              <h2 style="color:#c9a96e;letter-spacing:2px;">Kaiseki Omakase</h2>
              <p style="color:#aaa;">ยืนยันการจองโต๊ะเรียบร้อยแล้ว</p>
              <hr style="border-color:#222;margin:20px 0"/>
              <table style="width:100%;font-size:14px;line-height:2;">
                <tr><td style="color:#888;">ชื่อ</td>
                    <td style="text-align:right">${firstname} ${lastname}</td></tr>
                <tr><td style="color:#888;">โต๊ะ</td>
                    <td style="text-align:right">โต๊ะ ${tableRows[0].table_number}</td></tr>
                <tr><td style="color:#888;">วันที่</td>
                    <td style="text-align:right">${date}</td></tr>
                <tr><td style="color:#888;">เวลา</td>
                    <td style="text-align:right">${time}</td></tr>
                <tr><td style="color:#888;">จำนวนคน</td>
                    <td style="text-align:right">${number_of_people} คน</td></tr>
                <tr><td style="color:#888;">คำขอพิเศษ</td>
                    <td style="text-align:right">${special_request || '-'}</td></tr>
              </table>
              <hr style="border-color:#222;margin:20px 0"/>
              <p style="color:#555;font-size:12px;">
                หากมีข้อสงสัยกรุณาติดต่อร้านโดยตรง
              </p>
            </div>
          `
        })
      } catch (mailErr) {
        // เมลส่งไม่ได้ก็ไม่ rollback การจอง แค่ log ไว้
        console.error('ส่งเมลไม่สำเร็จ:', mailErr.message)
      }
    }

    res.json({ message: 'จองสำเร็จ' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;