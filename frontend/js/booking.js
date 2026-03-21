// ตั้งวันขั้นต่ำเป็นวันนี้
const API = 'http://localhost:8000'
const dateInput = document.getElementById('date');
const today = new Date().toISOString().split('T')[0];
dateInput.min = today;

function submitBooking(event) {
  event.preventDefault();

  const firstname = document.getElementById('firstname').value.trim();
  const lastname = document.getElementById('lastname').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const people = document.getElementById('people').value;
  const special = document.getElementById('special').value.trim();

  const errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';

  if (!firstname || !lastname || !phone || !email || !date || !time || !people) {
    errEl.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
    errEl.style.display = 'block';
    return false;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    errEl.textContent = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก';
    errEl.style.display = 'block';
    return false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errEl.textContent = 'รูปแบบ Email ไม่ถูกต้อง';
    errEl.style.display = 'block';
    return false;
  }

  // เก็บข้อมูลไว้ใน sessionStorage
  sessionStorage.setItem('bookingData', JSON.stringify({
    firstname,
    lastname,
    phone,
    email,
    date,
    time,
    number_of_people: parseInt(people),
    special_request: special
  }));

  
  window.location.href = 'tables.html';
  return true;
}
