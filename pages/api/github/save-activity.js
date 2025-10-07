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
      const { data } = req.body;
      
      console.log('📡 GitHub Activities API called for STORAGE repo');
      
      if (!data) {
        return res.status(400).json({ 
          success: false,
          error: 'No data provided' 
        });
      }

      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const GITHUB_REPO = process.env.GITHUB_REPO;

      if (!GITHUB_TOKEN || !GITHUB_REPO) {
        console.error('❌ GitHub configuration missing');
        return res.status(500).json({
          success: false,
          error: 'GitHub configuration missing'
        });
      }

      const filePath = 'activity.json';
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      console.log('🔗 GitHub API URL:', apiUrl);

      // Get the current file to get its SHA
      const getFileResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AKP-Website-Admin'
        }
      });

      let sha = null;
      if (getFileResponse.status === 200) {
        const fileData = await getFileResponse.json();
        sha = fileData.sha;
        console.log('📄 Found existing file with SHA:', sha);
      } else if (getFileResponse.status === 404) {
        console.log('📄 File does not exist, will create new file');
      } else {
        const error = await getFileResponse.text();
        console.error('❌ GitHub API error:', getFileResponse.status, error);
        throw new Error(`GitHub API error: ${getFileResponse.status}`);
      }

      // Update the file
      const updateResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'AKP-Website-Admin'
        },
        body: JSON.stringify({
          message: `Update activities - ${new Date().toISOString()}`,
          content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
          sha: sha
        })
      });

      const responseData = await updateResponse.json();

      if (!updateResponse.ok) {
        console.error('❌ GitHub API error:', updateResponse.status, responseData);
        throw new Error(`GitHub API error: ${responseData.message || updateResponse.status}`);
      }

      console.log('✅ Activities saved to GitHub STORAGE successfully!');
      
      return res.status(200).json({ 
        success: true,
        message: 'Activities saved to GitHub STORAGE successfully'
      });
    } catch (error) {
      console.error('❌ Error saving activities to GitHub:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to save activities: ' + error.message 
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