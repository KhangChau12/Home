// Biến toàn cục
let photos = [];
let filteredPhotos = [];
let favoritePhotos = [];
let currentPhotoIndex = 0;
let currentGalleryIndex = 0;
let galleryInterval = null;
let isGalleryPaused = false;

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
const navUploadBtn = document.querySelector('.navbar-actions .btn'); // Thêm nút tải ảnh trên navbar

// Gallery elements
const favoriteGalleryContainer = document.getElementById('favorite-gallery-container');
const favoriteGallery = document.getElementById('favorite-gallery');
const emptyFavorites = document.getElementById('empty-favorites');
const galleryIndicators = document.getElementById('gallery-indicators');
const galleryPrevBtn = document.getElementById('gallery-prev');
const galleryNextBtn = document.getElementById('gallery-next');
const galleryPauseBtn = document.getElementById('gallery-pause');

// Khởi tạo - Load ảnh từ API
function init() {
    // Kết nối nút tải ảnh trên thanh navigation
    if (navUploadBtn) {
        navUploadBtn.addEventListener('click', () => showModal(uploadModal));
    }
    
    // Hiển thị preloader khi tải ảnh
    preloader.style.display = 'flex';
    preloader.querySelector('p').textContent = 'Đang tải ảnh...';
    
    // Tải ảnh từ API
    fetch('/api/photos')
        .then(response => response.json())
        .then(data => {
            // Lưu dữ liệu ảnh
            photos = data;
            
            // Lọc ảnh yêu thích
            favoritePhotos = photos.filter(photo => photo.isFavorite === true);
            
            // Ẩn preloader
            preloader.style.display = 'none';
            
            // Lọc và hiển thị ảnh
            filterPhotos();
            
            // Khởi tạo gallery ảnh yêu thích
            initFavoriteGallery();
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
    
    // Thiết lập sự kiện cho gallery, kiểm tra các phần tử có tồn tại không
    if (galleryPrevBtn) {
        galleryPrevBtn.addEventListener('click', prevGallerySlide);
    }
    if (galleryNextBtn) {
        galleryNextBtn.addEventListener('click', nextGallerySlide);
    }
    if (galleryPauseBtn) {
        galleryPauseBtn.addEventListener('click', toggleGalleryAutoplay);
    }
    
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
    if (document.getElementById('empty-upload-btn')) {
        document.getElementById('empty-upload-btn').addEventListener('click', function() {
            showModal(uploadModal);
        });
    }
}

// Khởi tạo gallery ảnh yêu thích
function initFavoriteGallery() {
    // Kiểm tra xem các phần tử gallery có tồn tại không
    if (!favoriteGallery || !galleryIndicators) {
        console.error('Không tìm thấy các phần tử gallery');
        return;
    }
    
    // Xóa gallery cũ
    clearGallery();
    
    // Hiển thị/ẩn container nếu không có ảnh yêu thích
    if (favoriteGalleryContainer) {
        if (favoritePhotos.length === 0) {
            favoriteGalleryContainer.style.display = 'none';
            return;
        } else {
            favoriteGalleryContainer.style.display = 'block';
        }
    }
    
    // Hiển thị thông báo nếu không có ảnh yêu thích
    if (emptyFavorites) {
        if (favoritePhotos.length === 0) {
            emptyFavorites.style.display = 'flex';
            return;
        } else {
            emptyFavorites.style.display = 'none';
        }
    }
    
    // Thêm từng slide ảnh yêu thích
    favoritePhotos.forEach((photo, index) => {
        // Tạo slide
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.dataset.index = index;
        
        // Tạo ảnh
        const img = document.createElement('img');
        img.src = photo.url;
        img.alt = photo.name || 'Ảnh yêu thích';
        
        // Thêm xử lý lỗi ảnh
        img.onerror = function() {
            console.error(`Lỗi tải ảnh gallery: ${photo.url}`);
            // Thử lại với URL khác
            if (photo.id) {
                const fallbackUrl = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w1000`;
                console.log(`Thử tải lại với URL thay thế: ${fallbackUrl}`);
                img.src = fallbackUrl;
            }
        };
        
        // Tạo thông tin slide
        const slideInfo = document.createElement('div');
        slideInfo.className = 'slide-info';
        
        const slideTitle = document.createElement('div');
        slideTitle.className = 'slide-title';
        slideTitle.textContent = photo.name || 'Ảnh không tên';
        
        const slideDetails = document.createElement('div');
        slideDetails.className = 'slide-details';
        
        const photoDate = new Date(photo.date);
        const formattedDate = `${photoDate.getDate()}/${photoDate.getMonth() + 1}/${photoDate.getFullYear()}`;
        
        slideDetails.innerHTML = `
            <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
            <span><i class="fas fa-users"></i> ${photo.people.join(', ')}</span>
        `;
        
        slideInfo.appendChild(slideTitle);
        slideInfo.appendChild(slideDetails);
        
        // Thêm vào slide
        slide.appendChild(img);
        slide.appendChild(slideInfo);
        
        // Thêm sự kiện click để mở xem toàn màn hình
        slide.addEventListener('click', () => {
            openFullscreen(photo);
        });
        
        // Thêm vào gallery
        favoriteGallery.appendChild(slide);
        
        // Thêm chỉ báo (indicator)
        const indicator = document.createElement('div');
        indicator.className = 'gallery-indicator';
        indicator.dataset.index = index;
        
        indicator.addEventListener('click', () => {
            goToGallerySlide(index);
        });
        
        galleryIndicators.appendChild(indicator);
    });
    
    // Hiển thị slide đầu tiên
    goToGallerySlide(0);
    
    // Bắt đầu autoplay gallery
    startGalleryAutoplay();
}

// Xóa gallery
function clearGallery() {
    // Kiểm tra xem các phần tử gallery có tồn tại không
    if (!favoriteGallery || !galleryIndicators) {
        return;
    }
    
    // Xóa interval cũ
    if (galleryInterval) {
        clearInterval(galleryInterval);
        galleryInterval = null;
    }
    
    // Xóa tất cả slides (ngoại trừ empty-favorites)
    const slidesToRemove = [];
    
    Array.from(favoriteGallery.children).forEach(child => {
        if (child.id !== 'empty-favorites') {
            slidesToRemove.push(child);
        }
    });
    
    slidesToRemove.forEach(slide => slide.remove());
    
    // Xóa tất cả indicators
    galleryIndicators.innerHTML = '';
}

// Bắt đầu autoplay gallery
function startGalleryAutoplay() {
    // Kiểm tra xem có ảnh yêu thích không
    if (favoritePhotos.length === 0) {
        return;
    }
    
    // Dừng interval cũ nếu có
    if (galleryInterval) {
        clearInterval(galleryInterval);
    }
    
    // Bắt đầu interval mới (5 giây/slide)
    galleryInterval = setInterval(() => {
        if (!isGalleryPaused && favoritePhotos.length > 0) {
            nextGallerySlide();
        }
    }, 5000);
    
    // Cập nhật trạng thái button
    if (galleryPauseBtn) {
        galleryPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
    isGalleryPaused = false;
}

// Chuyển đến slide cụ thể
function goToGallerySlide(index) {
    // Kiểm tra nếu không có ảnh yêu thích
    if (favoritePhotos.length === 0) {
        return;
    }
    
    // Kiểm tra index
    if (index < 0) {
        index = favoritePhotos.length - 1;
    } else if (index >= favoritePhotos.length) {
        index = 0;
    }
    
    // Cập nhật vị trí hiện tại
    currentGalleryIndex = index;
    
    // Di chuyển gallery
    favoriteGallery.style.transform = `translateX(-${index * 100}%)`;
    
    // Cập nhật indicators
    const indicators = document.querySelectorAll('.gallery-indicator');
    indicators.forEach((indicator, i) => {
        if (i === index) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Di chuyển đến slide trước
function prevGallerySlide() {
    goToGallerySlide(currentGalleryIndex - 1);
}

// Di chuyển đến slide tiếp theo
function nextGallerySlide() {
    goToGallerySlide(currentGalleryIndex + 1);
}

// Toggle autoplay gallery
function toggleGalleryAutoplay() {
    isGalleryPaused = !isGalleryPaused;
    
    if (galleryPauseBtn) {
        if (isGalleryPaused) {
            galleryPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            galleryPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }
}

// Lọc ảnh theo năm và người
function filterPhotos() {
    const selectedYear = yearFilter.value;
    const selectedPerson = document.querySelector('.badge[data-person].active')?.dataset.person || 'all';
    
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
    
    // Thêm nút yêu thích
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `favorite-toggle ${photo.isFavorite ? 'active' : ''}`;
    favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
    favoriteBtn.title = photo.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích';
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(photo);
    });
    
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
    imgContainer.appendChild(favoriteBtn);
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

// Hàm đánh dấu/bỏ đánh dấu ảnh yêu thích
function toggleFavorite(photo) {
    // Cập nhật trạng thái yêu thích
    const newState = !photo.isFavorite;
    
    // Hiển thị preloader
    preloader.style.display = 'flex';
    preloader.querySelector('p').textContent = newState ? 'Đang thêm vào yêu thích...' : 'Đang bỏ yêu thích...';
    
    // Gọi API để cập nhật trạng thái
    fetch(`/api/photos/${photo.id}/favorite`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite: newState }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Cập nhật trạng thái local
        photo.isFavorite = newState;
        
        // Cập nhật danh sách ảnh yêu thích
        if (newState) {
            // Thêm vào danh sách yêu thích nếu chưa có
            if (!favoritePhotos.some(p => p.id === photo.id)) {
                favoritePhotos.push(photo);
            }
        } else {
            // Xóa khỏi danh sách yêu thích
            favoritePhotos = favoritePhotos.filter(p => p.id !== photo.id);
        }
        
        // Cập nhật UI
        const favoriteBtn = document.querySelector(`.photo-card[data-id="${photo.id}"] .favorite-toggle`);
        if (favoriteBtn) {
            if (newState) {
                favoriteBtn.classList.add('active');
                favoriteBtn.title = 'Bỏ yêu thích';
            } else {
                favoriteBtn.classList.remove('active');
                favoriteBtn.title = 'Yêu thích';
            }
        }
        
        // Ẩn preloader
        preloader.style.display = 'none';
        
        // Cập nhật gallery ảnh yêu thích
        initFavoriteGallery();
        
        // Hiển thị thông báo thành công
        showToast('Thành công', newState ? 'Đã thêm vào danh sách yêu thích' : 'Đã xóa khỏi danh sách yêu thích', 'success');
    })
    .catch(error => {
        // Ẩn preloader
        preloader.style.display = 'none';
        
        // Hiển thị thông báo lỗi
        showToast('Lỗi', 'Không thể cập nhật trạng thái yêu thích: ' + error.message, 'error');
    });
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
    
    // Hiển thị caption nếu có
    const captionElem = document.getElementById('fullscreen-caption');
    if (captionElem) {
        const photoDate = new Date(photo.date);
        const formattedDate = `${photoDate.getDate()}/${photoDate.getMonth() + 1}/${photoDate.getFullYear()}`;
        
        captionElem.innerHTML = `
            <div class="caption-title">${photo.name || 'Ảnh không tên'}</div>
            <div class="caption-info">
                <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                <span><i class="fas fa-users"></i> ${photo.people.join(', ')}</span>
            </div>
        `;
    }
    
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
        
        // Cập nhật caption
        updateFullscreenCaption(photo);
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
        
        // Cập nhật caption
        updateFullscreenCaption(photo);
    }
}

// Cập nhật caption cho chế độ xem toàn màn hình
function updateFullscreenCaption(photo) {
    const captionElem = document.getElementById('fullscreen-caption');
    if (captionElem) {
        const photoDate = new Date(photo.date);
        const formattedDate = `${photoDate.getDate()}/${photoDate.getMonth() + 1}/${photoDate.getFullYear()}`;
        
        captionElem.innerHTML = `
            <div class="caption-title">${photo.name || 'Ảnh không tên'}</div>
            <div class="caption-info">
                <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                <span><i class="fas fa-users"></i> ${photo.people.join(', ')}</span>
            </div>
        `;
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
        
        // Xóa khỏi mảng ảnh yêu thích nếu có
        const favoriteIndex = favoritePhotos.findIndex(p => p.id === photo.id);
        if (favoriteIndex > -1) {
            favoritePhotos.splice(favoriteIndex, 1);
        }
        
        // Ẩn preloader
        preloader.style.display = 'none';
        
        // Cập nhật UI
        filterPhotos();
        initFavoriteGallery();
        
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
        
        // Cập nhật trong mảng ảnh yêu thích nếu có
        const favoriteIndex = favoritePhotos.findIndex(p => p.id === photo.id);
        if (favoriteIndex > -1) {
            favoritePhotos[favoriteIndex].name = data.photo.name;
        }
        
        // Ẩn preloader
        preloader.style.display = 'none';
        
        // Cập nhật UI
        filterPhotos();
        initFavoriteGallery();
        
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