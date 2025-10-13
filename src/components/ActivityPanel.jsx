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
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image too large. Maximum size is 2MB. Please compress your image.');
      }

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      // Compress image before upload
      const compressedBase64 = await compressImage(base64Image, 0.7);

      const baseUrl = window.location.origin;
      
      console.log('📤 Sending upload request...');
      
      const response = await fetch(`${baseUrl}/api/github/upload-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: compressedBase64,
          folderName: folderName,
          imageNumber: imageNumber,
          baseFolder: 'image/social' // This will be used by the backend
        }),
      });

      console.log('📡 Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload result:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    }
  }

  // Image compression function
  const compressImage = (base64String, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions if needed (max width 1200px)
        let { width, height } = img;
        const maxWidth = 1200;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        // If compression fails, return original
        resolve(base64String);
      };
    });
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

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      alert('Image too large. Please select an image smaller than 2MB.')
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

      console.log('📁 Upload details:', { folderName, imageNumber, isAdditional, index })

      const result = await uploadImage(file, folderName, imageNumber)

      if (result.success) {
        const imagePath = result.path;
        console.log('✅ Image uploaded successfully:', imagePath);
        
        if (isAdditional) {
          setNewActivity(prev => ({
            ...prev,
            additionalImages: prev.additionalImages.map((img, i) =>
              i === index ? imagePath : img
            )
          }))
        } else {
          setNewActivity(prev => ({
            ...prev,
            image: imagePath
          }))
        }
        alert('Image uploaded successfully!')
      } else {
        console.error('❌ Upload failed:', result.error);
        alert('Failed to upload image: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('❌ Error handling image upload:', error)
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

    // For uploaded images, they will already have GitHub URLs
    // For manual URL entries, keep them as-is
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

  const handleDateSelect = (selectedDate) => {
    const date = new Date(selectedDate)
    const day = date.getDate()
    const month = azerbaijaniMonths[date.getMonth()]
    const year = date.getFullYear()
    
    const formattedDate = `${day} ${month}, ${year}`
    setNewActivity(prev => ({ ...prev, date: formattedDate }))
    setShowDatePicker(false)
  }

  const handleManualDateChange = (e) => {
    setNewActivity(prev => ({ ...prev, date: e.target.value }))
  }

  // FIXED: Properly convert relative paths to GitHub raw URLs
  const fixImageUrl = (url) => {
    if (!url) return ''

    console.log('🖼️ Processing image URL:', url);

    // If it's already a full URL (http/https), return as-is
    if (url.startsWith('http')) {
      return url
    }

    // If it's a relative path starting with /image/, convert to GitHub raw URL
    if (url.startsWith('/image/')) {
      // Convert /image/social/brainstorm/0.jpg to GitHub raw URL
      const imagePath = url.substring(1); // Remove the first '/'

      // Use the STORAGE repo with proper GitHub raw URL format
      const githubRawUrl = `https://raw.githubusercontent.com/Absheron-Career-Portal/STORAGE/refs/heads/main/public/${imagePath}`;

      console.log('🔗 Converted to:', githubRawUrl);
      return githubRawUrl;
    }

    // Return as-is for any other cases
    return url
  }

  // Generate dates for calendar (next 60 days)
  const generateCalendarDates = () => {
    const dates = []
    const today = new Date()
    
    for (let i = 0; i < 60; i++) {
      const date = new Date()
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    
    return dates
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
          <div className="date-input-container">
            <input
              type="text"
              value={newActivity.date}
              onChange={handleManualDateChange}
              onFocus={() => setShowDatePicker(true)}
              placeholder="e.g., 1 Sentyabr, 2025"
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
                  <h4>Tarixi seçin</h4>
                  <button 
                    type="button" 
                    className="close-picker-btn"
                    onClick={() => setShowDatePicker(false)}
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
                        onClick={() => handleDateSelect(date)}
                      >
                        {formattedDate}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <small>Format: 1 Sentyabr, 2025 (Azerbaijani format)</small>
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
                  placeholder="Enter image URL (e.g., /image/social/folder/0.jpg)"
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
                <small>Max 2MB - Images will be compressed automatically</small>
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
                    placeholder="Enter image URL (e.g., /image/social/folder/1.jpg)"
                  />
                  <small>Use relative paths like: /image/social/production/1.jpg</small>
                </div>
                <div className="upload-option">
                  <label>Upload image {index + 1}:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true, index)}
                    disabled={uploadingImage}
                  />
                  <small>Max 2MB - Images will be compressed</small>
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
                <div className="activity-image-container">
                  <img
                    src={fixImageUrl(activity.image)}
                    alt={activity.title}
                    className="activity-image"
                  />
                  {!activity.isVisible && (
                    <div className="hidden-overlay">HIDDEN</div>
                  )}
                </div>
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

      <style jsx>{`
        .activity-panel {
          display: flex;
          gap: 2rem;
          padding: 1rem;
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
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
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
        
        .url-option,
        .upload-option {
          flex: 1;
        }
        
        .url-option input,
        .upload-option input {
          width: 100%;
        }
        
        .image-preview {
          margin-top: 1rem;
          text-align: center;
        }
        
        .image-preview.small {
          max-width: 200px;
        }
        
        .preview-image {
          max-width: 100%;
          max-height: 150px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .activity-image {
          width: 200px;
          height: 150px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .activity-image-container {
          position: relative;
          display: inline-block;
        }
        
        .hidden-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border-radius: 4px;
        }
        
        .image-input-group {
          border: 1px solid #eee;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
          background: #fafafa;
        }
        
        .image-actions {
          margin-top: 0.5rem;
        }
        
        .activity-item {
          border: 1px solid #ddd;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 4px;
          background: white;
        }
        
        .activity-item.hidden {
          opacity: 0.6;
          background: #f9f9f9;
        }
        
        .activity-preview {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }
        
        .activity-info {
          flex: 1;
        }
        
        .activity-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .activity-actions button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
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
        
        .form-actions button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
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
          font-size: 0.8rem;
        }
        
        .status {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          margin-left: 0.5rem;
          font-size: 0.8rem;
        }
        
        .status.visible { background: #d4edda; color: #155724; }
        .status.hidden { background: #f8d7da; color: #721c24; }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: normal;
        }
        
        .checkbox-label input {
          width: auto;
        }
        
        small {
          color: #666;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  )
}

export default ActivityPanel