import React, { useState, useEffect } from 'react'

const CareerPanel = () => {
  const [careers, setCareers] = useState([])
  const [editingId, setEditingId] = useState(null)
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

  useEffect(() => {
    loadCareers()
  }, [])

  const loadCareers = async () => {
    try {
      const response = await fetch('/data/career.json')
      const data = await response.json()
      
      const fixedData = data.map(career => ({
        ...career,
        isVisible: career.isVisible === undefined ? true : career.isVisible
      }))
      
      setCareers(fixedData)
    } catch (error) {
      console.error('Error loading careers:', error)
    }
  }

const updateJSONFile = async (updatedCareers) => {
  try {
    console.log('🔄 Sending careers to API...');
    
    const response = await fetch('/api/careers/save', { // This will now work on localhost:3000
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: updatedCareers
      }),
    })
    
    console.log('📡 Career response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }
    
    const result = await response.json()
    console.log('✅ Career API response:', result);
    return result.success
  } catch (error) {
    console.error('❌ Error updating career JSON file:', error)
    return false
  }
}

  const saveCareers = async (updatedCareers) => {
    try {
      // Update React state
      setCareers(updatedCareers)
      
      // Update localStorage as backup
      localStorage.setItem('careers', JSON.stringify(updatedCareers))
      
      // Update actual JSON file
      const jsonUpdated = await updateJSONFile(updatedCareers)
      
      if (jsonUpdated) {
        alert('Career saved successfully! JSON file updated.')
      } else {
        alert('Career saved to browser storage only! Check console for errors.')
      }
    } catch (error) {
      console.error('Error saving careers:', error)
      alert('Error saving career: ' + error.message)
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
    const newId = careers.length > 0 ? Math.max(...careers.map(c => c.id)) + 1 : 0
    const currentDate = new Date().toLocaleDateString('az-AZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const newCareerItem = {
      id: newId,
      title: newCareer.title,
      description: newCareer.description,
      dateImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg",
      date: newCareer.date || currentDate,
      expireDate: newCareer.expireDate,
      location: newCareer.location,
      type: newCareer.type,
      typeImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/suitcase.svg",
      view: parseInt(newCareer.view) || 0,
      link: newCareer.link,
      isVisible: true
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
  }

  return (
    <div className="career-panel">
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
          <input
            type="text"
            value={newCareer.date}
            onChange={(e) => setNewCareer(prev => ({...prev, date: e.target.value}))}
            placeholder="e.g., 1 Sentyabr, 2024"
          />
        </div>

        <div className="form-group">
          <label>Expire Date:</label>
          <input
            type="text"
            value={newCareer.expireDate}
            onChange={(e) => setNewCareer(prev => ({...prev, expireDate: e.target.value}))}
            placeholder="e.g., 1 Oktyabr, 2026"
          />
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
        {careers.length === 0 ? (
          <p>No careers found. Add your first career!</p>
        ) : (
          careers.map(career => (
            <div key={career.id} className={`career-item ${!career.isVisible ? 'hidden' : ''}`}>
              <div className="career-info">
                <h3>{career.title}</h3>
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
    </div>
  )
}

export default CareerPanel