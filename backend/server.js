const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { initMySQL, getConn } = require('./db'); 

const app = express();
const PORT = process.env.PORT || 8000; 

app.use(cors());
app.use(bodyParser.json());

// ===== Routes =====
const authRouter        = require('./routes/auth');
const reservationRouter = require('./routes/reservation');
const tablesRouter      = require('./routes/tables');

app.use('/auth',         authRouter);
app.use('/reservations', reservationRouter);
app.use('/tables',       tablesRouter);

// ===== Health check =====
app.get('/', (req, res) => {
  res.send('Reservation Backend is running 🚀');
});

// ===== Ping DB ====
app.get('/ping', async (req, res) => {
  try {
    const conn = getConn();
    const [rows] = await conn.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ===== Start Server =====
async function startServer() {
  try {
    await initMySQL();
    console.log('✅ DB connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  }
}

startServer();
