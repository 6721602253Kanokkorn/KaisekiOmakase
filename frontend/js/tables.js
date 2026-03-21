const API   = 'http://localhost:8000'
const token = localStorage.getItem('token')
const user  = JSON.parse(localStorage.getItem('user') || 'null')

if (!token) {
  alert('กรุณาเข้าสู่ระบบก่อน')
  window.location.href = 'signin.html'
}

const bookingData = JSON.parse(sessionStorage.getItem('bookingData') || 'null')
if (!bookingData) {
  alert('กรุณากรอกข้อมูลการจองก่อน')
  window.location.href = 'booking.html'
}

const navUser = document.getElementById('nav-user')
if (navUser && user) navUser.textContent = `สวัสดี, ${user.firstname}`

const summaryEl = document.getElementById('booking-summary')
if (summaryEl && bookingData) {
  summaryEl.innerHTML = `
    <div class="summary-box">
      <strong>${bookingData.firstname} ${bookingData.lastname}</strong><br>
      📅 ${bookingData.date} &nbsp; ⏰ ${bookingData.time}<br>
      👥 ${bookingData.number_of_people} คน
    </div>
  `
}

let selectedTable = null

function tablesvg(color) {
  return `<svg class="table-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8"  y="24" width="48" height="8"  rx="2" fill="${color}" opacity="0.9"/>
    <rect x="14" y="32" width="5"  height="18" rx="2" fill="${color}" opacity="0.6"/>
    <rect x="45" y="32" width="5"  height="18" rx="2" fill="${color}" opacity="0.6"/>
    <rect x="10" y="14" width="13" height="9"  rx="3" fill="${color}" opacity="0.4"/>
    <rect x="41" y="14" width="13" height="9"  rx="3" fill="${color}" opacity="0.4"/>
    <rect x="10" y="51" width="13" height="9"  rx="3" fill="${color}" opacity="0.4"/>
    <rect x="41" y="51" width="13" height="9"  rx="3" fill="${color}" opacity="0.4"/>
  </svg>`
}

const colorMap = { available: '#4a7c59', reserved: '#8a6a2a', occupied: '#7a3030' }

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

  if (!tables.length) {
    grid.innerHTML = '<p style="color:#555;font-size:13px;grid-column:1/-1">ไม่พบข้อมูลโต๊ะ</p>'
    return
  }

  tables.forEach(t => {
    const card      = document.createElement('div')
    const notEnough = bookingData && parseInt(bookingData.number_of_people) > t.capacity
    const color     = colorMap[t.status] || '#555'

    card.className = `table-card ${t.status}`
    if (selectedTable?.table_id === t.table_id) card.classList.add('selected')

    let badge = ''
    if      (t.status === 'reserved')  badge = '<span style="font-size:10px;color:#c9a96e;letter-spacing:1px">จองแล้ว</span>'
    else if (t.status === 'occupied')  badge = '<span style="font-size:10px;color:#c97a7a;letter-spacing:1px">ใช้บริการอยู่</span>'
    else if (notEnough)                badge = '<span style="font-size:10px;color:#c97a7a">ที่นั่งไม่พอ</span>'
    else                               badge = '<span style="font-size:10px;color:#7abf8e;letter-spacing:1px">ว่าง</span>'

    card.innerHTML = `
      <div class="status-dot"></div>
      ${tablesvg(color)}
      <h4>โต๊ะ ${t.table_number}</h4>
      <p class="table-cap">${t.capacity} ที่นั่ง</p>
      ${badge}
    `

    if (t.status === 'available' && !notEnough) {
      card.onclick = () => selectTable(t)
    } else if (t.status === 'available' && notEnough) {
      card.style.opacity = '0.5'
      card.style.cursor  = 'not-allowed'
      card.onclick = () => showToast(`โต๊ะนี้รองรับได้ ${t.capacity} คน`, 'error')
    } else {
      card.style.cursor = 'not-allowed'
      card.onclick = () => showToast(
        t.status === 'reserved'
          ? `โต๊ะ ${t.table_number} มีคนจองแล้ว`
          : `โต๊ะ ${t.table_number} กำลังใช้บริการอยู่`,
        'error'
      )
    }

    grid.appendChild(card)
  })
}

function selectTable(table) {
  selectedTable = table

  document.getElementById('panel-placeholder').style.display = 'none'
  const panel = document.getElementById('confirm-panel')
  panel.style.display = 'block'

  const name = `โต๊ะ ${table.table_number}`
  document.getElementById('cf-table-badge').textContent = name
  document.getElementById('cf-table').textContent       = name
  document.getElementById('cf-capacity').textContent    = `${table.capacity} ที่นั่ง`
  document.getElementById('cf-name').textContent        = `${bookingData.firstname} ${bookingData.lastname}`
  document.getElementById('cf-phone').textContent       = bookingData.phone
  document.getElementById('cf-email').textContent       = bookingData.email
  document.getElementById('cf-date').textContent        = bookingData.date
  document.getElementById('cf-time').textContent        = bookingData.time
  document.getElementById('cf-people').textContent      = `${bookingData.number_of_people} คน`
  document.getElementById('cf-special').textContent     = bookingData.special_request || '-'

  clearMessages()
  loadTables()
}

function cancelSelection() {
  selectedTable = null
  document.getElementById('confirm-panel').style.display    = 'none'
  document.getElementById('panel-placeholder').style.display = 'flex'
  clearMessages()
  loadTables()
}

async function submitReservation() {
  if (!selectedTable || !bookingData) return

  const btn = document.querySelector('#confirm-panel .btn-main')
  btn.textContent = 'กำลังจอง...'
  btn.disabled    = true
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
      showResSuccess('✅ จองสำเร็จ! กำลังพากลับหน้าหลัก...')
      sessionStorage.removeItem('bookingData')
      selectedTable = null
      await loadTables()
      setTimeout(() => { window.location.href = 'index.html' }, 3000)
    } else {
      showResError(data.message || 'จองไม่สำเร็จ')
    }
  } catch (err) {
    showResError('ไม่สามารถเชื่อมต่อ Server ได้')
  } finally {
    btn.textContent = '✓ ยืนยันการจอง'
    btn.disabled    = false
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
    toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      color:#fff;padding:12px 28px;border-radius:30px;font-size:13px;
      z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;`
    document.body.appendChild(toast)
  }
  toast.textContent      = msg
  toast.style.background = type === 'error' ? '#8a3030' : '#2ecc71'
  toast.style.display    = 'block'
  clearTimeout(toast._t)
  toast._t = setTimeout(() => { toast.style.display = 'none' }, 3000)
}

loadTables()
setInterval(loadTables, 5000)
