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
    cb(null, 'tmp/uploads/');
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
// Google Drive API setup
let auth;
let drive;

// Kiểm tra nếu có service account key trong biến môi trường
async function initDriveAuth() {
  try {
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
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'your-folder-id'; // Thay đổi sau

// Khởi tạo Google Drive client
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});
let drive;

async function initDrive() {
  try {
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
      fields: 'id,webViewLink,webContentLink',
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
    
    return {
      id: response.data.id,
      viewLink: response.data.webViewLink,
      downloadLink: response.data.webContentLink,
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

// Biến lưu trữ dữ liệu ảnh (thay thế Firebase)
let photos = [];

// Tải dữ liệu ảnh từ file JSON khi khởi động server
const PHOTOS_FILE = path.join(__dirname, 'data/photos.json');

function loadPhotos() {
  try {
    if (fs.existsSync(PHOTOS_FILE)) {
      const data = fs.readFileSync(PHOTOS_FILE, 'utf8');
      photos = JSON.parse(data);
      console.log(`Loaded ${photos.length} photos from storage`);
    }
  } catch (error) {
    console.error('Error loading photos:', error);
    photos = [];
  }
}

function savePhotos() {
  try {
    // Đảm bảo thư mục data tồn tại
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photos, null, 2));
  } catch (error) {
    console.error('Error saving photos:', error);
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
      url: result.downloadLink,
      date: date,
      year: new Date(date).getFullYear(),
      people: peopleArray,
      timestamp: Date.now()
    };
    
    // Thêm vào mảng ảnh
    photos.unshift(newPhoto);
    
    // Lưu vào file
    savePhotos();
    
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
    
    // Lưu vào file
    savePhotos();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
});

// Xử lý tất cả các routes khác và chỉ đến index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, 'tmp/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Khởi động server
async function startServer() {
  // Khởi tạo Drive API
  await initDriveAuth();
  
  // Tải dữ liệu ảnh
  loadPhotos();
  
  // Khởi động server
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();
