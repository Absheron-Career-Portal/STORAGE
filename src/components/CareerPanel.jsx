import React, { useState, useEffect } from 'react'

const CareerPanel = () => {
  const [careers, setCareers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newCareer, setNewCareer] = useState({
    title: '',
    description: '',
    date: '',
    expireDate: '',
    location: 'Bakı, Azərbaycan',
    type: 'Tam iş günü',
    view: '0',
    link: '',
    isVisible: true
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
    const day = today.getDate()
    const month = azerbaijaniMonths[today.getMonth()]
    const year = today.getFullYear()
    const formattedDate = `${day} ${month}, ${year}`
    
    setNewCareer(prev => ({ ...prev, date: formattedDate }))
    
    const nextYear = new Date(today)
    nextYear.setFullYear(today.getFullYear() + 1)
    const expireDay = nextYear.getDate()
    const expireMonth = azerbaijaniMonths[nextYear.getMonth()]
    const expireYear = nextYear.getFullYear()
    const formattedExpireDate = `${expireDay} ${expireMonth}, ${expireYear}`
    
    setNewCareer(prev => ({ ...prev, expireDate: formattedExpireDate }))
  }

  const loadCareers = async () => {
    try {
      const response = await fetch('https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/data/career.json?t=' + Date.now())
      if (!response.ok) throw new Error(`Failed to load careers: ${response.status}`)

      const data = await response.json()
      console.log('📥 Loaded careers:', data)

      // Load description content for each career
      const careersWithDescriptions = await Promise.all(
        data.map(async (career) => {
          if (career.description && career.description.startsWith('../docs/')) {
            try {
              // Convert relative path to GitHub raw URL
              const fileName = career.description.replace('../docs/', '')
              const descResponse = await fetch(`https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/docs/${fileName}?t=${Date.now()}`)
              if (descResponse.ok) {
                const descriptionText = await descResponse.text()
                return { 
                  ...career, 
                  descriptionContent: descriptionText,
                  descriptionFile: career.description
                }
              }
            } catch (error) {
              console.error(`Error loading description for ${career.title}:`, error)
            }
          }
          return { 
            ...career, 
            descriptionContent: career.description || '',
            descriptionFile: career.description || ''
          }
        })
      )

      const fixedData = careersWithDescriptions.map(career => ({
        ...career,
        isVisible: career.isVisible === undefined ? true : career.isVisible
      }))

      setCareers(fixedData)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error loading careers:', error)
      const localCareers = localStorage.getItem('careers')
      if (localCareers) {
        const parsedCareers = JSON.parse(localCareers)
        setCareers(parsedCareers.map(career => ({
          ...career,
          descriptionContent: career.descriptionContent || career.description || '',
          descriptionFile: career.descriptionFile || career.description || ''
        })))
      }
    }
  }

const updateJSONFile = async (updatedCareers) => {
  try {
    console.log('🔄 Sending careers to GitHub API...')
    
    // Prepare careers for JSON (only file paths, not content)
    const careersForJSON = updatedCareers.map(career => ({
      id: career.id,
      dateImage: career.dateImage,
      date: career.date,
      expireDate: career.expireDate,
      location: career.location,
      type: career.type,
      typeImage: career.typeImage,
      view: career.view,
      title: career.title,
      description: career.descriptionFile, // Use file path instead of content
      isVisible: career.isVisible,
      link: career.link
    }))

    const baseUrl = window.location.origin
    const response = await fetch(`${baseUrl}/api/github/save-career`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        data: careersForJSON,
        action: 'save-career-json'  // Added action parameter
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ GitHub API response:', result)
    return result.success
  } catch (error) {
    console.error('❌ Error updating careers via GitHub:', error)
    return false
  }
}

const saveDescriptionToFile = async (description, fileName, retryCount = 0) => {
  try {
    console.log('📝 Saving description to file:', fileName)
    const baseUrl = window.location.origin
    const response = await fetch(`${baseUrl}/api/github/save-career`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileName: fileName,
        content: description,
        action: 'save-description'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      // If it's a 409 error and we haven't retried too many times
      if (response.status === 409 && retryCount < 3) {
        console.log(`🔄 Retrying ${fileName} due to SHA conflict (attempt ${retryCount + 1})`)
        // Wait a bit before retrying (increasing delay)
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)))
        return saveDescriptionToFile(description, fileName, retryCount + 1)
      }
      
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Description file saved:', result)
    return result.success
  } catch (error) {
    console.error('❌ Error saving description file:', error)
    return false
  }
}

  const generateFileName = (title) => {
    // Convert title to safe filename
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9əüöğıçş\s]/g, '')
      .replace(/ə/g, 'e')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ç/g, 'c')
      .replace(/ş/g, 's')
      .replace(/\s+/g, '')
      .trim()
    
    return `${safeTitle}.txt`
  }

  const saveCareersLocally = (updatedCareers) => {
    try {
      console.log('💾 Saving careers locally:', updatedCareers)
      setCareers(updatedCareers)
      localStorage.setItem('careers', JSON.stringify(updatedCareers))
      setHasUnsavedChanges(true)
    } catch (error) {
      console.error('Error saving careers:', error)
    }
  }

const publishChanges = async () => {
  try {
    setLoading(true)
    
    // Process description files SEQUENTIALLY to avoid SHA conflicts
    let failedFiles = []
    
    for (let i = 0; i < careers.length; i++) {
      const career = careers[i]
      if (career.descriptionFile && career.descriptionContent) {
        const fileName = career.descriptionFile.replace('../docs/', '')
        console.log(`📝 Saving description ${i + 1}/${careers.length}: ${fileName}`)
        
        const success = await saveDescriptionToFile(career.descriptionContent, fileName)
        
        if (!success) {
          failedFiles.push(career.title)
          console.error(`❌ Failed to save description for: ${career.title}`)
        } else {
          console.log(`✅ Successfully saved description for: ${career.title}`)
        }
        
        // Add delay between requests to reduce conflict chances
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    if (failedFiles.length > 0) {
      alert(`Failed to save description files for: ${failedFiles.join(', ')}\n\nCheck console for details.`)
      return
    }
    
    // Then update the JSON file
    const jsonUpdated = await updateJSONFile(careers)
    
    if (jsonUpdated) {
      alert('Changes published successfully! JSON file and description files updated.')
      setHasUnsavedChanges(false)
    } else {
      alert('Failed to publish changes! Check console for errors.')
    }
  } catch (error) {
    console.error('Error publishing changes:', error)
    alert('Error publishing changes: ' + error.message)
  } finally {
    setLoading(false)
  }
}
  const discardChanges = () => {
    if (window.confirm('Are you sure you want to discard all unsaved changes?')) {
      loadCareers()
      setHasUnsavedChanges(false)
    }
  }

  const handleEdit = (career) => {
    setEditingId(career.id)
    setNewCareer({
      title: career.title,
      description: career.descriptionContent || '', // Use the actual content for editing
      date: career.date,
      expireDate: career.expireDate || '',
      location: career.location || 'Bakı, Azərbaycan',
      type: career.type || 'Tam iş günü',
      view: career.view?.toString() || '0',
      link: career.link || '',
      isVisible: career.isVisible === undefined ? true : career.isVisible
    })
  }

  const handleSave = () => {
    const updatedCareers = careers.map(career => 
      career.id === editingId 
        ? {
            ...career,
            title: newCareer.title,
            descriptionContent: newCareer.description, // Update the content
            date: newCareer.date,
            expireDate: newCareer.expireDate,
            location: newCareer.location,
            type: newCareer.type,
            view: parseInt(newCareer.view) || 0,
            link: newCareer.link,
            isVisible: newCareer.isVisible
          }
        : career
    )
    saveCareersLocally(updatedCareers)
    setEditingId(null)
    resetForm()
  }

  const handleAdd = async () => {
    if (!newCareer.title.trim()) {
      alert('Please enter a title')
      return
    }

    if (!newCareer.description.trim()) {
      alert('Please enter a description')
      return
    }

    const newId = careers.length > 0 ? Math.max(...careers.map(c => c.id)) + 1 : 1
    const fileName = generateFileName(newCareer.title)
    const filePath = `../docs/${fileName}`

    const newCareerItem = {
      id: newId,
      title: newCareer.title,
      description: newCareer.description, // Keep content for local editing
      descriptionContent: newCareer.description, // Store content for local editing
      descriptionFile: filePath, // Store file path for JSON
      dateImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg",
      date: newCareer.date,
      expireDate: newCareer.expireDate,
      location: newCareer.location,
      type: newCareer.type,
      typeImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/suitcase.svg",
      view: parseInt(newCareer.view) || 0,
      link: newCareer.link,
      isVisible: newCareer.isVisible
    }

    const updatedCareers = [...careers, newCareerItem]
    saveCareersLocally(updatedCareers)
    resetForm()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this career?')) {
      const updatedCareers = careers.filter(career => career.id !== id)
      saveCareersLocally(updatedCareers)
    }
  }

  const toggleCareerVisibility = (id) => {
    const updatedCareers = careers.map(career =>
      career.id === id ? { ...career, isVisible: !career.isVisible } : career
    )
    saveCareersLocally(updatedCareers)
  }

  const resetForm = () => {
    setNewCareer({
      title: '',
      description: '',
      date: '',
      expireDate: '',
      location: 'Bakı, Azərbaycan',
      type: 'Tam iş günü',
      view: '0',
      link: '',
      isVisible: true
    })
    setEditingId(null)
    setShowDatePicker(null)
    setTodayDates()
  }

  // Azerbaijani month names and weekdays
  const azerbaijaniMonths = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]

  const azerbaijaniWeekdays = ['B', 'Be', 'Ça', 'Ç', 'Ca', 'C', 'Ş']

  const handleDateSelect = (selectedDate, field) => {
    const day = selectedDate.getDate()
    const month = azerbaijaniMonths[selectedDate.getMonth()]
    const year = selectedDate.getFullYear()
    const formattedDate = `${day} ${month}, ${year}`
    
    if (field === 'postDate') {
      setNewCareer(prev => ({ ...prev, date: formattedDate }))
    } else if (field === 'expireDate') {
      setNewCareer(prev => ({ ...prev, expireDate: formattedDate }))
    }
    
    setShowDatePicker(null)
  }

  const generateCalendarDays = (month) => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    
    const firstDay = new Date(year, monthIndex, 1)
    const lastDay = new Date(year, monthIndex + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    const startingDay = firstDay.getDay()
    const days = []

    // Previous month days
    const prevMonthLastDay = new Date(year, monthIndex, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(new Date(year, monthIndex - 1, prevMonthLastDay - i))
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, monthIndex, i))
    }

    // Next month days
    const totalCells = 42 // 6 weeks
    const nextMonthDays = totalCells - days.length
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push(new Date(year, monthIndex + 1, i))
    }

    return days
  }

  const navigateMonth = (direction, calendarType) => {
    if (calendarType === 'postDate') {
      setCurrentMonth(prev => {
        const newMonth = new Date(prev)
        newMonth.setMonth(prev.getMonth() + direction)
        return newMonth
      })
    } else if (calendarType === 'expireDate') {
      setExpireMonth(prev => {
        const newMonth = new Date(prev)
        newMonth.setMonth(prev.getMonth() + direction)
        return newMonth
      })
    }
  }

  // Quick date options for expire date
  const quickExpireOptions = [
    { label: '1 ay', months: 1 },
    { label: '3 ay', months: 3 },
    { label: '6 ay', months: 6 },
    { label: '1 il', months: 12 },
    { label: '2 il', months: 24 }
  ]

  const handleQuickExpireSelect = (months) => {
    const today = new Date()
    const expireDate = new Date(today)
    expireDate.setMonth(today.getMonth() + months)
    
    const day = expireDate.getDate()
    const month = azerbaijaniMonths[expireDate.getMonth()]
    const year = expireDate.getFullYear()
    const formattedDate = `${day} ${month}, ${year}`
    
    setNewCareer(prev => ({ ...prev, expireDate: formattedDate }))
  }

  const postCalendarDays = generateCalendarDays(currentMonth)
  const expireCalendarDays = generateCalendarDays(expireMonth)
  const today = new Date()

  return (
    <div className="career-panel">
      {/* Publish Button */}
      {hasUnsavedChanges && (
        <div className="publish-bar">
          <div className="publish-content">
            <span className="unsaved-changes">⚠️ You have unsaved changes</span>
            <div className="publish-actions">
              <button className="discard-btn" onClick={discardChanges}>
                Cancel Changes
              </button>
              <button className="publish-btn" onClick={publishChanges}>
                📢 Publish All Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}
      
      <div className="form-section">
        <h2>{editingId !== null ? 'Edit Career' : 'Add New Career'}</h2>
        
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={newCareer.title}
            onChange={(e) => setNewCareer(prev => ({...prev, title: e.target.value}))}
            placeholder="Enter career title"
          />
        </div>

        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={newCareer.description}
            onChange={(e) => setNewCareer(prev => ({...prev, description: e.target.value}))}
            placeholder="Enter job description"
            rows="6"
          />
          <small>Description will be saved as a separate text file in the docs folder</small>
        </div>

        {/* Rest of the form remains the same */}
        <div className="form-group">
          <label>Post Date:</label>
          <div className="date-input-container">
            <input
              type="text"
              value={newCareer.date}
              readOnly
              onClick={() => setShowDatePicker('postDate')}
              placeholder="Click to select date"
              className="date-input"
            />
            <button 
              type="button" 
              className="calendar-toggle-btn"
              onClick={() => setShowDatePicker(showDatePicker === 'postDate' ? null : 'postDate')}
            >
              📅
            </button>
            
            {showDatePicker === 'postDate' && (
              <div className="date-picker-popup">
                <div className="date-picker-header">
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => navigateMonth(-1, 'postDate')}
                  >
                    ‹
                  </button>
                  <h4>{azerbaijaniMonths[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h4>
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => navigateMonth(1, 'postDate')}
                  >
                    ›
                  </button>
                  <button 
                    type="button" 
                    className="close-picker-btn"
                    onClick={() => setShowDatePicker(null)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="calendar-weekdays">
                  {azerbaijaniWeekdays.map(day => (
                    <div key={day} className="weekday">{day}</div>
                  ))}
                </div>
                
                <div className="calendar-grid">
                  {postCalendarDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                    const isToday = date.toDateString() === today.toDateString()
                    const isSelected = newCareer.date.includes(date.getDate().toString()) && 
                                      newCareer.date.includes(azerbaijaniMonths[date.getMonth()])
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => isCurrentMonth && handleDateSelect(date, 'postDate')}
                        disabled={!isCurrentMonth}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <small>Format: 1 Sentyabr, 2024 (Azerbaijani format)</small>
        </div>

        <div className="form-group">
          <label>Expire Date:</label>
          <div className="date-input-container">
            <input
              type="text"
              value={newCareer.expireDate}
              readOnly
              onClick={() => setShowDatePicker('expireDate')}
              placeholder="Click to select date"
              className="date-input"
            />
            <button 
              type="button" 
              className="calendar-toggle-btn"
              onClick={() => setShowDatePicker(showDatePicker === 'expireDate' ? null : 'expireDate')}
            >
              📅
            </button>
            
            {showDatePicker === 'expireDate' && (
              <div className="date-picker-popup">
                <div className="date-picker-header">
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => navigateMonth(-1, 'expireDate')}
                  >
                    ‹
                  </button>
                  <h4>{azerbaijaniMonths[expireMonth.getMonth()]} {expireMonth.getFullYear()}</h4>
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => navigateMonth(1, 'expireDate')}
                  >
                    ›
                  </button>
                  <button 
                    type="button" 
                    className="close-picker-btn"
                    onClick={() => setShowDatePicker(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="quick-date-options">
                  <h5>Sürətli seçim:</h5>
                  <div className="quick-buttons">
                    {quickExpireOptions.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        className="quick-date-btn"
                        onClick={() => handleQuickExpireSelect(option.months)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="calendar-weekdays">
                  {azerbaijaniWeekdays.map(day => (
                    <div key={day} className="weekday">{day}</div>
                  ))}
                </div>
                
                <div className="calendar-grid">
                  {expireCalendarDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === expireMonth.getMonth()
                    const isToday = date.toDateString() === today.toDateString()
                    const isSelected = newCareer.expireDate.includes(date.getDate().toString()) && 
                                      newCareer.expireDate.includes(azerbaijaniMonths[date.getMonth()])
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => isCurrentMonth && handleDateSelect(date, 'expireDate')}
                        disabled={!isCurrentMonth}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <small>Format: 1 Oktyabr, 2026 (Azerbaijani format) - Automatically set to 1 year from today</small>
        </div>

        <div className="form-group">
          <label>Location:</label>
          <input
            type="text"
            value={newCareer.location}
            onChange={(e) => setNewCareer(prev => ({...prev, location: e.target.value}))}
            placeholder="Enter location"
          />
        </div>

        <div className="form-group">
          <label>Job Type:</label>
          <input
            type="text"
            value={newCareer.type}
            onChange={(e) => setNewCareer(prev => ({...prev, type: e.target.value}))}
            placeholder="Enter job type"
          />
        </div>

        <div className="form-group">
          <label>Views:</label>
          <input
            type="number"
            value={newCareer.view}
            onChange={(e) => setNewCareer(prev => ({...prev, view: e.target.value}))}
            placeholder="Enter view count"
          />
        </div>

        <div className="form-group">
          <label>Application Link:</label>
          <input
            type="text"
            value={newCareer.link}
            onChange={(e) => setNewCareer(prev => ({...prev, link: e.target.value}))}
            placeholder="Enter application URL"
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newCareer.isVisible}
              onChange={(e) => setNewCareer(prev => ({...prev, isVisible: e.target.checked}))}
            />
            Show this career on website
          </label>
        </div>

        <div className="form-actions">
          {editingId !== null ? (
            <>
              <button className="save-btn" onClick={handleSave}>Save Changes</button>
              <button className="cancel-btn" onClick={resetForm}>Cancel</button>
            </>
          ) : (
            <button className="add-btn" onClick={handleAdd}>Add Career</button>
          )}
        </div>
      </div>

      <div className="careers-list">
        <h2>Existing Careers ({careers.length})</h2>
        {loading ? (
          <p>Loading careers...</p>
        ) : careers.length === 0 ? (
          <p>No careers found. Add your first career!</p>
        ) : (
          careers.map(career => (
            <div key={career.id} className={`career-item ${!career.isVisible ? 'hidden' : ''}`}>
              <div className="career-info">
                <h3>{career.title}</h3>
                <p><strong>Description File:</strong> {career.descriptionFile || 'No file'}</p>
                <p><strong>Content Preview:</strong> {career.descriptionContent?.substring(0, 100)}...</p>
                <p><strong>Date:</strong> {career.date}</p>
                <p><strong>Expire:</strong> {career.expireDate}</p>
                <p><strong>Location:</strong> {career.location}</p>
                <p><strong>Type:</strong> {career.type}</p>
                <p><strong>Views:</strong> {career.view}</p>
                <p><strong>Link:</strong> {career.link ? 'Yes' : 'No'}</p>
                <p><strong>Status:</strong> 
                  <span className={`status ${career.isVisible ? 'visible' : 'hidden'}`}>
                    {career.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </p>
              </div>
              <div className="career-actions">
                <button className="edit-btn" onClick={() => handleEdit(career)}>Edit</button>
                <button 
                  className={`visibility-btn ${career.isVisible ? 'hide-btn' : 'show-btn'}`}
                  onClick={() => toggleCareerVisibility(career.id)}
                >
                  {career.isVisible ? 'Hide' : 'Show'}
                </button>
                <button className="delete-btn" onClick={() => handleDelete(career.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        /* Your existing CSS styles remain the same */
        .career-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          padding: 20px;
          padding-bottom: 80px;
        }
        
        .publish-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffc107;
          padding: 1rem;
          z-index: 1000;
          border-top: 2px solid #e0a800;
        }
        
        .publish-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .publish-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        .unsaved-changes {
          font-weight: bold;
          color: #856404;
        }
        
        .publish-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .publish-btn:hover {
          background: #218838;
        }
        
        .discard-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .discard-btn:hover {
          background: #5a6268;
        }
        
        .form-section {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        
        .form-group {
          margin-bottom: 15px;
          position: relative;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        
        .date-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .date-input {
          flex: 1;
          padding-right: 2.5rem;
          cursor: pointer;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
        }
        
        .calendar-toggle-btn {
          position: absolute;
          right: 0.5rem;
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .date-picker-popup {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 1000;
          margin-top: 0.5rem;
          padding: 1rem;
        }
        
        .date-picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .nav-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
        }
        
        .nav-btn:hover {
          background: #f0f0f0;
          border-radius: 4px;
        }
        
        .close-picker-btn {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .quick-date-options {
          padding: 0.75rem;
          border-bottom: 1px solid #eee;
          background: #f0f8ff;
          margin-bottom: 1rem;
        }
        
        .quick-date-options h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.8rem;
          color: #666;
        }
        
        .quick-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .quick-date-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        }
        
        .quick-date-btn:hover {
          background: #0056b3;
        }
        
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          margin-bottom: 0.5rem;
        }
        
        .weekday {
          text-align: center;
          font-weight: bold;
          font-size: 0.8rem;
          color: #666;
          padding: 0.5rem;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        
        .calendar-day {
          border: none;
          background: none;
          padding: 0.75rem;
          cursor: pointer;
          border-radius: 4px;
          font-size: 0.9rem;
        }
        
        .calendar-day:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }
        
        .calendar-day.today {
          background: #e7f3ff;
          font-weight: bold;
        }
        
        .calendar-day.selected {
          background: #28a745;
          color: white;
        }
        
        .calendar-day.other-month {
          color: #ccc;
          cursor: not-allowed;
        }
        
        .calendar-day:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: normal;
        }
        
        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .save-btn, .add-btn {
          background: #0070f3;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .cancel-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .careers-list {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }
        
        .career-item {
          border: 1px solid #eee;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .career-item.hidden {
          background: #f8f9fa;
          opacity: 0.7;
        }
        
        .career-info {
          flex: 1;
        }
        
        .career-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .edit-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .visibility-btn {
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .hide-btn {
          background: #ffc107;
          color: black;
        }
        
        .show-btn {
          background: #17a2b8;
          color: white;
        }
        
        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .status {
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .status.visible {
          background: #d4edda;
          color: #155724;
        }
        
        .status.hidden {
          background: #f8d7da;
          color: #721c24;
        }
        
        .loading {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #0070f3;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 1000;
        }
        
        small {
          color: #666;
          font-size: 0.8rem;
          display: block;
          margin-top: 0.25rem;
        }
        
        @media (max-width: 768px) {
          .career-panel {
            grid-template-columns: 1fr;
          }
          
          .quick-buttons {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default CareerPanel