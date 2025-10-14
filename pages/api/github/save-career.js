// pages/api/github/save-career.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, fileName, content, action } = req.body

    // Handle saving career JSON file
    if (action === 'save-career-json' && data) {
      const owner = 'Absheron-Career-Portal'
      const repo = 'STORAGE'
      const path = 'public/data/career.json'
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

      const jsonContent = JSON.stringify(data, null, 2)
      const encodedContent = Buffer.from(jsonContent).toString('base64')

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
      
      return res.status(200).json({ 
        success: true, 
        message: 'Career data saved successfully'
      })
    }

    // Handle saving description files
    if (action === 'save-description' && fileName && content !== undefined) {
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
        console.log(`File ${fileName} does not exist or error fetching SHA`)
      }

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
      
      return res.status(200).json({ 
        success: true, 
        message: 'Description file saved successfully',
        file: result.content 
      })
    }

    // If no valid action found
    return res.status(400).json({ 
      error: 'Invalid request. Please provide valid action and data.' 
    })

  } catch (error) {
    console.error('Error in save-career API:', error)
    res.status(500).json({ 
      error: 'Failed to save data',
      details: error.message 
    })
  }
}