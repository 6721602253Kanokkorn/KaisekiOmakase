// tables.js — รับข้อมูลจาก booking.html แล้วเลือกโต๊ะ

const API   = 'http://localhost:8000'  // ✅ แก้ port
const token = localStorage.getItem('token')
const user  = JSON.parse(localStorage.getItem('user') || 'null')

// Guard: ต้อง login
if (!token) {
  alert('กรุณาเข้าสู่ระบบก่อน')
  window.location.href = 'signin.html'
}

// Guard: ต้องมีข้อมูลการจองจาก booking.html
const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || 'null')
if (!bookingData) {
  alert('กรุณากรอกข้อมูลการจองก่อน')
  window.location.href = 'booking.html'
}

// แสดงชื่อ user
const navUser = document.getElementById('nav-user')
if (navUser && user) navUser.textContent = `สวัสดี, ${user.firstname}`

// แสดงสรุปข้อมูลการจองด้านซ้าย
const summaryEl = document.getElementById('booking-summary')
if (summaryEl && bookingData) {
  summaryEl.innerHTML = `
    <div class="summary-box">
      <p><strong>${bookingData.firstname} ${bookingData.lastname}</strong></p>
      <p>📅 ${bookingData.date} ⏰ ${bookingData.time}</p>
      <p>👥 ${bookingData.number_of_people} คน</p>
    </div>
  `
}

// State
let selectedTable = null
const tableIcons  = ['🍣','🍱','🍜','🍛','🥢','🍶','🫕','🥗']

// โหลดโต๊ะ
async function loadTables() {
  try {
    const res    = await fetch(`${API}/tables`)
    const tables = await res.json()
    renderTables(tables)
  } catch (err) {
    console.error('โหลดโต๊ะไม่สำเร็จ:', err)
  }
}

function renderTables(tables) {
  const grid = document.getElementById('tables-grid')
  grid.innerHTML = ''

  tables.forEach((t, i) => {
    const card = document.createElement('div')
    card.className = `table-card ${t.status}`

    // ✅ ใช้ table_number แทน table_name (ตรงกับ DB จริง)
    const displayName = `โต๊ะ ${t.table_number}`

    const notEnoughSeats = bookingData && parseInt(bookingData.number_of_people) > t.capacity

    const statusLabel = {
      available: notEnoughSeats
        ? `<span class="table-status-badge badge-reserved">ที่นั่งไม่พอ (max ${t.capacity})</span>`
        : `<span class="table-status-badge badge-available">ว่าง</span>`,
      reserved:  `<span class="table-status-badge badge-reserved">จองแล้ว</span>`,
      occupied:  `<span class="table-status-badge badge-occupied">ใช้บริการอยู่</span>`
    }[t.status]

    card.innerHTML = `
      <div class="table-card-icon">${tableIcons[i] || '🍽️'}</div>
      <h4>${displayName}</h4>
      <p class="capacity">${t.capacity} ที่นั่ง</p>
      ${statusLabel}
    `

    if (t.status === 'available' && !notEnoughSeats) {
      card.onclick = () => selectTable(t)
    } else if (t.status === 'available' && notEnoughSeats) {
      card.classList.add('not-enough')
      card.onclick = () => showToast(`โต๊ะนี้รองรับได้ ${t.capacity} คน ไม่พอสำหรับ ${bookingData.number_of_people} คน`, 'error')
    } else {
      card.onclick = () => {
        const msg = t.status === 'reserved'
          ? `${displayName} มีคนจองแล้ว ไม่สามารถเลือกได้`
          : `${displayName} กำลังถูกใช้บริการอยู่`
        showToast(msg, 'error')
      }
    }

    if (selectedTable && selectedTable.table_id === t.table_id) {
      card.style.boxShadow = '0 0 0 3px #2ecc71'
    }

    grid.appendChild(card)
  })
}

function selectTable(table) {
  selectedTable = table

  document.getElementById('panel-placeholder').style.display = 'none'
  const panel = document.getElementById('confirm-panel')
  panel.style.display = 'block'
  panel.style.animation = 'fadeUp 0.3s ease'

  // ✅ ใช้ table_number แทน table_name
  document.getElementById('cf-table').textContent    = `โต๊ะ ${table.table_number}`
  document.getElementById('cf-capacity').textContent = `${table.capacity} ที่นั่ง`
  document.getElementById('cf-name').textContent     = `${bookingData.firstname} ${bookingData.lastname}`
  document.getElementById('cf-phone').textContent    = bookingData.phone
  document.getElementById('cf-email').textContent    = bookingData.email
  document.getElementById('cf-date').textContent     = bookingData.date
  document.getElementById('cf-time').textContent     = bookingData.time
  document.getElementById('cf-people').textContent   = `${bookingData.number_of_people} คน`
  document.getElementById('cf-special').textContent  = bookingData.special_request || '-'

  clearMessages()
  loadTables()
}

function cancelSelection() {
  selectedTable = null
  document.getElementById('confirm-panel').style.display = 'none'
  document.getElementById('panel-placeholder').style.display = 'flex'
  clearMessages()
  loadTables()
}

async function submitReservation() {
  if (!selectedTable || !bookingData) return

  const btn = document.querySelector('.confirm-panel .btn-main')
  btn.textContent = 'กำลังจอง...'
  btn.disabled = true
  clearMessages()

  try {
    const res = await fetch(`${API}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...bookingData,
        table_id: selectedTable.table_id
      })
    })

    const data = await res.json()

    if (res.ok) {
      showResSuccess(`✅ จองสำเร็จ!`)
      sessionStorage.removeItem('bookingData')
      selectedTable = null
      await loadTables()
      setTimeout(() => { window.location.href = 'index.html' }, 3500)
    } else {
      showResError(data.message || 'จองไม่สำเร็จ')
    }
  } catch (err) {
    showResError('ไม่สามารถเชื่อมต่อ Server ได้')
  } finally {
    btn.textContent = 'ยืนยันการจอง'
    btn.disabled = false
  }
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  sessionStorage.removeItem('bookingData')
  window.location.href = 'signin.html'
}

function showResError(msg) {
  const el = document.getElementById('res-error')
  if (el) { el.textContent = msg; el.style.display = 'block' }
}
function showResSuccess(msg) {
  const el = document.getElementById('res-success')
  if (el) { el.textContent = msg; el.style.display = 'block' }
}
function clearMessages() {
  const e = document.getElementById('res-error')
  const s = document.getElementById('res-success')
  if (e) e.style.display = 'none'
  if (s) s.style.display = 'none'
}

function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'toast'
    toast.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      color:#fff; padding:12px 24px; border-radius:30px;
      font-size:0.88rem; z-index:999; animation:fadeUp 0.3s ease;
      box-shadow:0 4px 20px rgba(0,0,0,0.4); white-space:nowrap;
    `
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.style.background = type === 'error' ? '#e63b2e' : '#2ecc71'
  toast.style.display = 'block'
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => { toast.style.display = 'none' }, 3500)
}

// Start
loadTables()
setInterval(loadTables, 5000)