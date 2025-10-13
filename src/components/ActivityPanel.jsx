import React, { useState, useEffect } from 'react'

const ActivityPanel = () => {
  const [activities, setActivities] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newActivity, setNewActivity] = useState({
    title: '',
    extendedDescription: '',
    date: '',
    image: '',
    additionalImages: [''],
    isVisible: true
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadActivities()
    setTodayDate()
  }, [])

  const setTodayDate = () => {
    const today = new Date()
    const day = today.getDate()
    const month = azerbaijaniMonths[today.getMonth()]
    const year = today.getFullYear()
    const formattedDate = `${day} ${month}, ${year}`
    setNewActivity(prev => ({ ...prev, date: formattedDate }))
  }

  const loadActivities = async () => {
    try {
      const response = await fetch('https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/data/activity.json?t=' + Date.now())
      if (!response.ok) throw new Error(`Failed to load activities: ${response.status}`)

      const data = await response.json()
      console.log('📥 Loaded activities:', data)

      const fixedData = data.map(activity => ({
        ...activity,
        isVisible: activity.isVisible === undefined ? true : activity.isVisible
      }))

      setActivities(fixedData)
    } catch (error) {
      console.error('Error loading activities:', error)
      const localActivities = localStorage.getItem('activities')
      if (localActivities) setActivities(JSON.parse(localActivities))
    }
  }

  const updateJSONFile = async (updatedActivities) => {
    try {
      console.log('🔄 Sending activities to GitHub API...')
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/github/save-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedActivities }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ GitHub API response:', result)
      return result.success
    } catch (error) {
      console.error('❌ Error updating activities via GitHub:', error)
      return false
    }
  }

  const uploadImage = async (file, folderName, imageNumber) => {
    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image too large. Maximum size is 2MB. Please compress your image.')
      }

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
        body: JSON.stringify({
          image: compressedBase64,
          folderName: folderName,
          imageNumber: imageNumber,
          baseFolder: 'image/social'
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ Error uploading image:', error)
      return { success: false, error: error.message || 'Upload failed' }
    }
  }

  const compressImage = (base64String, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = base64String
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        let { width, height } = img
        const maxWidth = 1200

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedBase64)
      }
      img.onerror = () => resolve(base64String)
    })
  }

  const saveActivities = async (updatedActivities) => {
    try {
      console.log('💾 Saving activities:', updatedActivities)
      setActivities(updatedActivities)
      localStorage.setItem('activities', JSON.stringify(updatedActivities))
      setHasUnsavedChanges(true)
      
      // Auto-save to JSON file but don't show alert
      await updateJSONFile(updatedActivities)
    } catch (error) {
      console.error('Error saving activities:', error)
    }
  }

  const publishChanges = async () => {
    try {
      const jsonUpdated = await updateJSONFile(activities)
      if (jsonUpdated) {
        alert('Changes published successfully! JSON file updated.')
        setHasUnsavedChanges(false)
      } else {
        alert('Failed to publish changes! Check console for errors.')
      }
    } catch (error) {
      console.error('Error publishing changes:', error)
      alert('Error publishing changes: ' + error.message)
    }
  }

  const handleImageUpload = async (event, isAdditional = false, index = null) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Please select an image smaller than 2MB.')
      return
    }

    setUploadingImage(true)
    try {
      let folderName
      if (editingId !== null) {
        folderName = `activity_${editingId}`
      } else if (newActivity.title) {
        folderName = newActivity.title.toLowerCase().replace(/[^a-z0-9]/g, '_')
      } else {
        folderName = 'temp_activity'
      }

      const imageNumber = isAdditional ? `${index + 1}` : '0'
      const result = await uploadImage(file, folderName, imageNumber)

      if (result.success) {
        const imagePath = result.path
        if (isAdditional) {
          setNewActivity(prev => ({
            ...prev,
            additionalImages: prev.additionalImages.map((img, i) => i === index ? imagePath : img)
          }))
        } else {
          setNewActivity(prev => ({ ...prev, image: imagePath }))
        }
      } else {
        alert('Failed to upload image: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error uploading image: ' + error.message)
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
      isVisible: activity.isVisible === undefined ? true : activity.isVisible
    })
  }

  const handleSave = () => {
    const updatedActivities = activities.map(activity =>
      activity.id === editingId
        ? {
            ...activity,
            ...newActivity,
            description: newActivity.extendedDescription.substring(0, 100) + '...',
            imageTotal: newActivity.additionalImages.filter(img => img.trim() !== '').length.toString(),
            isVisible: newActivity.isVisible
          }
        : activity
    )
    saveActivities(updatedActivities)
    setEditingId(null)
    resetForm()
  }

  const handleAdd = () => {
    const newId = activities.length > 0 ? Math.max(...activities.map(a => a.id)) + 1 : 1
    const newActivityItem = {
      id: newId,
      image: newActivity.image,
      linkImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/landscape.crop.rectangle.svg",
      imageTotal: newActivity.additionalImages.filter(img => img.trim() !== '').length.toString(),
      dateImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg",
      date: newActivity.date,
      title: newActivity.title,
      description: newActivity.extendedDescription.substring(0, 100) + '...',
      additionalImages: newActivity.additionalImages.filter(img => img.trim() !== ''),
      extendedDescription: newActivity.extendedDescription,
      isVisible: true
    }

    const updatedActivities = [...activities, newActivityItem]
    saveActivities(updatedActivities)
    resetForm()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      const updatedActivities = activities.filter(activity => activity.id !== id)
      saveActivities(updatedActivities)
    }
  }

  const toggleActivityVisibility = (id) => {
    const updatedActivities = activities.map(activity =>
      activity.id === id ? { ...activity, isVisible: !activity.isVisible } : activity
    )
    saveActivities(updatedActivities)
  }

  const resetForm = () => {
    setNewActivity({
      title: '',
      extendedDescription: '',
      date: '',
      image: '',
      additionalImages: [''],
      isVisible: true
    })
    setEditingId(null)
    setShowDatePicker(false)
    setTodayDate()
  }

  const addImageField = () => {
    setNewActivity(prev => ({
      ...prev,
      additionalImages: [...prev.additionalImages, '']
    }))
  }

  const removeImageField = (index) => {
    if (newActivity.additionalImages.length > 1) {
      setNewActivity(prev => ({
        ...prev,
        additionalImages: prev.additionalImages.filter((_, i) => i !== index)
      }))
    }
  }

  const updateImageField = (index, value) => {
    setNewActivity(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.map((img, i) => i === index ? value : img)
    }))
  }

  // Azerbaijani month names
  const azerbaijaniMonths = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]

  const azerbaijaniWeekdays = ['B', 'Be', 'Ça', 'Ç', 'Ca', 'C', 'Ş']

  const handleDateSelect = (selectedDate) => {
    const day = selectedDate.getDate()
    const month = azerbaijaniMonths[selectedDate.getMonth()]
    const year = selectedDate.getFullYear()
    const formattedDate = `${day} ${month}, ${year}`
    setNewActivity(prev => ({ ...prev, date: formattedDate }))
    setShowDatePicker(false)
  }

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    const startingDay = firstDay.getDay()
    const days = []

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay - i))
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    // Next month days
    const totalCells = 42 // 6 weeks
    const nextMonthDays = totalCells - days.length
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      newMonth.setMonth(prev.getMonth() + direction)
      return newMonth
    })
  }

  const fixImageUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/image/')) {
      const imagePath = url.substring(1)
      return `https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/refs/heads/main/public/${imagePath}`
    }
    return url
  }

  const calendarDays = generateCalendarDays()
  const currentMonthName = azerbaijaniMonths[currentMonth.getMonth()]
  const currentYear = currentMonth.getFullYear()
  const today = new Date()

  return (
    <div className="activity-panel">
      {/* Publish Button */}
      {hasUnsavedChanges && (
        <div className="publish-bar">
          <div className="publish-content">
            <span className="unsaved-changes">⚠️ You have unsaved changes</span>
            <button className="publish-btn" onClick={publishChanges}>
              📢 Publish All Changes
            </button>
          </div>
        </div>
      )}

      <div className="form-section">
        <h2>{editingId !== null ? 'Edit Activity' : 'Add New Activity'}</h2>

        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={newActivity.title}
            onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter activity title"
          />
        </div>

        <div className="form-group">
          <label>Extended Description:</label>
          <textarea
            value={newActivity.extendedDescription}
            onChange={(e) => setNewActivity(prev => ({ ...prev, extendedDescription: e.target.value }))}
            placeholder="Enter full description"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Date:</label>
          <div className="date-input-container">
            <input
              type="text"
              value={newActivity.date}
              readOnly
              onClick={() => setShowDatePicker(true)}
              placeholder="Click to select date"
              className="date-input"
            />
            <button 
              type="button" 
              className="calendar-toggle-btn"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              📅
            </button>
            
            {showDatePicker && (
              <div className="date-picker-popup">
                <div className="date-picker-header">
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => navigateMonth(-1)}
                  >
                    ‹
                  </button>
                  <h4>{currentMonthName} {currentYear}</h4>
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => navigateMonth(1)}
                  >
                    ›
                  </button>
                  <button 
                    type="button" 
                    className="close-picker-btn"
                    onClick={() => setShowDatePicker(false)}
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
                  {calendarDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                    const isToday = date.toDateString() === today.toDateString()
                    const isSelected = newActivity.date.includes(date.getDate().toString()) && 
                                      newActivity.date.includes(azerbaijaniMonths[date.getMonth()])
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => isCurrentMonth && handleDateSelect(date)}
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
          <small>Format: 1 Sentyabr, 2025 (Azerbaijani format)</small>
        </div>

        {/* Rest of the form remains the same */}
        <div className="form-group">
          <label>Main Image (0.jpg):</label>
          <div className="image-upload-section">
            <div className="image-upload-options">
              <div className="url-option">
                <label>URL:</label>
                <input
                  type="text"
                  value={newActivity.image}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="Enter image URL"
                />
                <small>Use relative paths like: /image/social/production/0.jpg</small>
              </div>
              <div className="upload-option">
                <label>Upload from Device:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, false)}
                  disabled={uploadingImage}
                />
                {uploadingImage && <span>Uploading...</span>}
                <small>Max 2MB</small>
              </div>
            </div>
            {newActivity.image && (
              <div className="image-preview">
                <img src={fixImageUrl(newActivity.image)} alt="Preview" className="preview-image" />
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Additional Images:</label>
          {newActivity.additionalImages.map((image, index) => (
            <div key={index} className="image-input-group">
              <div className="image-upload-options">
                <div className="url-option">
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => updateImageField(index, e.target.value)}
                    placeholder="Enter image URL"
                  />
                </div>
                <div className="upload-option">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true, index)}
                    disabled={uploadingImage}
                  />
                </div>
              </div>
              {image && (
                <div className="image-preview small">
                  <img src={fixImageUrl(image)} alt={`Preview ${index}`} className="preview-image" />
                </div>
              )}
              {newActivity.additionalImages.length > 1 && (
                <button type="button" className="remove-btn" onClick={() => removeImageField(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="add-btn" onClick={addImageField}>
            + Add Another Image
          </button>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newActivity.isVisible}
              onChange={(e) => setNewActivity(prev => ({ ...prev, isVisible: e.target.checked }))}
            />
            Show this activity on website
          </label>
        </div>

        <div className="form-actions">
          {editingId !== null ? (
            <>
              <button className="save-btn" onClick={handleSave}>Save Changes</button>
              <button className="cancel-btn" onClick={resetForm}>Cancel</button>
            </>
          ) : (
            <button className="add-btn" onClick={handleAdd}>Add Activity</button>
          )}
        </div>
      </div>

      <div className="activities-list">
        <h2>Existing Activities ({activities.length})</h2>
        {activities.length === 0 ? (
          <p>No activities found. Add your first activity!</p>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className={`activity-item ${!activity.isVisible ? 'hidden' : ''}`}>
              <div className="activity-preview">
                <div className="activity-image-container">
                  <img src={fixImageUrl(activity.image)} alt={activity.title} className="activity-image" />
                  {!activity.isVisible && <div className="hidden-overlay">HIDDEN</div>}
                </div>
                <div className="activity-info">
                  <h3>{activity.title}</h3>
                  <p><strong>Date:</strong> {activity.date}</p>
                  <p><strong>Description:</strong> {activity.description}</p>
                  <p><strong>Additional Images:</strong> {activity.additionalImages ? activity.additionalImages.length : 0}</p>
                  <p><strong>Status:</strong>
                    <span className={`status ${activity.isVisible ? 'visible' : 'hidden'}`}>
                      {activity.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="activity-actions">
                <button className="edit-btn" onClick={() => handleEdit(activity)}>Edit</button>
                <button className={`visibility-btn ${activity.isVisible ? 'hide-btn' : 'show-btn'}`}
                  onClick={() => toggleActivityVisibility(activity.id)}>
                  {activity.isVisible ? 'Hide' : 'Show'}
                </button>
                <button className="delete-btn" onClick={() => handleDelete(activity.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .activity-panel {
          display: flex;
          gap: 2rem;
          padding: 1rem;
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
        
        .form-section {
          flex: 1;
          background: #f5f5f5;
          padding: 1.5rem;
          border-radius: 8px;
        }
        
        .activities-list {
          flex: 1;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
          position: relative;
        }
        
        .date-input-container {
          position: relative;
        }
        
        .date-input {
          width: 100%;
          padding: 0.5rem;
          padding-right: 2.5rem;
          cursor: pointer;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .calendar-toggle-btn {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
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
        
        /* Rest of the styles remain the same */
        .image-upload-section {
          border: 1px solid #ddd;
          padding: 1rem;
          border-radius: 4px;
          background: white;
        }
        
        .image-upload-options {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .url-option, .upload-option {
          flex: 1;
        }
        
        .image-preview {
          margin-top: 1rem;
          text-align: center;
        }
        
        .preview-image {
          max-width: 100%;
          max-height: 150px;
          border-radius: 4px;
        }
        
        .activity-image {
          width: 200px;
          height: 150px;
          object-fit: cover;
          border-radius: 4px;
        }
        
        .activity-item {
          border: 1px solid #ddd;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
          background: white;
        }
        
        .activity-preview {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        
        .activity-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .edit-btn { background: #007bff; color: white; }
        .delete-btn { background: #dc3545; color: white; }
        .visibility-btn { background: #28a745; color: white; }
        .hide-btn { background: #ffc107; color: black; }
        .show-btn { background: #28a745; color: white; }
        
        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .save-btn { background: #28a745; color: white; }
        .add-btn { background: #007bff; color: white; }
        .cancel-btn { background: #6c757d; color: white; }
        
        .remove-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .status {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          margin-left: 0.5rem;
        }
        
        .status.visible { background: #d4edda; color: #155724; }
        .status.hidden { background: #f8d7da; color: #721c24; }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  )
}

export default ActivityPanel