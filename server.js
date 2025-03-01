const express = require('express');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình lưu trữ tạm thời cho file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Đảm bảo thư mục tồn tại
    const uploadsDir = path.join(__dirname, 'tmp/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Google Drive API setup
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'your-folder-id';
// Folder ID ẩn để lưu metadata của ảnh (có thể tạo một thư mục riêng cho metadata)
const METADATA_FOLDER_ID = process.env.GOOGLE_DRIVE_METADATA_FOLDER_ID || FOLDER_ID;

// Biến toàn cục cho Drive client
let drive;
// Biến lưu trữ dữ liệu ảnh trong bộ nhớ
let photos = [];

// Khởi tạo Google Drive client
async function initDriveAuth() {
  try {
    let auth;
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      // Sử dụng service account key từ biến môi trường
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: SCOPES
      });
    } else {
      // Sử dụng file key nếu không có biến môi trường (cho môi trường phát triển)
      auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'service-account-key.json'),
        scopes: SCOPES,
      });
    }
    
    const authClient = await auth.getClient();
    drive = google.drive({ version: 'v3', auth: authClient });
    console.log("Google Drive API initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Google Drive API:", error);
  }
}

// Hàm tải ảnh lên Drive
async function uploadFileToDrive(fileObject) {
  try {
    const fileMetadata = {
      name: fileObject.originalname,
      parents: [FOLDER_ID], 
    };
    
    const media = {
      mimeType: fileObject.mimetype,
      body: fs.createReadStream(fileObject.path),
    };
    
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,webViewLink,webContentLink,name',
    });
    
    // Thiết lập quyền truy cập công khai
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    // Xóa file tạm sau khi tải lên
    fs.unlinkSync(fileObject.path);
    
    // Tạo đường dẫn trực tiếp đến ảnh sử dụng fileId
    const directImageUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;
    
    return {
      id: response.data.id,
      name: response.data.name,
      viewLink: response.data.webViewLink,
      downloadLink: response.data.webContentLink,
      directUrl: directImageUrl
    };
  } catch (error) {
    console.error('Error uploading file to Drive:', error);
    throw error;
  }
}

// Hàm xóa file từ Drive
async function deleteFileFromDrive(fileId) {
  try {
    await drive.files.delete({
      fileId: fileId,
    });
    return true;
  } catch (error) {
    console.error('Error deleting file from Drive:', error);
    throw error;
  }
}

// Hàm đổi tên file trên Drive
async function renameFileOnDrive(fileId, newName) {
  try {
    const response = await drive.files.update({
      fileId: fileId,
      resource: {
        name: newName
      },
      fields: 'id,name'
    });
    
    return {
      id: response.data.id,
      name: response.data.name
    };
  } catch (error) {
    console.error('Error renaming file on Drive:', error);
    throw error;
  }
}

// Hàm lưu metadata vào Drive
async function saveMetadataToDrive() {
  try {
    // Tạo tên file metadata với timestamp để đảm bảo độc nhất
    const metadataFileName = `photos_metadata_${Date.now()}.json`;
    const tempFilePath = path.join(__dirname, 'tmp', metadataFileName);
    
    // Tạo thư mục tmp nếu chưa tồn tại
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    // Ghi metadata vào file tạm
    fs.writeFileSync(tempFilePath, JSON.stringify(photos, null, 2));
    
    // Tìm và xóa các file metadata cũ
    try {
      const metadataQuery = `name contains 'photos_metadata_' and '${METADATA_FOLDER_ID}' in parents`;
      const oldFiles = await drive.files.list({
        q: metadataQuery,
        fields: 'files(id, name)',
      });
      
      // Xóa các file metadata cũ
      if (oldFiles.data.files && oldFiles.data.files.length > 0) {
        for (const file of oldFiles.data.files) {
          await drive.files.delete({ fileId: file.id });
          console.log(`Deleted old metadata file: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning old metadata files:', error);
      // Tiếp tục mặc dù có lỗi khi xóa file cũ
    }
    
    // Upload file metadata mới lên Drive
    const fileMetadata = {
      name: metadataFileName,
      parents: [METADATA_FOLDER_ID], 
      mimeType: 'application/json'
    };
    
    const media = {
      mimeType: 'application/json',
      body: fs.createReadStream(tempFilePath),
    };
    
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    
    // Xóa file tạm sau khi tải lên
    fs.unlinkSync(tempFilePath);
    console.log('Metadata saved to Drive successfully');
    
    return response.data.id;
  } catch (error) {
    console.error('Error saving metadata to Drive:', error);
    throw error;
  }
}

// Hàm tải metadata từ Drive
async function loadMetadataFromDrive() {
  try {
    // Tìm file metadata mới nhất
    const metadataQuery = `name contains 'photos_metadata_' and '${METADATA_FOLDER_ID}' in parents`;
    const files = await drive.files.list({
      q: metadataQuery,
      orderBy: 'createdTime desc',
      pageSize: 1,
      fields: 'files(id, name)',
    });
    
    if (files.data.files && files.data.files.length > 0) {
      const metadataFile = files.data.files[0];
      console.log(`Found metadata file: ${metadataFile.name}`);
      
      // Tải xuống file metadata
      const response = await drive.files.get({
        fileId: metadataFile.id,
        alt: 'media'
      });
      
      // Cập nhật biến photos
      const loadedPhotos = response.data;
      
      // Kiểm tra và sửa URL cho mỗi ảnh
      loadedPhotos.forEach(photo => {
        // Đảm bảo URL hình ảnh sử dụng định dạng trực tiếp
        if (photo.id && (!photo.url || !photo.url.includes('uc?export=view'))) {
          photo.url = `https://drive.google.com/uc?export=view&id=${photo.id}`;
        }
        // Đảm bảo có downloadUrl
        if (photo.id && !photo.downloadUrl) {
          photo.downloadUrl = photo.downloadLink || `https://drive.google.com/uc?export=download&id=${photo.id}`;
        }
        // Đảm bảo có tên file
        if (!photo.name && photo.id) {
          photo.name = photo.id; // Sử dụng ID làm tên nếu không có
        }
      });
      
      photos = loadedPhotos;
      console.log(`Loaded ${photos.length} photos from Drive metadata`);
      return true;
    } else {
      console.log('No metadata file found in Drive');
      photos = [];
      return false;
    }
  } catch (error) {
    console.error('Error loading metadata from Drive:', error);
    photos = [];
    return false;
  }
}

// API Routes

// Lấy tất cả ảnh
app.get('/api/photos', (req, res) => {
  res.json(photos);
});

// Upload ảnh mới
app.post('/api/photos/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { date, people } = req.body;
    const peopleArray = people ? people.split(',') : [];
    
    // Upload lên Google Drive
    const result = await uploadFileToDrive(req.file);
    
    // Tạo đối tượng ảnh mới
    const newPhoto = {
      id: result.id,
      name: result.name,
      url: result.directUrl,
      downloadUrl: result.downloadLink,
      date: date,
      year: new Date(date).getFullYear(),
      people: peopleArray,
      timestamp: Date.now()
    };
    
    // Thêm vào mảng ảnh
    photos.unshift(newPhoto);
    
    // Lưu metadata lên Drive
    await saveMetadataToDrive();
    
    res.json({
      success: true,
      photo: newPhoto
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Xóa ảnh
app.delete('/api/photos/:id', async (req, res) => {
  try {
    const photoId = req.params.id;
    
    // Tìm ảnh trong mảng
    const photoIndex = photos.findIndex(photo => photo.id === photoId);
    
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Xóa từ Google Drive
    await deleteFileFromDrive(photoId);
    
    // Xóa khỏi mảng
    photos.splice(photoIndex, 1);
    
    // Lưu metadata lên Drive
    await saveMetadataToDrive();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

// Đổi tên ảnh
app.put('/api/photos/:id/rename', async (req, res) => {
  try {
    const photoId = req.params.id;
    const { newName } = req.body;
    
    if (!newName || newName.trim() === '') {
      return res.status(400).json({ error: 'New name cannot be empty' });
    }
    
    // Tìm ảnh trong mảng
    const photoIndex = photos.findIndex(photo => photo.id === photoId);
    
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Đổi tên trên Google Drive
    const result = await renameFileOnDrive(photoId, newName);
    
    // Cập nhật trong mảng local
    photos[photoIndex].name = result.name;
    
    // Lưu metadata lên Drive
    await saveMetadataToDrive();
    
    res.json({ 
      success: true, 
      photo: photos[photoIndex]
    });
  } catch (error) {
    console.error('Rename error:', error);
    res.status(500).json({ error: 'Rename failed', details: error.message });
  }
});

// Cập nhật trạng thái yêu thích của ảnh
app.put('/api/photos/:id/favorite', async (req, res) => {
  try {
    const photoId = req.params.id;
    const { isFavorite } = req.body;
    
    // Tìm ảnh trong mảng
    const photoIndex = photos.findIndex(photo => photo.id === photoId);
    
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Cập nhật trạng thái yêu thích
    photos[photoIndex].isFavorite = isFavorite;
    
    // Lưu metadata lên Drive
    await saveMetadataToDrive();
    
    res.json({ 
      success: true, 
      photo: photos[photoIndex]
    });
  } catch (error) {
    console.error('Favorite toggle error:', error);
    res.status(500).json({ error: 'Failed to update favorite status', details: error.message });
  }
});

// Lấy tất cả ảnh được đánh dấu yêu thích
app.get('/api/photos/favorites', (req, res) => {
  const favoritePhotos = photos.filter(photo => photo.isFavorite === true);
  res.json(favoritePhotos);
});

// Xử lý tất cả các routes khác và chỉ đến index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động server
async function startServer() {
  // Khởi tạo Drive API
  await initDriveAuth();
  
  // Tải metadata từ Drive
  await loadMetadataFromDrive();
  
  // Khởi động server
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();