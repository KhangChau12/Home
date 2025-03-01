# Ứng dụng Kỷ Niệm Gia Đình

Một trang web ảnh gia đình với thiết kế hiện đại và khả năng chia sẻ giữa nhiều thiết bị, được thiết kế theo phong cách Material Design với giao diện sang trọng và đầy đủ chức năng.

## Tính năng chính

1. **Upload ảnh nâng cao**:
   * Giao diện hiện đại với modal và preview
   * Tải nhiều ảnh cùng lúc
   * Gán nhãn cho người trong ảnh (Anh Hai, Bo Bo, Ba, Mẹ)

2. **Timeline chuyên nghiệp**:
   * Ảnh được sắp xếp theo năm và ngày tháng
   * Hiệu ứng chuyển động mượt mà
   * Hiển thị thông tin ngày chụp và người trong ảnh

3. **Bộ lọc thông minh**:
   * Lọc theo năm
   * Lọc theo người trong ảnh với giao diện badge hiện đại

4. **Xem ảnh toàn màn hình**:
   * Chế độ slideshow với nút điều hướng
   * Hỗ trợ phím tắt (mũi tên trái/phải, ESC)
   * Hiệu ứng zoom khi hover

5. **Thông báo hệ thống**:
   * Thông báo đẹp mắt khi upload, xóa ảnh
   * Tự động biến mất sau vài giây

6. **Giao diện responsive**:
   * Hiển thị tốt trên mọi thiết bị (điện thoại, máy tính bảng, máy tính)
   * Layout thay đổi linh hoạt theo kích thước màn hình

7. **Lưu trữ Google Drive**:
   * Sử dụng Google Drive API để lưu trữ ảnh
   * Dữ liệu ảnh được lưu trữ an toàn

## Cấu trúc dự án

```
family-photo-app/
├── public/
│   ├── index.html          # File HTML chính
│   ├── css/
│   │   └── styles.css      # CSS tách ra từ file HTML gốc
│   ├── js/
│   │   ├── app.js          # JavaScript chính, khởi tạo ứng dụng
│   │   ├── photos.js       # Xử lý tải lên, hiển thị, lọc ảnh
│   │   └── ui.js           # Xử lý giao diện người dùng, modal, toast
│   └── assets/
│       └── placeholder.jpg # Ảnh placeholder khi không có ảnh thật
├── data/
│   └── photos.json         # File lưu trữ thông tin ảnh
├── tmp/
│   └── uploads/            # Thư mục tạm để lưu ảnh trước khi tải lên Drive
├── service-account-key.json # Key xác thực Google Drive API
├── package.json            # Cấu hình npm để Render nhận diện
└── server.js               # Server Node.js xử lý API
```

## Cài đặt và chạy

### Yêu cầu
- Node.js phiên bản 14.0.0 trở lên
- npm hoặc yarn
- Tài khoản Google và project trong Google Cloud Console

### Cài đặt
1. Clone repository
```bash
git clone https://github.com/username/family-photo-app.git
cd family-photo-app
```

2. Cài đặt các gói phụ thuộc
```bash
npm install
```

3. Thiết lập Google Drive API (xem hướng dẫn bên dưới)

4. Chạy server phát triển
```bash
npm run dev
```

5. Mở trình duyệt và truy cập `http://localhost:3000`

## Thiết lập Google Drive API

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới
3. Kích hoạt Google Drive API trong thư viện API
4. Tạo Service Account:
   - Đi đến "IAM & Admin" > "Service Accounts"
   - Tạo Service Account mới, gán vai trò Editor
   - Tạo khóa mới cho Service Account (JSON)
   - Tải về và lưu vào thư mục gốc của dự án với tên `service-account-key.json`

5. Tạo thư mục trên Google Drive:
   - Tạo một thư mục trên Google Drive của bạn
   - Chia sẻ thư mục này với email của Service Account (có quyền Editor)
   - Lấy ID thư mục (phần cuối của URL khi mở thư mục)
   - Cập nhật ID thư mục trong `server.js` (biến `FOLDER_ID`)

## Triển khai trên Render

1. Fork repository này trên GitHub
2. Đăng ký tài khoản tại Render.com
3. Tạo Web Service mới và kết nối với repository GitHub của bạn
4. Sử dụng cấu hình sau:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Thêm biến môi trường:
     - `GOOGLE_DRIVE_FOLDER_ID`: ID thư mục Google Drive

5. Thêm service-account-key.json:
   - Tạo Secret File trên Render
   - Upload file `service-account-key.json`
   - Mount vào đường dẫn `/opt/render/project/src/service-account-key.json`

## Tùy chỉnh

- Thêm thành viên gia đình: Cập nhật các badge trong file `index.html` và các checkbox trong modal tải lên
- Thay đổi theme màu: Chỉnh sửa các biến CSS trong file `styles.css`
- Thêm năm vào bộ lọc: Cập nhật options trong select element

## Lưu ý quan trọng

- Ứng dụng này sử dụng Google Drive để lưu trữ ảnh, hãy đảm bảo bạn có đủ dung lượng lưu trữ
- File `service-account-key.json` chứa thông tin nhạy cảm, không nên đưa vào repository công khai
- Hãy đảm bảo đặt quyền truy cập phù hợp cho thư mục Google Drive

## Giấy phép

[MIT](LICENSE)
