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
  const [showDatePicker, setShowDatePicker] = useState(null) // 'postDate' or 'expireDate'

  useEffect(() => {
    loadCareers()
  }, [])

const loadCareers = async () => {
  try {
    // Fetch from STORAGE repo public/data/ folder
    const response = await fetch('https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/data/career.json?t=' + Date.now())
    
    if (!response.ok) {
      throw new Error(`Failed to load careers: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('📥 Loaded careers:', data)
    
    const fixedData = data.map(career => ({
      ...career,
      isVisible: career.isVisible === undefined ? true : career.isVisible
    }))
    
    setCareers(fixedData)
  } catch (error) {
    console.error('Error loading careers:', error)
    // Fallback to localStorage if available
    const localCareers = localStorage.getItem('careers')
    if (localCareers) {
      setCareers(JSON.parse(localCareers))
    }
  }
}
const updateJSONFile = async (updatedCareers) => {
  try {
    console.log('🔄 Sending careers to GitHub API...');
    
    const baseUrl = window.location.origin
    const response = await fetch(`${baseUrl}/api/github/save-career`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: updatedCareers
      }),
    })
    
    console.log('📡 GitHub Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json()
    console.log('✅ GitHub API response:', result);
    return result.success
  } catch (error) {
    console.error('❌ Error updating careers via GitHub:', error)
    return false
  }
}

  const saveCareers = async (updatedCareers) => {
    try {
      setLoading(true)
      // Update React state
      setCareers(updatedCareers)
      
      // Update localStorage as backup
      localStorage.setItem('careers', JSON.stringify(updatedCareers))
      
      // Update actual JSON file
      const jsonUpdated = await updateJSONFile(updatedCareers)
      
      if (jsonUpdated) {
        alert('Career saved successfully! JSON file updated.')
      } else {
        alert('Career saved to browser storage only! JSON file update failed.')
      }
    } catch (error) {
      console.error('Error saving careers:', error)
      alert('Error saving career: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (career) => {
    setEditingId(career.id)
    setNewCareer({
      title: career.title,
      description: career.description,
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
            description: newCareer.description,
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
    
    saveCareers(updatedCareers)
    setEditingId(null)
    resetForm()
  }

  const handleAdd = async () => {
    if (!newCareer.title.trim()) {
      alert('Please enter a title')
      return
    }

    const newId = careers.length > 0 ? Math.max(...careers.map(c => c.id)) + 1 : 1

    const newCareerItem = {
      id: newId,
      title: newCareer.title,
      description: newCareer.description,
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
    saveCareers(updatedCareers)
    resetForm()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this career?')) {
      const updatedCareers = careers.filter(career => career.id !== id)
      saveCareers(updatedCareers)
    }
  }

  const toggleCareerVisibility = (id) => {
    const updatedCareers = careers.map(career =>
      career.id === id ? { ...career, isVisible: !career.isVisible } : career
    )
    saveCareers(updatedCareers)
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
  }

  // Azerbaijani month names
  const azerbaijaniMonths = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]

  const handleDateSelect = (selectedDate, field) => {
    const date = new Date(selectedDate)
    const day = date.getDate()
    const month = azerbaijaniMonths[date.getMonth()]
    const year = date.getFullYear()
    
    const formattedDate = `${day} ${month}, ${year}`
    
    if (field === 'postDate') {
      setNewCareer(prev => ({ ...prev, date: formattedDate }))
    } else if (field === 'expireDate') {
      setNewCareer(prev => ({ ...prev, expireDate: formattedDate }))
    }
    
    setShowDatePicker(null)
  }

  const handleManualDateChange = (e, field) => {
    if (field === 'postDate') {
      setNewCareer(prev => ({ ...prev, date: e.target.value }))
    } else if (field === 'expireDate') {
      setNewCareer(prev => ({ ...prev, expireDate: e.target.value }))
    }
  }

  // Generate dates for calendar (next 365 days)
  const generateCalendarDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 365; i++) {
      const date = new Date()
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    
    return dates
  }

  return (
    <div className="career-panel">
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
        </div>

        <div className="form-group">
          <label>Post Date:</label>
          <div className="date-input-container">
            <input
              type="text"
              value={newCareer.date}
              onChange={(e) => handleManualDateChange(e, 'postDate')}
              onFocus={() => setShowDatePicker('postDate')}
              placeholder="e.g., 1 Sentyabr, 2024"
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
                  <h4>Paylama tarixini seçin</h4>
                  <button 
                    type="button" 
                    className="close-picker-btn"
                    onClick={() => setShowDatePicker(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="calendar-dates">
                  {generateCalendarDates().map((date, index) => {
                    const day = date.getDate()
                    const month = azerbaijaniMonths[date.getMonth()]
                    const year = date.getFullYear()
                    const formattedDate = `${day} ${month}, ${year}`
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className="calendar-date-btn"
                        onClick={() => handleDateSelect(date, 'postDate')}
                      >
                        {formattedDate}
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
              onChange={(e) => handleManualDateChange(e, 'expireDate')}
              onFocus={() => setShowDatePicker('expireDate')}
              placeholder="e.g., 1 Oktyabr, 2026"
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
                  <h4>Bitmə tarixini seçin</h4>
                  <button 
                    type="button" 
                    className="close-picker-btn"
                    onClick={() => setShowDatePicker(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="calendar-dates">
                  {generateCalendarDates().map((date, index) => {
                    const day = date.getDate()
                    const month = azerbaijaniMonths[date.getMonth()]
                    const year = date.getFullYear()
                    const formattedDate = `${day} ${month}, ${year}`
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        className="calendar-date-btn"
                        onClick={() => handleDateSelect(date, 'expireDate')}
                      >
                        {formattedDate}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <small>Format: 1 Oktyabr, 2026 (Azerbaijani format)</small>
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
                <p><strong>Description:</strong> {career.description.substring(0, 100)}...</p>
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
        .career-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          padding: 20px;
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
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          margin-top: 0.25rem;
        }
        
        .date-picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
        }
        
        .date-picker-header h4 {
          margin: 0;
          font-size: 0.9rem;
        }
        
        .close-picker-btn {
          background: none;
          border: none;
          font-size: 1rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .calendar-dates {
          display: flex;
          flex-direction: column;
          max-height: 250px;
          overflow-y: auto;
        }
        
        .calendar-date-btn {
          padding: 0.75rem;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .calendar-date-btn:hover {
          background: #007bff;
          color: white;
        }
        
        .calendar-date-btn:last-child {
          border-bottom: none;
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
        }
      `}</style>
    </div>
  )
}

export default CareerPanel