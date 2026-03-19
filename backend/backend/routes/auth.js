const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');

const SECRET = 'omakase_secret_key';

// signup
router.post('/signup', async (req, res) => {
  try {
    const { firstname, lastname, email, password, phone } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    const conn = getPool();

    const [existing] = await conn.query(
      'SELECT * FROM users WHERE email = ?', [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้มีผู้ใช้แล้ว' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await conn.query(
      'INSERT INTO users (firstname, lastname, email, password, phone) VALUES (?,?,?,?,?)',
      [firstname, lastname, email, hashed, phone]
    );

    res.json({ message: 'สมัครสมาชิกสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const conn = getPool();

    const [rows] = await conn.query(
      'SELECT * FROM users WHERE email = ?', [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบบัญชีนี้' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: { firstname: user.firstname, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;