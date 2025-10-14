// pages/api/github/save-career.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data } = req.body  // Changed from fileName, content to data

    if (!data) {
      return res.status(400).json({ error: 'Career data is required' })
    }

    // GitHub API configuration - update to save career.json file
    const owner = 'Absheron-Career-Portal'
    const repo = 'STORAGE'
    const path = 'public/data/career.json'  // Fixed path for the JSON file
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
      console.log('Career.json file does not exist or error fetching SHA')
    }

    // Encode the career data to base64
    const content = JSON.stringify(data, null, 2)  // Convert array to JSON string
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
          message: `Update career data`,
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
    console.log('✅ Career JSON file saved successfully')
    
    res.status(200).json({ 
      success: true, 
      message: 'Career data saved successfully'
    })
  } catch (error) {
    console.error('Error saving career data:', error)
    res.status(500).json({ 
      error: 'Failed to save career data',
      details: error.message 
    })
  }
}