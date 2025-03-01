// Biến toàn cục
let photos = [];
let filteredPhotos = [];
let currentPhotoIndex = 0;

// Các phần tử DOM
const photoUploadInput = document.getElementById('photo-upload');
const uploadForm = document.getElementById('upload-form');
const photoDateInput = document.getElementById('photo-date');
const selectedFilesContainer = document.getElementById('selected-files');
const yearFilter = document.getElementById('year-filter');
const personFilters = document.querySelectorAll('.badge[data-person]');
const photosTimeline = document.getElementById('photos-timeline');
const emptyTimeline = document.getElementById('empty-timeline');
const uploadModal = document.getElementById('upload-modal');
const fullscreenView = document.getElementById('fullscreen-view');
const fullscreenImg = document.getElementById('fullscreen-img');
const preloader = document.getElementById('preloader');

// Khởi tạo - Load ảnh từ API
function init() {
    // Hiển thị preloader khi tải ảnh
    preloader.style.display = 'flex';
    preloader.querySelector('p').textContent = 'Đang tải ảnh...';
    
    // Tải ảnh từ API
    fetch('/api/photos')
        .then(response => response.json())
        .then(data => {
            // Lưu dữ liệu ảnh
            photos = data;
            
            // Ẩn preloader
            preloader.style.display = 'none';
            
            // Lọc và hiển thị ảnh
            filterPhotos();
        })
        .catch(error => {
            console.error('Error fetching photos:', error);
            
            // Ẩn preloader và hiển thị thông báo lỗi
            preloader.style.display = 'none';
            showToast('Lỗi', 'Không thể tải ảnh: ' + error.message, 'error');
        });
    
    // Thiết lập mặc định cho ngày
    photoDateInput.valueAsDate = new Date();
    
    // Thiết lập bộ lọc
    yearFilter.addEventListener('change', filterPhotos);
    personFilters.forEach(filter => {
        filter.addEventListener('click', togglePersonFilter);
    });
    
    // Thiết lập sự kiện Upload
    photoUploadInput.addEventListener('change', handleFileSelect);
    document.getElementById('submit-upload').addEventListener('click', handlePhotoUpload);
    
    // Thiết lập sự kiện cho chế độ xem toàn màn hình
    document.getElementById('close-fullscreen').addEventListener('click', closeFullscreen);
    document.getElementById('prev-photo').addEventListener('click', showPrevPhoto);
    document.getElementById('next-photo').addEventListener('click', showNextPhoto);
    
    // Thiết lập phím tắt
    document.addEventListener('keydown', function(e) {
        if (fullscreenView.classList.contains('show')) {
            if (e.key === 'Escape') {
                closeFullscreen();
            } else if (e.key === 'ArrowLeft') {
                showPrevPhoto();
            } else if (e.key === 'ArrowRight') {
                showNextPhoto();
            }
        }
    });
    
    // Sự kiện tải ảnh khi nhấn nút từ empty state
    document.getElementById('empty-upload-btn').addEventListener('click', function() {
        showModal(uploadModal);
    });
}

// Lọc ảnh theo năm và người
function filterPhotos() {
    const selectedYear = yearFilter.value;
    const selectedPerson = document.querySelector('.badge[data-person].active').dataset.person;
    
    filteredPhotos = [...photos];
    
    // Lọc theo năm
    if (selectedYear !== 'all') {
        filteredPhotos = filteredPhotos.filter(photo => photo.year.toString() === selectedYear);
    }
    
    // Lọc theo người
    if (selectedPerson !== 'all') {
        filteredPhotos = filteredPhotos.filter(photo => photo.people.includes(selectedPerson));
    }
    
    // Hiển thị ảnh đã lọc
    renderTimeline();
}

// Hiển thị timeline với ảnh đã lọc
function renderTimeline() {
    // Xóa timeline (ngoại trừ trạng thái trống)
    const childrenToRemove = [];
    Array.from(photosTimeline.children).forEach(child => {
        if (child.id !== 'empty-timeline') {
            childrenToRemove.push(child);
        }
    });
    
    childrenToRemove.forEach(child => child.remove());
    
    // Hiển thị/ẩn trạng thái trống
    if (filteredPhotos.length === 0) {
        emptyTimeline.style.display = 'block';
        return;
    } else {
        emptyTimeline.style.display = 'none';
    }
    
    // Nhóm ảnh theo năm
    const photosByYear = {};
    filteredPhotos.forEach(photo => {
        if (!photosByYear[photo.year]) {
            photosByYear[photo.year] = [];
        }
        photosByYear[photo.year].push(photo);
    });
    
    // Sắp xếp năm theo thứ tự giảm dần
    const years = Object.keys(photosByYear).sort((a, b) => b - a);
    
    // Tạo các phần timeline cho mỗi năm
    years.forEach(year => {
        const timelineYear = document.createElement('div');
        timelineYear.className = 'timeline-year fade-in';
        
        const yearHeader = document.createElement('div');
        yearHeader.className = 'year-header';
        yearHeader.textContent = year;
        
        const photoGrid = document.createElement('div');
        photoGrid.className = 'photo-grid';
        
        // Sắp xếp ảnh theo ngày (mới nhất trước)
        const yearPhotos = photosByYear[year].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Thêm ảnh vào grid
        yearPhotos.forEach(photo => {
            photoGrid.appendChild(createPhotoCard(photo));
        });
        
        timelineYear.appendChild(yearHeader);
        timelineYear.appendChild(photoGrid);
        photosTimeline.appendChild(timelineYear);
    });
}

// Tạo card cho mỗi ảnh
function createPhotoCard(photo) {
    const card = document.createElement('div');
    card.className = 'photo-card fade-in';
    card.dataset.id = photo.id;
    
    const imgContainer = document.createElement('div');
    imgContainer.className = 'photo-img-container';
    
    const img = document.createElement('img');
    img.className = 'photo-img';
    
    // Kiểm tra URL ảnh
    let imgUrl = photo.url;
    if (!imgUrl || imgUrl.includes('download')) {
        imgUrl = `https://drive.google.com/uc?export=view&id=${photo.id}`;
    }
    
    img.src = imgUrl;
    img.alt = photo.name || 'Ảnh gia đình';
    img.loading = 'lazy';
    
    // Thêm xử lý lỗi ảnh
    img.onerror = function() {
        console.error(`Lỗi tải ảnh: ${imgUrl}`);
        // Thử lại với URL khác
        if (photo.id) {
            const fallbackUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w500`;
            console.log(`Thử tải lại với URL thay thế: ${fallbackUrl}`);
            img.src = fallbackUrl;
        }
    };
    
    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-light btn-icon-only';
    viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
    viewBtn.title = 'Xem ảnh';
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFullscreen(photo);
    });
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-success btn-icon-only';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
    downloadBtn.title = 'Tải ảnh về';
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadPhoto(photo);
    });
    
    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-info btn-icon-only';
    renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
    renameBtn.title = 'Đổi tên ảnh';
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        promptRenamePhoto(photo);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-icon-only';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'Xóa ảnh';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeletePhoto(photo);
    });
    
    actions.appendChild(viewBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    
    overlay.appendChild(actions);
    imgContainer.appendChild(img);
    imgContainer.appendChild(overlay);
    
    const content = document.createElement('div');
    content.className = 'photo-content';
    
    const photoName = document.createElement('div');
    photoName.className = 'photo-name';
    photoName.innerHTML = `<i class="far fa-file-image"></i> ${photo.name || 'Ảnh không tên'}`;
    
    const dateElem = document.createElement('div');
    dateElem.className = 'photo-date';
    const photoDate = new Date(photo.date);
    const formattedDate = `${photoDate.getDate()}/${photoDate.getMonth() + 1}/${photoDate.getFullYear()}`;
    dateElem.innerHTML = `<i class="far fa-calendar-alt"></i> ${formattedDate}`;
    
    const peopleElem = document.createElement('div');
    peopleElem.className = 'photo-people';
    
    photo.people.forEach(person => {
        const personBadge = document.createElement('span');
        personBadge.className = 'person-badge';
        personBadge.innerHTML = `<i class="fas fa-user"></i> ${person}`;
        peopleElem.appendChild(personBadge);
    });
    
    content.appendChild(photoName);
    content.appendChild(dateElem);
    content.appendChild(peopleElem);
    
    card.appendChild(imgContainer);
    card.appendChild(content);
    
    // Thêm sự kiện click để mở xem ảnh toàn màn hình
    card.addEventListener('click', () => {
        openFullscreen(photo);
    });
    
    return card;
}

// Xử lý chọn file
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    // Xóa các lựa chọn trước đó
    selectedFilesContainer.innerHTML = '';
    
    // Hiển thị các file đã chọn
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'selected-file';
        fileItem.textContent = file.name;
        selectedFilesContainer.appendChild(fileItem);
    });
    
    // Cập nhật nhãn input file
    const label = photoUploadInput.nextElementSibling;
    label.textContent = files.length > 1 ? `${files.length} ảnh đã chọn` : files[0].name;
}

// Xử lý tải ảnh lên
function handlePhotoUpload() {
    const files = photoUploadInput.files;
    if (files.length === 0) {
        showToast('Lỗi', 'Vui lòng chọn ít nhất một ảnh', 'error');
        return;
    }
    
    const date = photoDateInput.value;
    if (!date) {
        showToast('Lỗi', 'Vui lòng chọn ngày chụp', 'error');
        return;
    }
    
    const people = [];
    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        people.push(checkbox.value);
    });
    
    // Hiển thị preloader
    preloader.style.display = 'flex';
    preloader.querySelector('p').textContent = 'Đang tải lên...';
    
    // Đóng modal
    closeModal(uploadModal);
    
    // Mảng chứa các promise upload
    const uploadPromises = [];
    
    Array.from(files).forEach(file => {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('date', date);
        formData.append('people', people.join(','));
        
        // Upload ảnh thông qua API
        uploadPromises.push(
            fetch('/api/photos/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                return data.photo;
            })
        );
    });
    
    Promise.all(uploadPromises)
        .then(newPhotos => {
            // Thêm ảnh mới vào mảng
            newPhotos.forEach(photo => {
                photos.unshift(photo);
            });
            
            // Reset form
            uploadForm.reset();
            photoDateInput.valueAsDate = new Date();
            selectedFilesContainer.innerHTML = '';
            
            // Ẩn preloader
            preloader.style.display = 'none';
            
            // Cập nhật timeline
            filterPhotos();
            
            // Hiển thị thông báo thành công
            showToast('Thành công', `Đã tải lên ${newPhotos.length} ảnh thành công`, 'success');
        })
        .catch(error => {
            // Ẩn preloader
            preloader.style.display = 'none';
            
// Hiển thị thông báo lỗi
showToast('Lỗi', 'Không thể tải lên ảnh: ' + error.message, 'error');
});
}

// Chuyển đổi bộ lọc người
function togglePersonFilter(e) {
// Xóa lớp active khỏi tất cả các bộ lọc người
personFilters.forEach(filter => {
filter.classList.remove('active');
filter.classList.remove('badge-primary');
filter.classList.add('badge-secondary');

// Xóa biểu tượng check nếu có
const icon = filter.querySelector('i');
if (icon) filter.removeChild(icon);
});

// Thêm lớp active vào bộ lọc đã nhấp
e.target.classList.add('active');
e.target.classList.remove('badge-secondary');
e.target.classList.add('badge-primary');

// Thêm biểu tượng check
if (!e.target.querySelector('i')) {
const icon = document.createElement('i');
icon.className = 'fas fa-check';
e.target.appendChild(icon);
}

// Áp dụng bộ lọc
filterPhotos();
}

// Mở xem ảnh toàn màn hình
function openFullscreen(photo) {
// Tìm chỉ mục ảnh trong danh sách đã lọc
currentPhotoIndex = filteredPhotos.findIndex(p => p.id === photo.id);

// Kiểm tra URL ảnh
let imgUrl = photo.url;
if (!imgUrl || imgUrl.includes('download')) {
imgUrl = `https://drive.google.com/uc?export=view&id=${photo.id}`;
}

// Đặt nguồn ảnh
fullscreenImg.src = imgUrl;

// Thêm xử lý lỗi ảnh
fullscreenImg.onerror = function() {
console.error(`Lỗi tải ảnh toàn màn hình: ${imgUrl}`);
// Thử với URL thay thế
if (photo.id) {
    const fallbackUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w1000`;
    fullscreenImg.src = fallbackUrl;
}
};

// Hiển thị chế độ xem toàn màn hình
fullscreenView.classList.add('show');

// Vô hiệu hóa cuộn trên body
document.body.style.overflow = 'hidden';
}

// Đóng chế độ xem toàn màn hình
function closeFullscreen() {
fullscreenView.classList.remove('show');
document.body.style.overflow = '';
}

// Hiển thị ảnh trước đó
function showPrevPhoto() {
if (currentPhotoIndex > 0) {
currentPhotoIndex--;
const photo = filteredPhotos[currentPhotoIndex];

// Kiểm tra URL ảnh
let imgUrl = photo.url;
if (!imgUrl || imgUrl.includes('download')) {
    imgUrl = `https://drive.google.com/uc?export=view&id=${photo.id}`;
}

fullscreenImg.src = imgUrl;
}
}

// Hiển thị ảnh tiếp theo
function showNextPhoto() {
if (currentPhotoIndex < filteredPhotos.length - 1) {
currentPhotoIndex++;
const photo = filteredPhotos[currentPhotoIndex];

// Kiểm tra URL ảnh
let imgUrl = photo.url;
if (!imgUrl || imgUrl.includes('download')) {
    imgUrl = `https://drive.google.com/uc?export=view&id=${photo.id}`;
}

fullscreenImg.src = imgUrl;
}
}

// Xác nhận xóa ảnh
function confirmDeletePhoto(photo) {
if (confirm('Bạn có chắc muốn xóa ảnh này không?')) {
deletePhoto(photo);
}
}

// Xóa ảnh
function deletePhoto(photo) {
// Hiển thị preloader
preloader.style.display = 'flex';
preloader.querySelector('p').textContent = 'Đang xóa ảnh...';

// Xóa ảnh thông qua API
fetch(`/api/photos/${photo.id}`, {
method: 'DELETE'
})
.then(response => {
if (!response.ok) {
    throw new Error('Network response was not ok');
}
return response.json();
})
.then(data => {
// Xóa khỏi mảng local
const index = photos.findIndex(p => p.id === photo.id);
if (index > -1) {
    photos.splice(index, 1);
}

// Ẩn preloader
preloader.style.display = 'none';

// Cập nhật UI
filterPhotos();

// Hiển thị thông báo thành công
showToast('Thành công', 'Đã xóa ảnh', 'success');
})
.catch(error => {
// Ẩn preloader
preloader.style.display = 'none';

// Hiển thị thông báo lỗi
showToast('Lỗi', 'Không thể xóa ảnh: ' + error.message, 'error');
});
}

// Hàm tải ảnh về
function downloadPhoto(photo) {
// Tìm URL tải xuống
let downloadUrl = photo.downloadUrl || photo.url;

// Nếu không có URL tải xuống, tạo từ ID
if (!downloadUrl && photo.id) {
downloadUrl = `https://drive.google.com/uc?export=download&id=${photo.id}`;
}

if (downloadUrl) {
// Tạo thẻ a ẩn để tải xuống
const a = document.createElement('a');
a.href = downloadUrl;
a.download = photo.name || `photo-${photo.id}.jpg`;
a.style.display = 'none';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);

showToast('Thành công', 'Đang tải ảnh xuống...', 'success');
} else {
showToast('Lỗi', 'Không thể tải ảnh xuống: URL không hợp lệ', 'error');
}
}

// Hàm hiển thị form đổi tên ảnh
function promptRenamePhoto(photo) {
const newName = prompt('Nhập tên mới cho ảnh:', photo.name || '');

if (newName === null) {
// Người dùng đã hủy
return;
}

if (newName.trim() === '') {
showToast('Lỗi', 'Tên ảnh không được để trống', 'error');
return;
}

renamePhoto(photo, newName);
}

// Hàm đổi tên ảnh
function renamePhoto(photo, newName) {
// Hiển thị preloader
preloader.style.display = 'flex';
preloader.querySelector('p').textContent = 'Đang đổi tên ảnh...';

// Gọi API đổi tên
fetch(`/api/photos/${photo.id}/rename`, {
method: 'PUT',
headers: {
    'Content-Type': 'application/json',
},
body: JSON.stringify({ newName }),
})
.then(response => {
if (!response.ok) {
    throw new Error('Network response was not ok');
}
return response.json();
})
.then(data => {
// Cập nhật trong mảng local
const index = photos.findIndex(p => p.id === photo.id);
if (index > -1) {
    photos[index].name = data.photo.name;
}

// Ẩn preloader
preloader.style.display = 'none';

// Cập nhật UI
filterPhotos();

// Hiển thị thông báo thành công
showToast('Thành công', 'Đã đổi tên ảnh thành công', 'success');
})
.catch(error => {
// Ẩn preloader
preloader.style.display = 'none';

// Hiển thị thông báo lỗi
showToast('Lỗi', 'Không thể đổi tên ảnh: ' + error.message, 'error');
});
}

// Khởi tạo khi trang đã tải xong
document.addEventListener('DOMContentLoaded', init);