// pages/api/github/save-career.js
//
// Actions:
//   save-career-json  -> writes public/data/career.json  (visible jobs only)
//   save-backup-json  -> writes public/data/backup.json   (hidden / archived jobs)
//   save-description  -> writes public/docs/<fileName>.txt
//
// Hide/show model: the public site reads career.json. Hiding a job moves it out
// of career.json and into backup.json; showing it moves it back. The frontend
// never has to know about hidden items — they simply aren't in career.json.

const OWNER = 'Absheron-Career-Portal'
const REPO = 'STORAGE'
const BRANCH = 'main'

async function putFile({ path, contentString, message, token }) {
  // Fetch current SHA (if the file already exists)
  let sha = null
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    )
    if (getRes.ok) {
      const fileData = await getRes.json()
      sha = fileData.sha
    }
  } catch (e) {
    console.log(`No existing SHA for ${path}`)
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(contentString).toString('base64'),
        sha,
        branch: BRANCH,
      }),
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    const err = new Error(`GitHub API error: ${res.status}`)
    err.status = res.status
    err.details = errorText
    throw err
  }
  return res.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'GitHub token not configured' })
  }

  try {
    const { data, fileName, content, action } = req.body

    // ---- career.json (visible jobs) ----
    if (action === 'save-career-json' && data) {
      await putFile({
        path: 'public/data/career.json',
        contentString: JSON.stringify(data, null, 2),
        message: 'Update career data (visible jobs)',
        token,
      })
      return res.status(200).json({ success: true, message: 'Career data saved' })
    }

    // ---- backup.json (hidden / archived jobs) ----
    if (action === 'save-backup-json') {
      await putFile({
        path: 'public/data/backup.json',
        contentString: JSON.stringify(data || [], null, 2),
        message: 'Update backup data (hidden jobs)',
        token,
      })
      return res.status(200).json({ success: true, message: 'Backup data saved' })
    }

    // ---- description text file ----
    if (action === 'save-description' && fileName && content !== undefined) {
      const result = await putFile({
        path: `public/docs/${fileName}`,
        contentString: content,
        message: `Update description file: ${fileName}`,
        token,
      })
      return res.status(200).json({ success: true, message: 'Description saved', file: result.content })
    }

    return res.status(400).json({ error: 'Invalid request. Provide a valid action and data.' })
  } catch (error) {
    console.error('Error in save-career API:', error)
    return res.status(error.status || 500).json({
      error: error.message || 'Failed to save data',
      details: error.details,
    })
  }
}
