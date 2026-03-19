const mysql = require('mysql2/promise');

let conn = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initMySQL = async () => {
  let retries = 10;

  while (retries) {
    try {
      conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root', 
        database: 'reservation_db', 
        port: 8700
      });

      await conn.query('SELECT 1');
      console.log('✅ Connected to MySQL database');
      return;

    } catch (err) {
      console.log('⏳ MySQL not ready, retrying...', err.message);
      retries--;
      await sleep(3000);
    }
  }

  throw new Error('❌ Cannot connect to MySQL');
};

const getConn = () => {
  if (!conn) {
    throw new Error('MySQL not initialized');
  }
  return conn;
};

module.exports = { initMySQL, getConn };