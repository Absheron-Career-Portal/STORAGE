import React, { useState, useEffect } from 'react'

const ActivityPanel = () => {
  const [activities, setActivities] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    extendedDescription: '',
    date: '',
    image: '',
    additionalImages: [],
    imageTotal: '0',
    isVisible: true
  })

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      setLoading(true)
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/data/activity.json?t=${Date.now()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load activities: ${response.status}`)
      }
      
      const data = await response.json()
      
      const fixedData = data.map(activity => ({
        ...activity,
        isVisible: activity.isVisible === undefined ? true : activity.isVisible,
        // Fix image paths to be absolute
        image: fixImagePath(activity.image),
        additionalImages: activity.additionalImages?.map(img => fixImagePath(img)) || []
      }))
      
      setActivities(fixedData)
    } catch (error) {
      console.error('Error loading activities:', error)
      const localActivities = localStorage.getItem('activities')
      if (localActivities) {
        setActivities(JSON.parse(localActivities))
      }
    } finally {
      setLoading(false)
    }
  }

  // Fix image paths to be absolute URLs
  const fixImagePath = (path) => {
    if (!path) return ''
    
    // If it's already an absolute URL, return as is
    if (path.startsWith('http')) return path
    
    // If it's a relative path, make it absolute
    if (path.startsWith('../') || path.startsWith('/')) {
      const baseUrl = window.location.origin
      // Remove leading ../ or /
      const cleanPath = path.replace(/^(\.\.\/|\/)/, '')
      return `${baseUrl}/${cleanPath}`
    }
    
    // Default GitHub images
    if (path.includes('linkImage') || path.includes('dateImage')) {
      return path
    }
    
    return path
  }

  const updateJSONFile = async (updatedActivities) => {
    try {
      console.log('🔄 Sending activities to API...');
      
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/activities/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: updatedActivities
        }),
      })
      
      console.log('📡 Activity response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json()
      console.log('✅ Activity API response:', result);
      return result.success
    } catch (error) {
      console.error('❌ Error updating activity JSON file:', error)
      return false
    }
  }

  const saveActivities = async (updatedActivities) => {
    try {
      setLoading(true)
      setActivities(updatedActivities)
      localStorage.setItem('activities', JSON.stringify(updatedActivities))
      
      const jsonUpdated = await updateJSONFile(updatedActivities)
      
      if (jsonUpdated) {
        alert('Activity saved successfully! JSON file updated.')
      } else {
        alert('Activity saved to browser storage only! JSON file update failed.')
      }
    } catch (error) {
      console.error('Error saving activities:', error)
      alert('Error saving activity: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file, folderName, imageNumber = '0') => {
    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folderName', folderName)
      formData.append('imageNumber', imageNumber)

      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/images/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const result = await response.json()
      return result.path
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image: ' + error.message)
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleEdit = (activity) => {
    setEditingId(activity.id)
    setNewActivity({
      title: activity.title,
      description: activity.description,
      extendedDescription: activity.extendedDescription || '',
      date: activity.date,
      image: activity.image,
      additionalImages: activity.additionalImages || [],
      imageTotal: activity.imageTotal?.toString() || '0',
      isVisible: activity.isVisible === undefined ? true : activity.isVisible
    })
  }

  const handleSave = () => {
    const updatedActivities = activities.map(activity => 
      activity.id === editingId 
        ? {
            ...activity,
            title: newActivity.title,
            description: newActivity.description,
            extendedDescription: newActivity.extendedDescription,
            date: newActivity.date,
            image: newActivity.image,
            additionalImages: newActivity.additionalImages,
            imageTotal: newActivity.imageTotal,
            isVisible: newActivity.isVisible
          }
        : activity
    )
    
    saveActivities(updatedActivities)
    setEditingId(null)
    resetForm()
  }

  const handleAdd = async () => {
    if (!newActivity.title.trim()) {
      alert('Please enter a title')
      return
    }

    const newId = activities.length > 0 ? Math.max(...activities.map(a => a.id)) + 1 : 1
    const currentDate = new Date().toLocaleDateString('az-AZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const folderName = newActivity.title.toLowerCase().replace(/[^a-z0-9]/g, '_')

    // Upload main image if provided
    let mainImagePath = newActivity.image
    if (newActivity.image instanceof File) {
      mainImagePath = await handleImageUpload(newActivity.image, folderName, '0')
      if (!mainImagePath) return
    }

    // Upload additional images
    const additionalImagePaths = []
    for (let i = 0; i < newActivity.additionalImages.length; i++) {
      if (newActivity.additionalImages[i] instanceof File) {
        const path = await handleImageUpload(newActivity.additionalImages[i], folderName, (i + 1).toString())
        if (path) additionalImagePaths.push(path)
      } else {
        additionalImagePaths.push(newActivity.additionalImages[i])
      }
    }

    const newActivityItem = {
      id: newId,
      image: mainImagePath || "/image/default-activity.jpg",
      linkImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/landscape.crop.rectangle.svg",
      imageTotal: newActivity.imageTotal || additionalImagePaths.length.toString(),
      dateImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg",
      date: newActivity.date || currentDate,
      title: newActivity.title,
      description: newActivity.description,
      additionalImages: additionalImagePaths,
      isVisible: newActivity.isVisible,
      extendedDescription: newActivity.extendedDescription
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

  const handleMainImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setNewActivity(prev => ({ ...prev, image: file }))
    }
  }

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files)
    setNewActivity(prev => ({ 
      ...prev, 
      additionalImages: [...prev.additionalImages, ...files],
      imageTotal: (parseInt(prev.imageTotal) + files.length).toString()
    }))
  }

  const removeAdditionalImage = (index) => {
    setNewActivity(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index),
      imageTotal: (parseInt(prev.imageTotal) - 1).toString()
    }))
  }

  const resetForm = () => {
    setNewActivity({
      title: '',
      description: '',
      extendedDescription: '',
      date: '',
      image: '',
      additionalImages: [],
      imageTotal: '0',
      isVisible: true
    })
    setEditingId(null)
  }

  const getImagePreview = (image) => {
    if (image instanceof File) {
      return URL.createObjectURL(image)
    }
    return fixImagePath(image)
  }

  return (
    <div className="activity-panel">
      {loading && <div className="loading">Loading...</div>}
      {uploadingImage && <div className="loading">Uploading images...</div>}
      
      <div className="form-section">
        <h2>{editingId !== null ? 'Edit Activity' : 'Add New Activity'}</h2>
        
        <div className="form-group">
          <label>Title:</label>
          <input
            type="text"
            value={newActivity.title}
            onChange={(e) => setNewActivity(prev => ({...prev, title: e.target.value}))}
            placeholder="Enter activity title"
          />
        </div>

        <div className="form-group">
          <label>Short Description:</label>
          <textarea
            value={newActivity.description}
            onChange={(e) => setNewActivity(prev => ({...prev, description: e.target.value}))}
            placeholder="Enter short description"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Extended Description:</label>
          <textarea
            value={newActivity.extendedDescription}
            onChange={(e) => setNewActivity(prev => ({...prev, extendedDescription: e.target.value}))}
            placeholder="Enter detailed description"
            rows="6"
          />
        </div>

        <div className="form-group">
          <label>Date:</label>
          <input
            type="text"
            value={newActivity.date}
            onChange={(e) => setNewActivity(prev => ({...prev, date: e.target.value}))}
            placeholder="e.g., 1 Sentyabr, 2025"
          />
        </div>

        <div className="form-group">
          <label>Main Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleMainImageChange}
          />
          {newActivity.image && (
            <div className="image-preview">
              <img 
                src={getImagePreview(newActivity.image)} 
                alt="Preview" 
                style={{ maxWidth: '200px', maxHeight: '150px' }}
              />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Additional Images ({newActivity.additionalImages.length}):</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAdditionalImagesChange}
          />
          <div className="additional-images-preview">
            {newActivity.additionalImages.map((image, index) => (
              <div key={index} className="additional-image-item">
                <img 
                  src={getImagePreview(image)} 
                  alt={`Additional ${index + 1}`}
                  style={{ maxWidth: '100px', maxHeight: '75px' }}
                />
                <button 
                  type="button" 
                  onClick={() => removeAdditionalImage(index)}
                  className="remove-image-btn"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Total Images:</label>
          <input
            type="number"
            value={newActivity.imageTotal}
            onChange={(e) => setNewActivity(prev => ({...prev, imageTotal: e.target.value}))}
            placeholder="Number of images"
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={newActivity.isVisible}
              onChange={(e) => setNewActivity(prev => ({...prev, isVisible: e.target.checked}))}
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
        {loading ? (
          <p>Loading activities...</p>
        ) : activities.length === 0 ? (
          <p>No activities found. Add your first activity!</p>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className={`activity-item ${!activity.isVisible ? 'hidden' : ''}`}>
              <div className="activity-info">
                <h3>{activity.title}</h3>
                <div className="activity-image-preview">
                  <img 
                    src={fixImagePath(activity.image)} 
                    alt={activity.title}
                    onError={(e) => {
                      e.target.src = '/image/default-activity.jpg'
                    }}
                  />
                </div>
                <p><strong>Date:</strong> {activity.date}</p>
                <p><strong>Description:</strong> {activity.description}</p>
                <p><strong>Images:</strong> {activity.additionalImages.length + 1} total</p>
                <p><strong>Status:</strong> 
                  <span className={`status ${activity.isVisible ? 'visible' : 'hidden'}`}>
                    {activity.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </p>
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
          margin-bottom: 15px;
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
        
        .image-preview, .additional-images-preview {
          margin-top: 10px;
        }
        
        .additional-images-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .additional-image-item {
          position: relative;
          display: inline-block;
        }
        
        .remove-image-btn {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .activity-image-preview img {
          max-width: 200px;
          max-height: 150px;
          object-fit: cover;
          border-radius: 4px;
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
        
        .activities-list {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #ddd;
        }
        
        .activity-item {
          border: 1px solid #eee;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .activity-item.hidden {
          background: #f8f9fa;
          opacity: 0.7;
        }
        
        .activity-info {
          flex: 1;
        }
        
        .activity-actions {
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
        
        @media (max-width: 768px) {
          .activity-panel {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default ActivityPanel