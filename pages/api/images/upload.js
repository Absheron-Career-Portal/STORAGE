import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    console.log('🖼️ Image upload API called');
    
    try {
      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
      });

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }
          resolve([fields, files]);
        });
      });

      const file = files.image;
      const folderName = fields.folderName?.[0] || 'activity_images';
      const imageNumber = fields.imageNumber?.[0] || '0';
      
      console.log('📦 Upload details:', { folderName, imageNumber });

      if (!file) {
        console.log('❌ No file uploaded');
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Create folder in public/image/social
      const folderPath = path.join(process.cwd(), 'public', 'image', 'social', folderName);
      console.log('📁 Folder path:', folderPath);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('✅ Created folder:', folderPath);
      }

      // Get file extension
      const fileExtension = path.extname(file[0].originalFilename) || '.jpg';
      
      // Generate filename: 0.jpg for main, additional_0.jpg, additional_1.jpg, etc.
      const fileName = `${imageNumber}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      console.log('💾 Saving file to:', filePath);

      // Read the uploaded file
      const fileData = fs.readFileSync(file[0].filepath);
      
      // Save the file
      fs.writeFileSync(filePath, fileData);
      console.log('✅ File saved successfully!');

      // Return the path that should be used in JSON
      const jsonPath = `/image/social/${folderName}/${fileName}`;
      
      console.log('🌐 JSON path:', jsonPath);
      
      res.status(200).json({ 
        success: true, 
        path: jsonPath,
        message: 'Image uploaded successfully' 
      });

    } catch (error) {
      console.error('❌ Error in image upload:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to upload image: ' + error.message 
      });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}