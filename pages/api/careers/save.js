import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ 
          success: false,
          error: 'No data provided' 
        });
      }

      // Path to your career.json file
      const filePath = path.join(process.cwd(), 'public', 'data', 'career.json');
      
      console.log('📝 Writing careers to:', filePath);
      
      // Write to the actual JSON file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log('✅ Careers saved successfully!');
      
      res.status(200).json({ 
        success: true,
        message: 'Careers saved successfully',
        data: data
      });
    } catch (error) {
      console.error('❌ Error saving careers:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to save careers: ' + error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ 
      success: false,
      error: `Method ${req.method} Not Allowed` 
    });
  }
}