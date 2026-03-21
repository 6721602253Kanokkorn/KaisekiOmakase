const API = 'http://localhost:8000'

function showError(msg) {
  const el = document.getElementById('error-msg')
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
  const s = document.getElementById('success-msg')
  if (s) s.style.display = 'none'
}

function showSuccess(msg) {
  const el = document.getElementById('success-msg')
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
  const e = document.getElementById('error-msg')
  if (e) e.style.display = 'none'
}

function hideMessages() {
  const e = document.getElementById('error-msg')
  const s = document.getElementById('success-msg')
  if (e) e.style.display = 'none'
  if (s) s.style.display = 'none'
}

// ======== SIGN IN ========
async function signIn() {
  hideMessages()
  const email    = document.getElementById('email')?.value?.trim()
  const password = document.getElementById('password')?.value

  if (!email || !password) {
    showError('กรุณากรอก Email และ Password')
    return
  }

  const btn = document.querySelector('.btn-main')
  btn.textContent = 'กำลังเข้าสู่ระบบ...'
  btn.disabled = true

  try {
    const res = await fetch(`${API}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    let data
    try {
      data = await res.json()
    } catch (e) {
      showError('Server error (not JSON)')
      return
    }

    if (res.ok) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = 'booking.html'
    } else {
      showError(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
    }
  } catch (err) {
    showError('ไม่สามารถเชื่อมต่อ Server ได้ กรุณาลองใหม่')
  } finally {
    btn.textContent = 'Sign In'
    btn.disabled = false
  }
}

// ======== SIGN UP ========
async function signUp() {
  hideMessages()
  const firstname = document.getElementById('firstname')?.value?.trim()
  const lastname  = document.getElementById('lastname')?.value?.trim()
  const phone     = document.getElementById('phone')?.value?.trim()
  const email     = document.getElementById('email')?.value?.trim()
  const password  = document.getElementById('password')?.value

  if (!firstname || !lastname || !email || !password) {
    showError('กรุณากรอกข้อมูลให้ครบทุกช่อง')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('รูปแบบ Email ไม่ถูกต้อง')
    return
  }
  if (password.length < 6) {
    showError('Password ต้องมีอย่างน้อย 6 ตัวอักษร')
    return
  }

  const btn = document.querySelector('.btn-main')
  btn.textContent = 'กำลังสมัคร...'
  btn.disabled = true

  try {
    const res  = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstname, lastname, phone, email, password })
    })
    const data = await res.json()

    if (res.ok) {
      showSuccess('สมัครสมาชิกสำเร็จ! กำลังพาไปหน้า Sign In...')
      setTimeout(() => { window.location.href = 'signin.html' }, 1800)
    } else {
      showError(data.message || 'สมัครไม่สำเร็จ')
    }
  } catch (err) {
    showError('ไม่สามารถเชื่อมต่อ Server ได้ กรุณาลองใหม่')
  } finally {
    btn.textContent = 'Sign Up'
    btn.disabled = false
  }
}

// Enter key
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return
  const btn = document.querySelector('.btn-main')
  if (btn && btn.disabled) return
  if (document.getElementById('password') && !document.getElementById('firstname')) {
    e.preventDefault()
    signIn()
  } else if (document.getElementById('firstname')) {
    e.preventDefault()
    signUp()
  }
})
