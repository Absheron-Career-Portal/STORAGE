// pages/api/github/save-description.js
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

    let sha = null
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
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
      }
    } catch (error) {
    }

    // Encode content to base64
    const encodedContent = Buffer.from(content).toString('base64')

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Update description file: ${fileName}`,
          content: encodedContent,
          sha: sha,
          branch: branch,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GitHub API error:', errorText)
      return res.status(response.status).json({ 
        error: `GitHub API error: ${response.status}`,
        details: errorText
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
    console.error('Error saving description file:', error)
    res.status(500).json({ 
      error: 'Failed to save description file',
      details: error.message 
    })
  }
}
