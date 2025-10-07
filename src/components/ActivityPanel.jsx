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

  const uploadImage = async (file, folderName, imageNumber) => {
    try {
      console.log('🖼️ Starting image upload to GitHub...');
      
      // Validate file size before converting to base64
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        throw new Error('Image too large. Maximum size is 4MB.');
      }
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const base64Image = await base64Promise;
      
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/github/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          folderName: folderName,
          imageNumber: imageNumber
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return { 
        success: false, 
        error: error.message || 'Upload failed' 
      }
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
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setUploadingImage(true)

    try {
      // Generate folder name from title or use activity ID if editing
      let folderName
      if (editingId !== null) {
        // Use existing activity ID for folder name
        folderName = `activity_${editingId}`
      } else if (newActivity.title) {
        // Use title for new activity (will be replaced with ID when saved)
        folderName = newActivity.title.toLowerCase().replace(/[^a-z0-9]/g, '_')
      } else {
        folderName = 'temp_activity'
      }

      // Determine image number
      let imageNumber
      if (isAdditional) {
        imageNumber = `${index + 1}` // additional_1.jpg, additional_2.jpg, etc.
      } else {
        imageNumber = '0' // Main image is 0.jpg
      }

      console.log('📁 Uploading to folder:', folderName, 'Image number:', imageNumber)

      const result = await uploadImage(file, folderName, imageNumber)
      
      if (result.success) {
        if (isAdditional) {
          // Update additional images
          setNewActivity(prev => ({
            ...prev,
            additionalImages: prev.additionalImages.map((img, i) =>
              i === index ? result.path : img
            )
          }))
        } else {
          // Update main image
          setNewActivity(prev => ({
            ...prev,
            image: result.path
          }))
        }
        alert('Image uploaded successfully!')
      } else {
        alert('Failed to upload image: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error handling image upload:', error)
      alert('Error uploading image: ' + error.message)
    } finally {
      setUploadingImage(false)
      // Clear the file input
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

    // Fix image paths to use GitHub URLs instead of localhost
    const fixImagePath = (path) => {
      if (!path) return ''
      // If it's a localhost path, convert it to GitHub path
      if (path.includes('localhost:3000')) {
        const pathParts = path.split('/image/social/')
        if (pathParts[1]) {
          return `https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/images/${pathParts[1]}`
        }
      }
      return path
    }

    const newActivityItem = {
      id: newId,
      image: fixImagePath(newActivity.image),
      linkImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/landscape.crop.rectangle.svg",
      imageTotal: newActivity.additionalImages.filter(img => img.trim() !== '').length.toString(),
      dateImage: "https://raw.githubusercontent.com/Absheron-Career-Portal/WEBSITE/b2d2fafaefad0db14296c97b360e559713dbc984/frontend/src/assets/svg/calendar.svg",
      date: newActivity.date || currentDate,
      title: newActivity.title,
      description: newActivity.extendedDescription.substring(0, 100) + '...',
      additionalImages: newActivity.additionalImages
        .filter(img => img.trim() !== '')
        .map(fixImagePath),
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

  // Fix image URLs for display
  const fixImageUrl = (url) => {
    if (!url) return ''
    // Convert localhost URLs to GitHub URLs
    if (url.includes('localhost:3000')) {
      const pathParts = url.split('/image/social/')
      if (pathParts[1]) {
        return `https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/main/public/images/${pathParts[1]}`
      }
    }
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
          <label>Main Image (0.jpg):</label>
          <div className="image-upload-section">
            <div className="image-upload-options">
              <div className="url-option">
                <label>URL:</label>
                <input
                  type="text"
                  value={newActivity.image}
                  onChange={(e) => setNewActivity(prev => ({ ...prev, image: e.target.value }))}
                  placeholder="Enter image URL or upload file"
                />
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
              </div>
            </div>
            {newActivity.image && (
              <div className="image-preview">
                <img src={fixImageUrl(newActivity.image)} alt="Preview" className="preview-image" />
                <small>Current: {newActivity.image}</small>
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
                  <label>URL for image {index + 1}:</label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => updateImageField(index, e.target.value)}
                    placeholder="Enter image URL or upload file"
                  />
                </div>
                <div className="upload-option">
                  <label>Upload image {index + 1}:</label>
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
                  <small>Current: {image}</small>
                </div>
              )}
              
              <div className="image-actions">
                {newActivity.additionalImages.length > 1 && (
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeImageField(index)}
                  >
                    Remove This Image
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" className="add-btn" onClick={addImageField}>
            + Add Another Image Field
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
                <img src={fixImageUrl(activity.image)} alt={activity.title} className="preview-image" 
                     onError={(e) => {
                       e.target.src = 'https://via.placeholder.com/200x150?text=Image+Not+Found';
                     }} />
                <div className="activity-info">
                  <h3>{activity.title}</h3>
                  <p><strong>Date:</strong> {activity.date}</p>
                  <p><strong>Description:</strong> {activity.description}</p>
                  <p><strong>Additional Images:</strong> {activity.additionalImages ? activity.additionalImages.length : 0}</p>
                  <p><strong>Image Path:</strong> {activity.image}</p>
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
    </div>
  )
}

export default ActivityPanel