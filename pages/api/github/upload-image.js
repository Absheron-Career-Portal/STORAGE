// Example frontend code
async function uploadImage(file, folderName, imageNumber, baseFolder = 'image/social') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64Image = e.target.result;
        
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            folderName: folderName,
            imageNumber: imageNumber,
            baseFolder: baseFolder
          })
        });

        const result = await response.json();
        
        if (result.success) {
          resolve(result);
        } else {
          reject(result.error);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Usage
const fileInput = document.getElementById('image-upload');
const file = fileInput.files[0];

if (file) {
  uploadImage(file, 'my-folder', '1', 'image/social')
    .then(result => console.log('Upload successful:', result))
    .catch(error => console.error('Upload failed:', error));
}