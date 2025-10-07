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
      const { image, folderName, imageNumber } = req.body;
      
      console.log('📡 GitHub Image Upload API called for STORAGE repo');
      
      if (!image) {
        return res.status(400).json({ 
          success: false,
          error: 'No image data provided' 
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

      // Convert base64 image to buffer
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      
      const fileName = `${imageNumber}.jpg`;
      const filePath = `images/${folderName}/${fileName}`;

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
            'User-Agent': 'AKP-Website-Admin'
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
        throw new Error(`GitHub API error: ${responseData.message || response.status}`);
      }

      // Use raw.githubusercontent.com URL for the image
      const imageUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${filePath}`;

      console.log('✅ Image uploaded to GitHub STORAGE successfully! URL:', imageUrl);
      
      return res.status(200).json({ 
        success: true,
        path: imageUrl,
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