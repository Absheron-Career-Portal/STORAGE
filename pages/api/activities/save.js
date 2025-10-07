import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  console.log('🔍 ACTIVITIES API CALLED - Method:', req.method);
  console.log('🔍 Request body:', req.body);
  
  if (req.method === 'POST') {
    try {
      const { data } = req.body;
      
      console.log('📊 Data received:', data);
      
      if (!data) {
        console.log('❌ No data provided');
        return res.status(400).json({ 
          success: false,
          error: 'No data provided' 
        });
      }

      // Path to your activity.json file
      const filePath = path.join(process.cwd(), 'public', 'data', 'activity.json');
      
      console.log('📝 Writing activities to:', filePath);
      
      // Check if file exists
      try {
        fs.accessSync(filePath);
        console.log('✅ File exists');
      } catch (error) {
        console.log('❌ File does not exist, creating it');
        // Create directory if it doesn't exist
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }
      
      // Write to the actual JSON file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log('✅ Activities saved successfully!');
      
      res.status(200).json({ 
        success: true, 
        message: 'Activities saved successfully',
        data: data
      });
    } catch (error) {
      console.error('❌ Error saving activities:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to save activities: ' + error.message 
      });
    }
  } else {
    console.log('❌ Method not allowed:', req.method);
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ 
      success: false,
      error: `Method ${req.method} Not Allowed` 
    });
  }
}