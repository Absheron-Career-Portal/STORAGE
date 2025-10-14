export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileName, content } = req.body

    if (!fileName || content === undefined) {
      return res.status(400).json({ error: 'FileName and content are required' })
    }

    // GitHub API configuration
    const owner = 'Absheron-Career-Portal'
    const repo = 'STORAGE'
    const path = `public/docs/${fileName}`
    const branch = 'main'
    const token = process.env.GITHUB_TOKEN

    if (!token) {
      return res.status(500).json({ error: 'GitHub token not configured' })
    }

    // Always fetch the latest SHA right before updating
    let sha = null
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (getResponse.ok) {
        const fileData = await getResponse.json()
        sha = fileData.sha
        console.log(`📄 Fetched latest SHA for ${fileName}: ${sha}`)
      } else if (getResponse.status === 404) {
        console.log(`📄 File ${fileName} doesn't exist, will create new one`)
      } else {
        console.warn(`⚠️ Could not fetch SHA for ${fileName}: ${getResponse.status}`)
      }
    } catch (error) {
      console.error(`❌ Error fetching SHA for ${fileName}:`, error)
    }

    // Encode content to base64
    const encodedContent = Buffer.from(content).toString('base64')

    const updatePayload = {
      message: `Update description file: ${fileName}`,
      content: encodedContent,
      branch: branch,
    }

    // Only include SHA if we have it (for updates)
    if (sha) {
      updatePayload.sha = sha
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails
      try {
        errorDetails = JSON.parse(errorText)
      } catch {
        errorDetails = errorText
      }
      
      console.error('❌ GitHub API error:', {
        status: response.status,
        fileName,
        details: errorDetails
      })
      
      return res.status(response.status).json({ 
        error: `GitHub API error: ${response.status}`,
        details: errorDetails
      })
    }

    const result = await response.json()
    console.log('✅ Description file saved successfully:', fileName)
    
    res.status(200).json({ 
      success: true, 
      message: 'Description file saved successfully',
      file: result.content 
    })
  } catch (error) {
    console.error('❌ Error saving description file:', error)
    res.status(500).json({ 
      error: 'Failed to save description file',
      details: error.message 
    })
  }
}