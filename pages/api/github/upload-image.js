export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { image, folderName, imageNumber, baseFolder } = req.body;
      
      console.log('📡 GitHub Image Upload API called');
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

      console.log('📁 Uploading to:', filePath);

      // Upload image to GitHub
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
        {
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
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ GitHub API error:', response.status, responseData);
        return res.status(500).json({
          success: false,
          error: `GitHub API error: ${responseData.message || response.status}`
        });
      }


      const relativePath = `/${targetBaseFolder}/${folderName}/${fileName}`;

      console.log('✅ Image uploaded to GitHub successfully! Path:', relativePath);
      
      return res.status(200).json({ 
        success: true,
        path: relativePath,
        message: 'Image uploaded successfully' 
      });
    } catch (error) {
      console.error('❌ Error uploading image to GitHub:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to upload image: ' + error.message 
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