export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { image, folderName, imageNumber, baseFolder } = req.body;
      
      console.log('🚀 NEW UPLOAD METHOD - Force upload');
      console.log('📁 Upload parameters:', { folderName, imageNumber, baseFolder });
      
      if (!image) {
        return res.status(400).json({ 
          success: false,
          error: 'No image data provided' 
        });
      }

      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const imageSize = (base64Data.length * 3) / 4;
      
      if (imageSize > 4 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          error: 'Image too large. Maximum size is 4MB.'
        });
      }

      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const GITHUB_REPO = process.env.GITHUB_REPO;

      if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return res.status(500).json({
          success: false,
          error: 'GitHub configuration missing'
        });
      }

      const targetBaseFolder = baseFolder || 'image/social';
      const fileName = `${imageNumber}.jpg`;
      const filePath = `public/${targetBaseFolder}/${folderName}/${fileName}`;
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      console.log('🎯 Target path:', filePath);

      // METHOD 1: Try to delete existing file first
      console.log('🗑️ Checking if file exists to delete...');
      const getResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (getResponse.status === 200) {
        const existingFile = await getResponse.json();
        console.log('📄 Found existing file, deleting...');
        
        const deleteResponse = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Delete old image ${fileName} - ${new Date().toISOString()}`,
            sha: existingFile.sha
          })
        });

        if (!deleteResponse.ok) {
          console.log('⚠️ Could not delete old file, will try to overwrite');
        } else {
          console.log('✅ Old file deleted successfully');
        }
      }

      // METHOD 2: Force create new file
      console.log('⬆️ Uploading new image...');
      const uploadResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Upload image ${fileName} - ${new Date().toISOString()}`,
          content: base64Data
        })
      });

      const result = await uploadResponse.json();

      if (!uploadResponse.ok) {
        console.error('❌ Upload failed:', uploadResponse.status, result);
        
        // METHOD 3: If still failing, try with branch specification
        console.log('🔄 Trying alternative upload method...');
        const altResponse = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Upload image ${fileName} - ${new Date().toISOString()}`,
            content: base64Data,
            branch: 'main' // Explicitly specify branch
          })
        });

        const altResult = await altResponse.json();
        
        if (!altResponse.ok) {
          throw new Error(`GitHub API error: ${altResult.message || altResponse.status}`);
        }

        console.log('✅ Image uploaded via alternative method!');
        const relativePath = `/${targetBaseFolder}/${folderName}/${fileName}`;
        
        return res.status(200).json({ 
          success: true,
          path: relativePath,
          message: 'Image uploaded successfully' 
        });
      }

      console.log('✅ Image uploaded successfully!');
      const relativePath = `/${targetBaseFolder}/${folderName}/${fileName}`;
      
      return res.status(200).json({ 
        success: true,
        path: relativePath,
        message: 'Image uploaded successfully' 
      });
    } catch (error) {
      console.error('💥 Final error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Upload failed: ' + error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: `Method ${req.method} Not Allowed` 
    });
  }
}