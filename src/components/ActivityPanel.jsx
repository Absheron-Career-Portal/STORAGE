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

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      // Fetch from STORAGE repo public/data/ folder
      const response = await fetch('https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/data/activity.json?t=' + Date.now())

      if (!response.ok) {
        throw new Error(`Failed to load activities: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 Loaded activities:', data)

      const fixedData = data.map(activity => ({
        ...activity,
        isVisible: activity.isVisible === undefined ? true : activity.isVisible
      }))

      setActivities(fixedData)
    } catch (error) {
      console.error('Error loading activities:', error)
      // Fallback to localStorage if available
      const localActivities = localStorage.getItem('activities')
      if (localActivities) {
        setActivities(JSON.parse(localActivities))
      }
    }
  }

  const updateJSONFile = async (updatedActivities) => {
    try {
      console.log('🔄 Sending activities to GitHub API...');

      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/github/save-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: updatedActivities
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
      console.error('❌ Error updating activities via GitHub:', error)
      return false
    }
  }

  const saveActivities = async (updatedActivities) => {
    try {
      console.log('💾 Saving activities:', updatedActivities)

      // Update React state
      setActivities(updatedActivities)

      // Update localStorage
      localStorage.setItem('activities', JSON.stringify(updatedActivities))

      // Update actual JSON file
      const jsonUpdated = await updateJSONFile(updatedActivities)

      if (jsonUpdated) {
        alert('Activity saved successfully! JSON file updated.')
        // Reload to see changes
        setTimeout(() => loadActivities(), 1000)
      } else {
        alert('Activity saved to browser storage only! Check console for errors.')
      }
    } catch (error) {
      console.error('Error saving activities:', error)
      alert('Error saving activity: ' + error.message)
    }
  }

  const handleImageUpload = async (event, isAdditional = false, index = null) => {
    // Disable file upload due to Vercel limitations
    alert('File upload is temporarily disabled. Please use image URLs from your WEBSITE repository instead.\n\nYou can:\n1. Upload images to your WEBSITE repo in /image/social/ folder\n2. Use paths like: /image/social/production/0.jpg\n3. The system will automatically display them');
    event.target.value = ''; // Clear the file input
    return;
  }

  const handleEdit = (activity) => {
    setEditingId(activity.id)
    setNewActivity({
      title: activity.title,
      extendedDescription: activity.extendedDescription,
      date: activity.date,
      image: activity.image,
      additionalImages: activity.additionalImages && activity.additionalImages.length > 0
        ? [...activity.additionalImages]
        : [''],
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
    const currentDate = new Date().toLocaleDateString('az-AZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const newActivityItem = {
      id: newId,
      image: newActivity.image,
      linkImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/landscape.crop.rectangle.svg",
      imageTotal: newActivity.additionalImages.filter(img => img.trim() !== '').length.toString(),
      dateImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg",
      date: newActivity.date || currentDate,
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

  // Fix image URLs for display - convert relative paths to absolute URLs
  const fixImageUrl = (url) => {
    if (!url) return ''

    // If it's already a full URL (http/https), return as-is
    if (url.startsWith('http')) {
      return url
    }

    // If it's a relative path starting with /image/, convert to GitHub raw URL
    if (url.startsWith('/image/')) {
      // Remove the leading slash and convert to GitHub path
      const imagePath = url.substring(1) // Remove the first '/'
      return `https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/main/${imagePath}`
    }

    // Return as-is for any other cases
    return url
  }

  return (
    <div className="activity-panel">
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
          <input
            type="text"
            value={newActivity.date}
            onChange={(e) => setNewActivity(prev => ({ ...prev, date: e.target.value }))}
            placeholder="e.g., 1 Sentyabr, 2025"
          />
        </div>

        <div className="form-group">
          <label>Main Image:</label>
          <div className="image-input-group">
            <input
              type="text"
              value={newActivity.image}
              onChange={(e) => setNewActivity(prev => ({ ...prev, image: e.target.value }))}
              placeholder="Enter image URL (e.g., /image/social/production/0.jpg)"
              className="full-width-input"
            />
            <small className="help-text">
              Use relative paths like: /image/social/production/0.jpg
              <br />
              Images should be uploaded to your WEBSITE repository
            </small>
          </div>
          {newActivity.image && (
            <div className="image-preview">
              <img 
                src={fixImageUrl(newActivity.image)} 
                alt="Preview" 
                className="preview-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x200/ff0000/ffffff?text=Image+Not+Found';
                  e.target.alt = 'Image not found';
                }} 
              />
              <div className="image-info">
                <strong>Preview:</strong> {newActivity.image}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Additional Images:</label>
          {newActivity.additionalImages.map((image, index) => (
            <div key={index} className="image-input-group">
              <div className="image-input-row">
                <input
                  type="text"
                  value={image}
                  onChange={(e) => updateImageField(index, e.target.value)}
                  placeholder={`Enter image URL ${index + 1} (e.g., /image/social/production/${index + 1}.jpg)`}
                  className="full-width-input"
                />
                {newActivity.additionalImages.length > 1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeImageField(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
              {image && (
                <div className="image-preview small">
                  <img 
                    src={fixImageUrl(image)} 
                    alt={`Preview ${index + 1}`} 
                    className="preview-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/150x100/ff0000/ffffff?text=Image+Not+Found';
                      e.target.alt = 'Image not found';
                    }} 
                  />
                  <div className="image-info">
                    <strong>Image {index + 1}:</strong> {image}
                  </div>
                </div>
              )}
            </div>
          ))}
          <button type="button" className="add-btn" onClick={addImageField}>
            + Add Another Image URL
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
              <div className="activity-content">
                <div className="activity-image-section">
                  <img 
                    src={fixImageUrl(activity.image)} 
                    alt={activity.title} 
                    className="activity-main-image"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200/cccccc/666666?text=No+Image';
                      e.target.alt = 'Image not available';
                    }} 
                  />
                  {activity.additionalImages && activity.additionalImages.length > 0 && (
                    <div className="additional-images">
                      <strong>Additional Images ({activity.additionalImages.length}):</strong>
                      <div className="additional-images-grid">
                        {activity.additionalImages.slice(0, 3).map((img, index) => (
                          <img 
                            key={index}
                            src={fixImageUrl(img)} 
                            alt={`Additional ${index + 1}`}
                            className="additional-image"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/80x60/cccccc/666666?text=X';
                              e.target.alt = 'Image not available';
                            }}
                          />
                        ))}
                        {activity.additionalImages.length > 3 && (
                          <div className="more-images">+{activity.additionalImages.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="activity-info">
                  <h3>{activity.title}</h3>
                  <p><strong>Date:</strong> {activity.date}</p>
                  <p><strong>Description:</strong> {activity.description}</p>
                  <p><strong>Full Description:</strong> {activity.extendedDescription}</p>
                  <p><strong>Main Image:</strong> 
                    <code>{activity.image}</code>
                  </p>
                  <p><strong>Status:</strong>
                    <span className={`status ${activity.isVisible ? 'visible' : 'hidden'}`}>
                      {activity.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="activity-actions">
                <button className="edit-btn" onClick={() => handleEdit(activity)}>Edit</button>
                <button
                  className={`visibility-btn ${activity.isVisible ? 'hide-btn' : 'show-btn'}`}
                  onClick={() => toggleActivityVisibility(activity.id)}
                >
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
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .full-width-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        
        .help-text {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .image-input-group {
          margin-bottom: 15px;
        }
        
        .image-input-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .image-preview {
          margin-top: 10px;
          padding: 10px;
          background: white;
          border-radius: 4px;
          border: 1px solid #eee;
        }
        
        .preview-image {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          display: block;
        }
        
        .image-preview.small .preview-image {
          max-width: 150px;
        }
        
        .image-info {
          margin-top: 8px;
          font-size: 12px;
          color: #666;
        }
        
        .remove-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          white-space: nowrap;
        }
        
        .add-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
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
          margin-top: 25px;
        }
        
        .save-btn, .add-btn {
          background: #0070f3;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .cancel-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .activities-list {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }
        
        .activity-item {
          border: 1px solid #eee;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 8px;
        }
        
        .activity-item.hidden {
          background: #f8f9fa;
          opacity: 0.7;
        }
        
        .activity-content {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
        }
        
        .activity-image-section {
          flex: 0 0 300px;
        }
        
        .activity-main-image {
          width: 100%;
          max-width: 300px;
          height: 200px;
          object-fit: cover;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        
        .additional-images {
          margin-top: 10px;
        }
        
        .additional-images-grid {
          display: flex;
          gap: 5px;
          margin-top: 5px;
          flex-wrap: wrap;
        }
        
        .additional-image {
          width: 80px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .more-images {
          width: 80px;
          height: 60px;
          background: #f8f9fa;
          border: 1px dashed #ddd;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 12px;
        }
        
        .activity-info {
          flex: 1;
        }
        
        .activity-info h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        
        .activity-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .activity-info code {
          background: #f1f1f1;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 12px;
          word-break: break-all;
        }
        
        .activity-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        .edit-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        
        .visibility-btn {
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
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
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
        }
        
        .status {
          margin-left: 8px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
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
        
        @media (max-width: 768px) {
          .activity-panel {
            grid-template-columns: 1fr;
          }
          
          .activity-content {
            flex-direction: column;
          }
          
          .activity-image-section {
            flex: none;
          }
        }
      `}</style>
    </div>
  )
}

export default ActivityPanel