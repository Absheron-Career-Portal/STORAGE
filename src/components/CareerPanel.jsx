import React, { useState, useEffect } from 'react'

const RAW_BASE = 'https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public'

const azerbaijaniMonths = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]
const azerbaijaniWeekdays = ['B', 'Be', 'Ça', 'Ç', 'Ca', 'C', 'Ş']

// "29 İyun, 2026" -> { day, monthIndex, year }
const parseAzDate = (str) => {
  if (!str) return null
  const m = String(str).trim().match(/^(\d{1,2})\s+(\S+),\s*(\d{4})$/)
  if (!m) return null
  const monthIndex = azerbaijaniMonths.indexOf(m[2])
  if (monthIndex === -1) return null
  return { day: parseInt(m[1], 10), monthIndex, year: parseInt(m[3], 10) }
}
const azDateToObj = (str) => {
  const p = parseAzDate(str)
  return p ? new Date(p.year, p.monthIndex, p.day) : new Date()
}
const formatAz = (d) => `${d.getDate()} ${azerbaijaniMonths[d.getMonth()]}, ${d.getFullYear()}`

const CareerPanel = () => {
  const [careers, setCareers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newCareer, setNewCareer] = useState({
    title: '', description: '', date: '', expireDate: '',
    location: 'Bakı, Azərbaycan', type: 'Tam iş günü', view: '0', link: '', isVisible: true,
  })
  const [showDatePicker, setShowDatePicker] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expireMonth, setExpireMonth] = useState(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadCareers()
    setTodayDates()
  }, [])

  const setTodayDates = () => {
    const today = new Date()
    setNewCareer((prev) => ({ ...prev, date: formatAz(today) }))
    const nextYear = new Date(today)
    nextYear.setFullYear(today.getFullYear() + 1)
    setNewCareer((prev) => ({ ...prev, expireDate: formatAz(nextYear) }))
  }

  // Resolve a "../docs/x.txt" reference to its text content
  const hydrateDescription = async (career) => {
    if (career.description && String(career.description).startsWith('../docs/')) {
      try {
        const fileName = career.description.replace('../docs/', '')
        const r = await fetch(`${RAW_BASE}/docs/${fileName}?t=${Date.now()}`)
        if (r.ok) {
          const text = await r.text()
          return { ...career, descriptionContent: text, descriptionFile: career.description }
        }
      } catch (e) {
        console.error(`Description load failed for ${career.title}:`, e)
      }
    }
    return {
      ...career,
      descriptionContent: career.description || '',
      descriptionFile: career.description || '',
    }
  }

  const loadCareers = async () => {
    setLoading(true)
    try {
      const [careerRes, backupRes] = await Promise.all([
        fetch(`${RAW_BASE}/data/career.json?t=${Date.now()}`),
        fetch(`${RAW_BASE}/data/backup.json?t=${Date.now()}`).catch(() => null),
      ])

      if (!careerRes.ok) throw new Error(`Failed to load careers: ${careerRes.status}`)
      const visibleRaw = await careerRes.json()

      let hiddenRaw = []
      if (backupRes && backupRes.ok) {
        try { hiddenRaw = await backupRes.json() } catch { hiddenRaw = [] }
      }

      // Visible items win on id conflicts; archived items are added only if absent.
      const byId = new Map()
      visibleRaw.forEach((c) => byId.set(c.id, { ...c, isVisible: true }))
      hiddenRaw.forEach((c) => { if (!byId.has(c.id)) byId.set(c.id, { ...c, isVisible: false }) })

      const merged = await Promise.all([...byId.values()].map(hydrateDescription))
      setCareers(merged)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error loading careers:', error)
      const local = localStorage.getItem('careers')
      if (local) {
        const parsed = JSON.parse(local)
        setCareers(parsed.map((c) => ({
          ...c,
          descriptionContent: c.descriptionContent || c.description || '',
          descriptionFile: c.descriptionFile || c.description || '',
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  const toJSON = (c) => ({
    id: c.id,
    dateImage: c.dateImage || 'https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg',
    date: c.date,
    expireDate: c.expireDate,
    location: c.location,
    type: c.type,
    typeImage: c.typeImage || 'https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/suitcase.svg',
    view: c.view,
    title: c.title,
    description: c.descriptionFile, // store the file path, not the content
    isVisible: c.isVisible,
    link: c.link,
  })

  const saveDataFile = async (action, data) => {
    const baseUrl = window.location.origin
    const res = await fetch(`${baseUrl}/api/github/save-career`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, action }),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(`${action} failed: ${res.status} - ${t}`)
    }
    const result = await res.json()
    return result.success
  }

  const saveDescriptionToFile = async (description, fileName, retryCount = 0) => {
    try {
      const baseUrl = window.location.origin
      const res = await fetch(`${baseUrl}/api/github/save-career`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, content: description, action: 'save-description' }),
      })
      if (!res.ok) {
        if (res.status === 409 && retryCount < 3) {
          await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, retryCount)))
          return saveDescriptionToFile(description, fileName, retryCount + 1)
        }
        if (res.status === 404) return true
        throw new Error(`GitHub API error: ${res.status}`)
      }
      return true
    } catch (e) {
      console.error('Error saving description file:', e)
      return false
    }
  }

  const generateFileName = (title) => {
    const safe = title
      .toLowerCase()
      .replace(/ə/g, 'e').replace(/ü/g, 'u').replace(/ö/g, 'o')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/ş/g, 's')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .trim()
    return `${safe}.txt`
  }

  const saveCareersLocally = (updated) => {
    setCareers(updated)
    localStorage.setItem('careers', JSON.stringify(updated))
    setHasUnsavedChanges(true)
  }

  // Newest date first; entries without a date (the "CV bazası" entry) stay pinned
  // on top. The website sorts by id ascending, so we renumber to match the date
  // order — that's what makes a freshly added job show up first instead of last.
  const dateRank = (c) => {
    const p = parseAzDate(c.date)
    return p ? p.year * 10000 + (p.monthIndex + 1) * 100 + p.day : Infinity // pinned
  }
  const orderByDate = (list) => {
    const pinned = list.filter((c) => dateRank(c) === Infinity)
    const dated = list
      .filter((c) => dateRank(c) !== Infinity)
      .sort((a, b) => dateRank(b) - dateRank(a)) // newest first
    return [...pinned, ...dated]
  }

  const publishChanges = async () => {
    setLoading(true)
    try {
      // Order everything newest-first, then renumber so id order == date order.
      const ordered = orderByDate(careers).map((c, i) => ({ ...c, id: i }))
      setCareers(ordered)

      const visible = ordered.filter((c) => c.isVisible)
      const hidden = ordered.filter((c) => !c.isVisible)

      // 1) career.json = visible jobs only (newest first by id)
      await saveDataFile('save-career-json', visible.map(toJSON))
      // 2) backup.json = hidden jobs (the archive)
      await saveDataFile('save-backup-json', hidden.map(toJSON))

      // 3) keep every description file in sync (visible + hidden)
      const failed = []
      for (const career of ordered) {
        if (career.descriptionFile && career.descriptionContent) {
          const fileName = career.descriptionFile.replace('../docs/', '')
          const ok = await saveDescriptionToFile(career.descriptionContent, fileName)
          if (!ok) failed.push(career.title)
          await new Promise((r) => setTimeout(r, 1200))
        }
      }

      if (failed.length) {
        alert(`Saved, but some description files failed: ${failed.join(', ')}`)
      } else {
        alert('Published. career.json and backup.json are up to date.')
        setHasUnsavedChanges(false)
      }
    } catch (error) {
      console.error('Error publishing changes:', error)
      alert('Could not publish: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const discardChanges = () => {
    if (window.confirm('Discard all unsaved changes and reload from GitHub?')) {
      loadCareers()
    }
  }

  const handleEdit = (career) => {
    setEditingId(career.id)
    setNewCareer({
      title: career.title,
      description: career.descriptionContent || '',
      date: career.date,
      expireDate: career.expireDate || '',
      location: career.location || 'Bakı, Azərbaycan',
      type: career.type || 'Tam iş günü',
      view: career.view?.toString() || '0',
      link: career.link || '',
      isVisible: career.isVisible === undefined ? true : career.isVisible,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = () => {
    const updated = careers.map((career) =>
      career.id === editingId
        ? {
            ...career,
            title: newCareer.title,
            descriptionContent: newCareer.description,
            date: newCareer.date,
            expireDate: newCareer.expireDate,
            location: newCareer.location,
            type: newCareer.type,
            view: parseInt(newCareer.view) || 0,
            link: newCareer.link,
            isVisible: newCareer.isVisible,
          }
        : career
    )
    saveCareersLocally(updated)
    resetForm()
  }

  const handleAdd = () => {
    if (!newCareer.title.trim()) return alert('Add a title first.')
    if (!newCareer.description.trim()) return alert('Add a description first.')

    const newId = careers.length ? Math.max(...careers.map((c) => c.id)) + 1 : 1
    const filePath = `../docs/${generateFileName(newCareer.title)}`

    const item = {
      id: newId,
      title: newCareer.title,
      description: newCareer.description,
      descriptionContent: newCareer.description,
      descriptionFile: filePath,
      date: newCareer.date,
      expireDate: newCareer.expireDate,
      location: newCareer.location,
      type: newCareer.type,
      view: parseInt(newCareer.view) || 0,
      link: newCareer.link,
      isVisible: newCareer.isVisible,
    }
    saveCareersLocally([...careers, item])
    resetForm()
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this job permanently?')) {
      saveCareersLocally(careers.filter((c) => c.id !== id))
    }
  }

  // Hide -> will land in backup.json on publish. Show -> back to career.json.
  const toggleCareerVisibility = (id) => {
    saveCareersLocally(
      careers.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const resetForm = () => {
    setNewCareer({
      title: '', description: '', date: '', expireDate: '',
      location: 'Bakı, Azərbaycan', type: 'Tam iş günü', view: '0', link: '', isVisible: true,
    })
    setEditingId(null)
    setShowDatePicker(null)
    setTodayDates()
  }

  const openPicker = (which) => {
    if (showDatePicker === which) return setShowDatePicker(null)
    if (which === 'postDate') setCurrentMonth(azDateToObj(newCareer.date))
    else setExpireMonth(azDateToObj(newCareer.expireDate))
    setShowDatePicker(which)
  }

  const handleDateSelect = (selectedDate, field) => {
    const formatted = formatAz(selectedDate)
    if (field === 'postDate') setNewCareer((p) => ({ ...p, date: formatted }))
    else setNewCareer((p) => ({ ...p, expireDate: formatted }))
    setShowDatePicker(null)
  }

  const generateCalendarDays = (month) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const firstDay = new Date(year, monthIndex, 1).getDay()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const prevMonthLastDay = new Date(year, monthIndex, 0).getDate()
    const days = []
    for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, monthIndex - 1, prevMonthLastDay - i))
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, monthIndex, i))
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) days.push(new Date(year, monthIndex + 1, i))
    return days
  }

  const navigateMonth = (direction, type) => {
    const setter = type === 'postDate' ? setCurrentMonth : setExpireMonth
    setter((prev) => {
      const m = new Date(prev)
      m.setMonth(prev.getMonth() + direction)
      return m
    })
  }

  const quickExpireOptions = [
    { label: '1 ay', months: 1 }, { label: '3 ay', months: 3 },
    { label: '6 ay', months: 6 }, { label: '1 il', months: 12 }, { label: '2 il', months: 24 },
  ]
  const handleQuickExpireSelect = (months) => {
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    setNewCareer((p) => ({ ...p, expireDate: formatAz(d) }))
  }

  const renderCalendar = (field, monthState) => {
    const days = generateCalendarDays(monthState)
    const today = new Date()
    const selected = field === 'postDate' ? parseAzDate(newCareer.date) : parseAzDate(newCareer.expireDate)
    return (
      <div className="date-picker-popup" onClick={(e) => e.stopPropagation()}>
        <div className="date-picker-header">
          <button type="button" className="nav-btn" onClick={() => navigateMonth(-1, field)}>‹</button>
          <h4>{azerbaijaniMonths[monthState.getMonth()]} {monthState.getFullYear()}</h4>
          <button type="button" className="nav-btn" onClick={() => navigateMonth(1, field)}>›</button>
          <button type="button" className="close-picker-btn" onClick={() => setShowDatePicker(null)}>✕</button>
        </div>

        {field === 'expireDate' && (
          <div className="quick-date-options">
            <h5>Sürətli seçim</h5>
            <div className="quick-buttons">
              {quickExpireOptions.map((o) => (
                <button key={o.label} type="button" className="quick-date-btn"
                  onClick={() => handleQuickExpireSelect(o.months)}>{o.label}</button>
              ))}
            </div>
          </div>
        )}

        <div className="calendar-weekdays">
          {azerbaijaniWeekdays.map((d) => <div key={d} className="weekday">{d}</div>)}
        </div>
        <div className="calendar-grid">
          {days.map((date, i) => {
            const isCurrentMonth = date.getMonth() === monthState.getMonth()
            const isToday = date.toDateString() === today.toDateString()
            const isSelected = selected &&
              date.getDate() === selected.day &&
              date.getMonth() === selected.monthIndex &&
              date.getFullYear() === selected.year
            return (
              <button key={i} type="button" disabled={!isCurrentMonth}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => isCurrentMonth && handleDateSelect(date, field)}>
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Display newest-first too, so the admin list matches the order the site will
  // show after publish (pinned CV entry first, then by date descending).
  const visibleCareers = orderByDate(careers.filter((c) => c.isVisible))
  const hiddenCareers = orderByDate(careers.filter((c) => !c.isVisible))

  // NOTE: card markup is inlined into the .map() calls below on purpose.
  // styled-jsx only scopes CSS to elements in this component's own return tree,
  // so rendering cards via a separate sub-component would leave them unstyled.
  const renderCareerCard = (career) => (
    <div key={career.id} className={`career-item ${!career.isVisible ? 'is-hidden' : ''}`}>
      <div className="career-info">
        <div className="career-head">
          <h3>{career.title}</h3>
          <span className={`status ${career.isVisible ? 'visible' : 'hidden'}`}>
            {career.isVisible ? 'Aktiv' : 'Arxiv'}
          </span>
        </div>
        <p className="preview">{(career.descriptionContent || '').replace(/\s+/g, ' ').slice(0, 130)}…</p>
        <div className="meta">
          <span>📅 {career.date}</span>
          <span>⏳ {career.expireDate}</span>
          <span>📍 {career.location}</span>
          <span>💼 {career.type}</span>
          <span>👁 {career.view}</span>
          {career.link ? <span>🔗 Link</span> : null}
        </div>
      </div>
      <div className="career-actions">
        <button className="btn btn-secondary" onClick={() => handleEdit(career)}>Düzəliş</button>
        <button className="btn btn-ghost" onClick={() => toggleCareerVisibility(career.id)}>
          {career.isVisible ? 'Gizlət' : 'Göstər'}
        </button>
        <button className="btn btn-danger" onClick={() => handleDelete(career.id)}>Sil</button>
      </div>
    </div>
  )

  return (
    <div className="career-panel" onClick={() => showDatePicker && setShowDatePicker(null)}>
      {hasUnsavedChanges && (
        <div className="publish-bar">
          <div className="publish-content">
            <span className="unsaved-changes">Yadda saxlanmamış dəyişikliklər var</span>
            <div className="publish-actions">
              <button className="btn btn-secondary" onClick={discardChanges}>Ləğv et</button>
              <button className="btn btn-primary" onClick={publishChanges} disabled={loading}>
                {loading ? 'Yüklənir…' : 'Dərc et'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        {/* ---------- Form ---------- */}
        <section className="card form-section" onClick={(e) => e.stopPropagation()}>
          <h2>{editingId !== null ? 'Vəzifəni redaktə et' : 'Yeni vəzifə'}</h2>

          <div className="form-group">
            <label>Başlıq</label>
            <input type="text" value={newCareer.title}
              onChange={(e) => setNewCareer((p) => ({ ...p, title: e.target.value }))}
              placeholder="Vəzifənin adı" />
          </div>

          <div className="form-group">
            <label>Təsvir</label>
            <textarea rows="6" value={newCareer.description}
              onChange={(e) => setNewCareer((p) => ({ ...p, description: e.target.value }))}
              placeholder="İş təsviri" />
            <small>Təsvir docs qovluğunda ayrıca mətn faylı kimi saxlanılır.</small>
          </div>

          <div className="form-group">
            <label>Dərc tarixi</label>
            <div className="date-input-container">
              <input type="text" readOnly value={newCareer.date}
                onClick={() => openPicker('postDate')} placeholder="Tarix seçin" className="date-input" />
              <button type="button" className="calendar-toggle-btn" onClick={() => openPicker('postDate')}>📅</button>
              {showDatePicker === 'postDate' && renderCalendar('postDate', currentMonth)}
            </div>
          </div>

          <div className="form-group">
            <label>Bitmə tarixi</label>
            <div className="date-input-container">
              <input type="text" readOnly value={newCareer.expireDate}
                onClick={() => openPicker('expireDate')} placeholder="Tarix seçin" className="date-input" />
              <button type="button" className="calendar-toggle-btn" onClick={() => openPicker('expireDate')}>📅</button>
              {showDatePicker === 'expireDate' && renderCalendar('expireDate', expireMonth)}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Yer</label>
              <input type="text" value={newCareer.location}
                onChange={(e) => setNewCareer((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>İş növü</label>
              <input type="text" value={newCareer.type}
                onChange={(e) => setNewCareer((p) => ({ ...p, type: e.target.value }))} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Baxış sayı</label>
              <input type="number" value={newCareer.view}
                onChange={(e) => setNewCareer((p) => ({ ...p, view: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Müraciət linki</label>
              <input type="text" value={newCareer.link}
                onChange={(e) => setNewCareer((p) => ({ ...p, link: e.target.value }))} placeholder="https://" />
            </div>
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={newCareer.isVisible}
              onChange={(e) => setNewCareer((p) => ({ ...p, isVisible: e.target.checked }))} />
            <span>Saytda göstər</span>
          </label>

          <div className="form-actions">
            {editingId !== null ? (
              <>
                <button className="btn btn-primary" onClick={handleSave}>Yadda saxla</button>
                <button className="btn btn-secondary" onClick={resetForm}>Ləğv et</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={handleAdd}>Vəzifə əlavə et</button>
            )}
          </div>
        </section>

        {/* ---------- List ---------- */}
        <section className="list-col" onClick={(e) => e.stopPropagation()}>
          <div className="list-block">
            <div className="list-header">
              <h2>Aktiv vəzifələr</h2>
              <span className="count">{visibleCareers.length}</span>
            </div>
            {loading && !careers.length ? (
              <p className="empty">Yüklənir…</p>
            ) : visibleCareers.length === 0 ? (
              <p className="empty">Aktiv vəzifə yoxdur. Birincini əlavə edin.</p>
            ) : (
              visibleCareers.map(renderCareerCard)
            )}
          </div>

          <div className="list-block">
            <div className="list-header">
              <h2>Arxiv <small>(backup.json)</small></h2>
              <span className="count muted">{hiddenCareers.length}</span>
            </div>
            {hiddenCareers.length === 0 ? (
              <p className="empty">Arxiv boşdur. Gizlədilən vəzifələr burada saxlanılır.</p>
            ) : (
              hiddenCareers.map(renderCareerCard)
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .career-panel { position: relative; }

        .publish-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: var(--surface);
          border-top: 1px solid var(--line);
          box-shadow: 0 -4px 24px rgba(0,0,0,.06);
          padding: 14px 28px;
        }
        .publish-content {
          display: flex; justify-content: space-between; align-items: center;
          max-width: 1200px; margin: 0 auto; gap: 16px;
        }
        .unsaved-changes { font-size: 13.5px; font-weight: 500; color: var(--ink-2); }
        .unsaved-changes::before {
          content: ''; display: inline-block; width: 8px; height: 8px;
          background: var(--blue); border-radius: 50%; margin-right: 9px; vertical-align: middle;
        }
        .publish-actions { display: flex; gap: 10px; }

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        .card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-md);
          box-shadow: var(--shadow-1);
        }
        .form-section { padding: 22px; position: sticky; top: 84px; }
        .form-section h2 { margin: 0 0 18px; font-size: 17px; letter-spacing: -.01em; }

        .form-group { margin-bottom: 16px; position: relative; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-group label {
          display: block; margin-bottom: 6px;
          font-size: 12.5px; font-weight: 500; color: var(--ink-2);
        }
        .form-group input,
        .form-group textarea {
          width: 100%; padding: 10px 12px;
          border: 1px solid var(--line-strong); border-radius: var(--r-sm);
          background: var(--surface-2); color: var(--ink);
          font: inherit; font-size: 14px; resize: vertical;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none; border-color: var(--blue); background: var(--surface);
          box-shadow: 0 0 0 3px var(--blue-soft);
        }
        small { display: block; margin-top: 6px; font-size: 11.5px; color: var(--ink-3); }

        .date-input-container { position: relative; }
        .date-input { cursor: pointer; padding-right: 40px !important; }
        .calendar-toggle-btn {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 16px; cursor: pointer; padding: 4px;
        }

        .switch-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 14px; color: var(--ink); margin: 4px 0 20px; cursor: pointer;
        }
        .switch-row input { width: 17px; height: 17px; accent-color: var(--blue); }

        .form-actions { display: flex; gap: 10px; }

        /* Date picker */
        .date-picker-popup {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 40;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--r-md); box-shadow: var(--shadow-pop); padding: 14px;
        }
        .date-picker-header {
          display: flex; align-items: center; gap: 6px; margin-bottom: 12px;
        }
        .date-picker-header h4 { flex: 1; margin: 0; font-size: 14px; text-align: center; }
        .nav-btn, .close-picker-btn {
          background: var(--surface-2); border: 1px solid var(--line);
          width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
          font-size: 16px; color: var(--ink-2); display: grid; place-items: center;
        }
        .nav-btn:hover, .close-picker-btn:hover { background: var(--blue-soft); color: var(--blue); }
        .quick-date-options { padding: 10px 0 12px; border-bottom: 1px solid var(--line); margin-bottom: 12px; }
        .quick-date-options h5 { margin: 0 0 8px; font-size: 11.5px; color: var(--ink-3); font-weight: 500; }
        .quick-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
        .quick-date-btn {
          background: var(--blue-soft); color: var(--blue); border: none;
          padding: 6px 11px; border-radius: var(--r-pill); cursor: pointer; font-size: 12px; font-weight: 500;
        }
        .quick-date-btn:hover { background: #dbe9fb; }
        .calendar-weekdays, .calendar-grid {
          display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
        }
        .weekday { text-align: center; font-size: 11px; font-weight: 600; color: var(--ink-3); padding: 6px 0; }
        .calendar-day {
          border: none; background: none; aspect-ratio: 1; border-radius: 8px;
          cursor: pointer; font-size: 13px; color: var(--ink);
          transition: background .12s ease, color .12s ease;
        }
        .calendar-day:hover:not(:disabled) { background: var(--blue-soft); }
        .calendar-day.today { color: var(--blue); font-weight: 700; }
        .calendar-day.selected { background: var(--blue); color: #fff; font-weight: 600; }
        .calendar-day.other-month { color: var(--line-strong); cursor: default; }

        /* List */
        .list-col { display: flex; flex-direction: column; gap: 22px; }
        .list-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
        .list-header h2 { margin: 0; font-size: 16px; letter-spacing: -.01em; }
        .list-header h2 small { font-size: 12px; color: var(--ink-3); font-weight: 400; }
        .count {
          font-size: 12px; font-weight: 600; color: var(--blue);
          background: var(--blue-soft); padding: 2px 9px; border-radius: var(--r-pill);
        }
        .count.muted { color: var(--ink-2); background: var(--surface-2); border: 1px solid var(--line); }
        .empty {
          color: var(--ink-3); font-size: 13.5px; padding: 22px;
          background: var(--surface-2); border: 1px dashed var(--line-strong); border-radius: var(--r-md);
        }

        .career-item {
          display: flex; gap: 16px; justify-content: space-between;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--r-md); padding: 16px 18px; margin-bottom: 12px;
          box-shadow: var(--shadow-1);
          transition: box-shadow .15s ease, transform .15s ease;
        }
        .career-item:hover { box-shadow: var(--shadow-2); transform: translateY(-1px); }
        .career-item.is-hidden { background: var(--surface-2); }
        .career-item.is-hidden .career-info { opacity: .68; }

        .career-info { min-width: 0; flex: 1; }
        .career-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .career-head h3 { margin: 0; font-size: 15px; letter-spacing: -.01em; }
        .preview { margin: 0 0 10px; font-size: 13px; color: var(--ink-2); line-height: 1.45; }
        .meta { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 12px; color: var(--ink-3); }

        .status {
          font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: var(--r-pill);
        }
        .status.visible { color: var(--green-ink); background: var(--green-soft); }
        .status.hidden { color: var(--ink-2); background: var(--surface-2); border: 1px solid var(--line); }

        .career-actions { display: flex; flex-direction: column; gap: 7px; flex: none; }
        .career-actions .btn { width: 100%; }

        @media (max-width: 1040px) {
          .grid { grid-template-columns: 1fr; }
          .form-section { position: static; }
        }
        @media (max-width: 560px) {
          .form-row { grid-template-columns: 1fr; }
          .career-item { flex-direction: column; }
          .career-actions { flex-direction: row; }
          .publish-bar { padding: 12px 16px; }
        }
      `}</style>
    </div>
  )
}

export default CareerPanel