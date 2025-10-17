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
      
      console.log('🖼️ IMAGE UPLOAD DEBUG - Starting upload process');
      console.log('📊 Received data:', {
        folderName,
        imageNumber, 
        baseFolder,
        hasImage: !!image,
        imageLength: image?.length,
        imageStart: image?.substring(0, 50) + '...'
      });
      
      if (!image) {
        console.log('❌ NO IMAGE DATA');
        return res.status(400).json({ 
          success: false,
          error: 'No image data provided',
          debug: 'Image data was empty or missing'
        });
      }

      // Extract base64 data
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      console.log('📐 Base64 data length:', base64Data.length);
      
      if (!base64Data || base64Data.length < 100) {
        console.log('❌ INVALID BASE64 DATA');
        return res.status(400).json({
          success: false,
          error: 'Invalid image data',
          debug: 'Base64 data too short or invalid'
        });
      }

      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const GITHUB_REPO = process.env.GITHUB_REPO;

      console.log('🔐 GitHub config check:', {
        hasToken: !!GITHUB_TOKEN,
        tokenLength: GITHUB_TOKEN?.length,
        hasRepo: !!GITHUB_REPO,
        repo: GITHUB_REPO
      });

      if (!GITHUB_TOKEN || !GITHUB_REPO) {
        console.log('❌ GITHUB CONFIG MISSING');
        return res.status(500).json({
          success: false,
          error: 'GitHub configuration missing',
          debug: `Token: ${!!GITHUB_TOKEN}, Repo: ${!!GITHUB_REPO}`
        });
      }

      const targetBaseFolder = baseFolder || 'image/social';
      const fileName = `${imageNumber}.jpg`;
      const filePath = `public/${targetBaseFolder}/${folderName}/${fileName}`;
      const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

      console.log('🎯 Upload details:', {
        targetBaseFolder,
        fileName,
        filePath,
        apiUrl: apiUrl.replace(GITHUB_TOKEN, '***') // Hide token in logs
      });

      // Step 1: Check if file exists and get SHA
      console.log('🔍 Step 1: Checking if file exists...');
      const getFileResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      let sha = null;
      let fileExists = false;

      if (getFileResponse.status === 200) {
        const fileData = await getFileResponse.json();
        sha = fileData.sha;
        fileExists = true;
        console.log('📄 File exists! SHA:', sha);
      } else if (getFileResponse.status === 404) {
        console.log('📄 File does not exist (this is OK for new files)');
      } else {
        console.error('❌ Error checking file:', getFileResponse.status);
        const errorText = await getFileResponse.text();
        console.error('Error details:', errorText);
      }

      // Step 2: Prepare upload request
      console.log('📦 Step 2: Preparing upload request...');
      const requestBody = {
        message: `Upload ${fileName} - ${new Date().toISOString()}`,
        content: base64Data,
        branch: 'main' // Explicitly set branch
      };

      if (sha) {
        requestBody.sha = sha;
        console.log('✅ Added SHA to request');
      } else {
        console.log('ℹ️ No SHA - creating new file');
      }

      console.log('🚀 Step 3: Uploading to GitHub...');
      const uploadResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await uploadResponse.json();
      
      console.log('📋 GitHub API Response:', {
        status: uploadResponse.status,
        ok: uploadResponse.ok,
        resultKeys: Object.keys(result),
        resultMessage: result.message,
        resultContent: result.content?.html_url ? 'Has URL' : 'No URL'
      });

      if (!uploadResponse.ok) {
        console.error('❌ UPLOAD FAILED:', {
          status: uploadResponse.status,
          error: result.message,
          documentation_url: result.documentation_url
        });
        
        return res.status(500).json({
          success: false,
          error: `GitHub API error: ${result.message}`,
          debug: {
            status: uploadResponse.status,
            documentation: result.documentation_url,
            fileExists,
            hadSha: !!sha
          }
        });
      }

      // SUCCESS! Generate the public URL
      const publicUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${filePath.replace('public/', '')}`;
      const relativePath = `/${targetBaseFolder}/${folderName}/${fileName}`;
      
      console.log('🎉 UPLOAD SUCCESSFUL!');
      console.log('📸 Public URL:', publicUrl);
      console.log('📍 Relative path:', relativePath);
      console.log('🔗 Content URL:', result.content?.html_url);

      return res.status(200).json({ 
        success: true,
        path: relativePath,
        publicUrl: publicUrl, // Add public URL for immediate testing
        githubUrl: result.content?.html_url,
        message: 'Image uploaded successfully!',
        debug: {
          fileExisted: fileExists,
          fileSize: base64Data.length,
          uploadTime: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('💥 UNEXPECTED ERROR:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Upload failed: ' + error.message,
        debug: {
          errorName: error.name,
          errorStack: error.stack
        }
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