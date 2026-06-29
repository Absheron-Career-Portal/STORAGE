import React, { useState, useEffect } from 'react'

const azerbaijaniMonths = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
]
const azerbaijaniWeekdays = ['B', 'Be', 'Ça', 'Ç', 'Ca', 'C', 'Ş']

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

const ActivityPanel = () => {
  const [activities, setActivities] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newActivity, setNewActivity] = useState({
    title: '', extendedDescription: '', date: '', image: '', additionalImages: [''], isVisible: true,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadActivities()
    setTodayDate()
  }, [])

  const setTodayDate = () => setNewActivity((p) => ({ ...p, date: formatAz(new Date()) }))

  const loadActivities = async () => {
    try {
      const response = await fetch('https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/data/activity.json?t=' + Date.now())
      if (!response.ok) throw new Error(`Failed to load activities: ${response.status}`)
      const data = await response.json()
      setActivities(data.map((a) => ({ ...a, isVisible: a.isVisible === undefined ? true : a.isVisible })))
    } catch (error) {
      console.error('Error loading activities:', error)
      const local = localStorage.getItem('activities')
      if (local) setActivities(JSON.parse(local))
    }
  }

  const updateJSONFile = async (updated) => {
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/github/save-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updated }),
      })
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error updating activities via GitHub:', error)
      return false
    }
  }

  const uploadImage = async (file, folderName, imageNumber) => {
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Image too large. Maximum size is 2MB.')
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const compressedBase64 = await compressImage(base64Image, 0.7)
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/github/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64, folderName, imageNumber, baseFolder: 'image/social' }),
      })
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
      return await response.json()
    } catch (error) {
      console.error('Error uploading image:', error)
      return { success: false, error: error.message || 'Upload failed' }
    }
  }

  const compressImage = (base64String, quality = 0.7) =>
    new Promise((resolve) => {
      const img = new Image()
      img.src = base64String
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        let { width, height } = img
        const maxWidth = 1200
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(base64String)
    })

  const saveActivitiesLocally = (updated) => {
    setActivities(updated)
    localStorage.setItem('activities', JSON.stringify(updated))
    setHasUnsavedChanges(true)
  }

  const publishChanges = async () => {
    try {
      const ok = await updateJSONFile(activities)
      if (ok) {
        alert('Published. activity.json is up to date.')
        setHasUnsavedChanges(false)
      } else {
        alert('Could not publish. Check the console for details.')
      }
    } catch (error) {
      alert('Could not publish: ' + error.message)
    }
  }

  const discardChanges = () => {
    if (window.confirm('Discard all unsaved changes and reload from GitHub?')) {
      loadActivities()
      setHasUnsavedChanges(false)
    }
  }

  const handleImageUpload = async (event, isAdditional = false, index = null) => {
    const file = event.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Please choose an image file.')
    if (file.size > 2 * 1024 * 1024) return alert('Image too large. Choose one under 2MB.')

    setUploadingImage(true)
    try {
      let folderName
      if (editingId !== null) folderName = `activity_${editingId}`
      else if (newActivity.title) folderName = newActivity.title.toLowerCase().replace(/[^a-z0-9]/g, '_')
      else folderName = 'temp_activity'

      const imageNumber = isAdditional ? `${index + 1}` : '0'
      const result = await uploadImage(file, folderName, imageNumber)

      if (result.success) {
        const imagePath = result.path
        if (isAdditional) {
          setNewActivity((prev) => ({
            ...prev,
            additionalImages: prev.additionalImages.map((img, i) => (i === index ? imagePath : img)),
          }))
        } else {
          setNewActivity((prev) => ({ ...prev, image: imagePath }))
        }
      } else {
        alert('Could not upload image: ' + (result.error || 'unknown error'))
      }
    } catch (error) {
      alert('Could not upload image: ' + error.message)
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleEdit = (activity) => {
    setEditingId(activity.id)
    setNewActivity({
      title: activity.title,
      extendedDescription: activity.extendedDescription,
      date: activity.date,
      image: activity.image,
      additionalImages: activity.additionalImages && activity.additionalImages.length > 0
        ? [...activity.additionalImages] : [''],
      isVisible: activity.isVisible === undefined ? true : activity.isVisible,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = () => {
    const updated = activities.map((activity) =>
      activity.id === editingId
        ? {
            ...activity,
            ...newActivity,
            description: newActivity.extendedDescription.substring(0, 100) + '...',
            imageTotal: newActivity.additionalImages.filter((img) => img.trim() !== '').length.toString(),
            isVisible: newActivity.isVisible,
          }
        : activity
    )
    saveActivitiesLocally(updated)
    resetForm()
  }

  const handleAdd = () => {
    const newId = activities.length ? Math.max(...activities.map((a) => a.id)) + 1 : 1
    const item = {
      id: newId,
      image: newActivity.image,
      linkImage: 'https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/landscape.crop.rectangle.svg',
      imageTotal: newActivity.additionalImages.filter((img) => img.trim() !== '').length.toString(),
      dateImage: 'https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg',
      date: newActivity.date,
      title: newActivity.title,
      description: newActivity.extendedDescription.substring(0, 100) + '...',
      additionalImages: newActivity.additionalImages.filter((img) => img.trim() !== ''),
      extendedDescription: newActivity.extendedDescription,
      isVisible: newActivity.isVisible,
    }
    saveActivitiesLocally([...activities, item])
    resetForm()
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this activity permanently?')) {
      saveActivitiesLocally(activities.filter((a) => a.id !== id))
    }
  }

  const toggleActivityVisibility = (id) => {
    saveActivitiesLocally(activities.map((a) => (a.id === id ? { ...a, isVisible: !a.isVisible } : a)))
  }

  const resetForm = () => {
    setNewActivity({ title: '', extendedDescription: '', date: '', image: '', additionalImages: [''], isVisible: true })
    setEditingId(null)
    setShowDatePicker(false)
    setTodayDate()
  }

  const addImageField = () => setNewActivity((p) => ({ ...p, additionalImages: [...p.additionalImages, ''] }))
  const removeImageField = (index) => {
    if (newActivity.additionalImages.length > 1) {
      setNewActivity((p) => ({ ...p, additionalImages: p.additionalImages.filter((_, i) => i !== index) }))
    }
  }
  const updateImageField = (index, value) =>
    setNewActivity((p) => ({ ...p, additionalImages: p.additionalImages.map((img, i) => (i === index ? value : img)) }))

  const openPicker = () => {
    if (showDatePicker) return setShowDatePicker(false)
    setCurrentMonth(azDateToObj(newActivity.date))
    setShowDatePicker(true)
  }

  const handleDateSelect = (selectedDate) => {
    setNewActivity((p) => ({ ...p, date: formatAz(selectedDate) }))
    setShowDatePicker(false)
  }

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    const days = []
    for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthLastDay - i))
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) days.push(new Date(year, month + 1, i))
    return days
  }

  const navigateMonth = (direction) =>
    setCurrentMonth((prev) => {
      const m = new Date(prev)
      m.setMonth(prev.getMonth() + direction)
      return m
    })

  const fixImageUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/image/')) {
      return `https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/refs/heads/main/public${url}`
    }
    return url
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()
  const selected = parseAzDate(newActivity.date)

  const visibleActivities = activities.filter((a) => a.isVisible)
  const hiddenActivities = activities.filter((a) => !a.isVisible)

  const ActivityCard = ({ activity }) => (
    <div className={`activity-item ${!activity.isVisible ? 'is-hidden' : ''}`}>
      <div className="activity-thumb">
        <img src={fixImageUrl(activity.image)} alt={activity.title} loading="lazy" />
        {!activity.isVisible && <span className="thumb-tag">Arxiv</span>}
      </div>
      <div className="activity-info">
        <div className="activity-head">
          <h3>{activity.title}</h3>
          <span className={`status ${activity.isVisible ? 'visible' : 'hidden'}`}>
            {activity.isVisible ? 'Aktiv' : 'Arxiv'}
          </span>
        </div>
        <p className="preview">{activity.description}</p>
        <div className="meta">
          <span>📅 {activity.date}</span>
          <span>🖼 {activity.additionalImages ? activity.additionalImages.length : 0} şəkil</span>
        </div>
      </div>
      <div className="activity-actions">
        <button className="btn btn-secondary" onClick={() => handleEdit(activity)}>Düzəliş</button>
        <button className="btn btn-ghost" onClick={() => toggleActivityVisibility(activity.id)}>
          {activity.isVisible ? 'Gizlət' : 'Göstər'}
        </button>
        <button className="btn btn-danger" onClick={() => handleDelete(activity.id)}>Sil</button>
      </div>
    </div>
  )

  return (
    <div className="activity-panel" onClick={() => showDatePicker && setShowDatePicker(false)}>
      {hasUnsavedChanges && (
        <div className="publish-bar">
          <div className="publish-content">
            <span className="unsaved-changes">Yadda saxlanmamış dəyişikliklər var</span>
            <div className="publish-actions">
              <button className="btn btn-secondary" onClick={discardChanges}>Ləğv et</button>
              <button className="btn btn-primary" onClick={publishChanges}>Dərc et</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        <section className="card form-section" onClick={(e) => e.stopPropagation()}>
          <h2>{editingId !== null ? 'Fəaliyyəti redaktə et' : 'Yeni fəaliyyət'}</h2>

          <div className="form-group">
            <label>Başlıq</label>
            <input type="text" value={newActivity.title}
              onChange={(e) => setNewActivity((p) => ({ ...p, title: e.target.value }))}
              placeholder="Fəaliyyətin adı" />
          </div>

          <div className="form-group">
            <label>Təsvir</label>
            <textarea rows="4" value={newActivity.extendedDescription}
              onChange={(e) => setNewActivity((p) => ({ ...p, extendedDescription: e.target.value }))}
              placeholder="Tam təsvir" />
          </div>

          <div className="form-group">
            <label>Tarix</label>
            <div className="date-input-container">
              <input type="text" readOnly value={newActivity.date}
                onClick={openPicker} placeholder="Tarix seçin" className="date-input" />
              <button type="button" className="calendar-toggle-btn" onClick={openPicker}>📅</button>
              {showDatePicker && (
                <div className="date-picker-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="date-picker-header">
                    <button type="button" className="nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
                    <h4>{azerbaijaniMonths[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h4>
                    <button type="button" className="nav-btn" onClick={() => navigateMonth(1)}>›</button>
                    <button type="button" className="close-picker-btn" onClick={() => setShowDatePicker(false)}>✕</button>
                  </div>
                  <div className="calendar-weekdays">
                    {azerbaijaniWeekdays.map((d) => <div key={d} className="weekday">{d}</div>)}
                  </div>
                  <div className="calendar-grid">
                    {calendarDays.map((date, i) => {
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                      const isToday = date.toDateString() === today.toDateString()
                      const isSelected = selected &&
                        date.getDate() === selected.day &&
                        date.getMonth() === selected.monthIndex &&
                        date.getFullYear() === selected.year
                      return (
                        <button key={i} type="button" disabled={!isCurrentMonth}
                          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => isCurrentMonth && handleDateSelect(date)}>
                          {date.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Əsas şəkil</label>
            <div className="upload-box">
              <input type="text" value={newActivity.image}
                onChange={(e) => setNewActivity((p) => ({ ...p, image: e.target.value }))}
                placeholder="Şəkil URL və ya /image/social/.../0.jpg" />
              <div className="upload-row">
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} disabled={uploadingImage} />
                {uploadingImage && <span className="uploading">Yüklənir…</span>}
              </div>
              {newActivity.image && (
                <div className="image-preview">
                  <img src={fixImageUrl(newActivity.image)} alt="Preview" />
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Əlavə şəkillər</label>
            {newActivity.additionalImages.map((image, index) => (
              <div key={index} className="upload-box compact">
                <input type="text" value={image}
                  onChange={(e) => updateImageField(index, e.target.value)} placeholder="Şəkil URL" />
                <div className="upload-row">
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true, index)} disabled={uploadingImage} />
                  {newActivity.additionalImages.length > 1 && (
                    <button type="button" className="btn btn-danger" onClick={() => removeImageField(index)}>Sil</button>
                  )}
                </div>
                {image && <div className="image-preview small"><img src={fixImageUrl(image)} alt={`Preview ${index}`} /></div>}
              </div>
            ))}
            <button type="button" className="btn btn-secondary add-more" onClick={addImageField}>+ Şəkil əlavə et</button>
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={newActivity.isVisible}
              onChange={(e) => setNewActivity((p) => ({ ...p, isVisible: e.target.checked }))} />
            <span>Saytda göstər</span>
          </label>

          <div className="form-actions">
            {editingId !== null ? (
              <>
                <button className="btn btn-primary" onClick={handleSave}>Yadda saxla</button>
                <button className="btn btn-secondary" onClick={resetForm}>Ləğv et</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={handleAdd}>Fəaliyyət əlavə et</button>
            )}
          </div>
        </section>

        <section className="list-col" onClick={(e) => e.stopPropagation()}>
          <div className="list-block">
            <div className="list-header">
              <h2>Aktiv fəaliyyətlər</h2>
              <span className="count">{visibleActivities.length}</span>
            </div>
            {visibleActivities.length === 0 ? (
              <p className="empty">Aktiv fəaliyyət yoxdur. Birincini əlavə edin.</p>
            ) : (
              visibleActivities.map((a) => <ActivityCard key={a.id} activity={a} />)
            )}
          </div>

          <div className="list-block">
            <div className="list-header">
              <h2>Arxiv</h2>
              <span className="count muted">{hiddenActivities.length}</span>
            </div>
            {hiddenActivities.length === 0 ? (
              <p className="empty">Arxiv boşdur. Gizlədilən fəaliyyətlər burada görünür.</p>
            ) : (
              hiddenActivities.map((a) => <ActivityCard key={a.id} activity={a} />)
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .activity-panel { position: relative; }

        .publish-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: var(--surface); border-top: 1px solid var(--line);
          box-shadow: 0 -4px 24px rgba(0,0,0,.06); padding: 14px 28px;
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
          display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
          gap: 24px; align-items: start;
        }
        .card {
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--r-md); box-shadow: var(--shadow-1);
        }
        .form-section { padding: 22px; position: sticky; top: 84px; }
        .form-section h2 { margin: 0 0 18px; font-size: 17px; letter-spacing: -.01em; }

        .form-group { margin-bottom: 16px; position: relative; }
        .form-group label { display: block; margin-bottom: 6px; font-size: 12.5px; font-weight: 500; color: var(--ink-2); }
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group textarea {
          width: 100%; padding: 10px 12px; border: 1px solid var(--line-strong);
          border-radius: var(--r-sm); background: var(--surface-2); color: var(--ink);
          font: inherit; font-size: 14px; resize: vertical;
          transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none; border-color: var(--blue); background: var(--surface);
          box-shadow: 0 0 0 3px var(--blue-soft);
        }

        .date-input-container { position: relative; }
        .date-input { cursor: pointer; padding-right: 40px !important; }
        .calendar-toggle-btn {
          position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 16px; cursor: pointer; padding: 4px;
        }

        .upload-box {
          border: 1px solid var(--line); border-radius: var(--r-sm);
          padding: 12px; background: var(--surface-2); display: flex; flex-direction: column; gap: 10px;
        }
        .upload-box.compact { margin-bottom: 10px; }
        .upload-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .upload-row input[type="file"] { font-size: 12.5px; color: var(--ink-2); }
        .uploading { font-size: 12px; color: var(--blue); }
        .add-more { margin-top: 2px; }

        .image-preview { margin-top: 4px; }
        .image-preview img {
          width: 100%; max-height: 180px; object-fit: cover;
          border-radius: var(--r-sm); border: 1px solid var(--line);
        }
        .image-preview.small img { max-height: 110px; }

        .switch-row {
          display: flex; align-items: center; gap: 10px; font-size: 14px;
          color: var(--ink); margin: 4px 0 20px; cursor: pointer;
        }
        .switch-row input { width: 17px; height: 17px; accent-color: var(--blue); }
        .form-actions { display: flex; gap: 10px; }

        .date-picker-popup {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 40;
          background: var(--surface); border: 1px solid var(--line);
          border-radius: var(--r-md); box-shadow: var(--shadow-pop); padding: 14px;
        }
        .date-picker-header { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
        .date-picker-header h4 { flex: 1; margin: 0; font-size: 14px; text-align: center; }
        .nav-btn, .close-picker-btn {
          background: var(--surface-2); border: 1px solid var(--line);
          width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
          font-size: 16px; color: var(--ink-2); display: grid; place-items: center;
        }
        .nav-btn:hover, .close-picker-btn:hover { background: var(--blue-soft); color: var(--blue); }
        .calendar-weekdays, .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .weekday { text-align: center; font-size: 11px; font-weight: 600; color: var(--ink-3); padding: 6px 0; }
        .calendar-day {
          border: none; background: none; aspect-ratio: 1; border-radius: 8px;
          cursor: pointer; font-size: 13px; color: var(--ink); transition: background .12s ease, color .12s ease;
        }
        .calendar-day:hover:not(:disabled) { background: var(--blue-soft); }
        .calendar-day.today { color: var(--blue); font-weight: 700; }
        .calendar-day.selected { background: var(--blue); color: #fff; font-weight: 600; }
        .calendar-day.other-month { color: var(--line-strong); cursor: default; }

        .list-col { display: flex; flex-direction: column; gap: 22px; }
        .list-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
        .list-header h2 { margin: 0; font-size: 16px; letter-spacing: -.01em; }
        .count { font-size: 12px; font-weight: 600; color: var(--blue); background: var(--blue-soft); padding: 2px 9px; border-radius: var(--r-pill); }
        .count.muted { color: var(--ink-2); background: var(--surface-2); border: 1px solid var(--line); }
        .empty {
          color: var(--ink-3); font-size: 13.5px; padding: 22px;
          background: var(--surface-2); border: 1px dashed var(--line-strong); border-radius: var(--r-md);
        }

        .activity-item {
          display: grid; grid-template-columns: 92px 1fr auto; gap: 16px; align-items: start;
          background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-md);
          padding: 14px; margin-bottom: 12px; box-shadow: var(--shadow-1);
          transition: box-shadow .15s ease, transform .15s ease;
        }
        .activity-item:hover { box-shadow: var(--shadow-2); transform: translateY(-1px); }
        .activity-item.is-hidden { background: var(--surface-2); }
        .activity-item.is-hidden .activity-info { opacity: .68; }

        .activity-thumb { position: relative; width: 92px; height: 92px; border-radius: var(--r-sm); overflow: hidden; background: var(--surface-2); border: 1px solid var(--line); }
        .activity-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .thumb-tag {
          position: absolute; top: 5px; left: 5px; font-size: 10px; font-weight: 600;
          background: rgba(0,0,0,.6); color: #fff; padding: 2px 7px; border-radius: var(--r-pill);
        }

        .activity-info { min-width: 0; }
        .activity-head { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
        .activity-head h3 { margin: 0; font-size: 15px; letter-spacing: -.01em; }
        .preview { margin: 0 0 9px; font-size: 13px; color: var(--ink-2); line-height: 1.45; }
        .meta { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 12px; color: var(--ink-3); }

        .status { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: var(--r-pill); }
        .status.visible { color: var(--green-ink); background: var(--green-soft); }
        .status.hidden { color: var(--ink-2); background: var(--surface-2); border: 1px solid var(--line); }

        .activity-actions { display: flex; flex-direction: column; gap: 7px; }
        .activity-actions .btn { width: 100%; }

        @media (max-width: 1040px) {
          .grid { grid-template-columns: 1fr; }
          .form-section { position: static; }
        }
        @media (max-width: 560px) {
          .activity-item { grid-template-columns: 72px 1fr; }
          .activity-actions { grid-column: 1 / -1; flex-direction: row; }
          .publish-bar { padding: 12px 16px; }
        }
      `}</style>
    </div>
  )
}

export default ActivityPanel
