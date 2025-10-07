import fs from 'fs';
import path from 'path';

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
      
      console.log('📡 Careers API called with data:', data ? `Array of ${data.length} items` : 'No data');
      
      if (!data) {
        return res.status(400).json({ 
          success: false,
          error: 'No data provided' 
        });
      }

      // For Vercel, we need to use process.cwd() and ensure the path is correct
      const filePath = path.join(process.cwd(), 'public', 'data', 'career.json');
      
      console.log('📝 Writing careers to:', filePath);
      
      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Write to the JSON file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log('✅ Careers saved successfully!');
      
      return res.status(200).json({ 
        success: true,
        message: 'Careers saved successfully',
        data: data
      });
    } catch (error) {
      console.error('❌ Error saving careers:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to save careers: ' + error.message 
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