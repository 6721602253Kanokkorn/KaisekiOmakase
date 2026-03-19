const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConn } = require('../db');

const SECRET = 'omakase_secret_key';

// ======== SIGN UP ========
// flow: INSERT customer → INSERT users (linked by customer_id)
router.post('/signup', async (req, res) => {
  try {
    const { firstname, lastname, email, password, phone } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const conn = getConn();

    // เช็คว่า email ซ้ำใน users หรือยัง
    const [existingUser] = await conn.query(
      'SELECT * FROM users WHERE email = ?', [email]
    );
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้มีผู้ใช้แล้ว' });
    }

    // 1) INSERT เข้า customer ก่อน
    const [customerResult] = await conn.query(
      'INSERT INTO customer (firstname, lastname, phone, email, create_at) VALUES (?, ?, ?, ?, NOW())',
      [firstname, lastname, phone || null, email]
    );
    const newCustomerId = customerResult.insertId;

    // 2) hash password แล้ว INSERT เข้า users
    const hashed = await bcrypt.hash(password, 10);

    await conn.query(
      'INSERT INTO users (email, password_hash, role, customer_id) VALUES (?, ?, ?, ?)',
      [email, hashed, 'customer', newCustomerId]
    );

    res.json({ message: 'สมัครสมาชิกสำเร็จ' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ======== SIGN IN ========
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const conn = getConn();

    // JOIN users กับ customer เพื่อดึง firstname ด้วย
    const [rows] = await conn.query(`
      SELECT u.*, c.firstname, c.lastname
      FROM users u
      JOIN customer c ON u.customer_id = c.customer_id
      WHERE u.email = ?
    `, [email]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบบัญชีนี้' });
    }

    const user = rows[0];

    // เช็ค password กับ password_hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        firstname: user.firstname,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;