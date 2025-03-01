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
    img.src = photo.url;
    img.alt = 'Ảnh gia đình';
    img.loading = 'lazy';
    
    const overlay = document.createElement('div');
    overlay.className = 'photo-overlay';
    
    const actions = document.createElement('div');
    actions.className = 'photo-actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-light btn-icon-only';
    viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openFullscreen(photo);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-icon-only';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeletePhoto(photo);
    });
    
    actions.appendChild(viewBtn);
    actions.appendChild(deleteBtn);
    
    overlay.appendChild(actions);
    imgContainer.appendChild(img);
    imgContainer.appendChild(overlay);
    
    const content = document.createElement('div');
    content.className = 'photo-content';
    
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
    
    // Đặt nguồn ảnh
    fullscreenImg.src = photo.url;
    
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
        fullscreenImg.src = filteredPhotos[currentPhotoIndex].url;
    }
}

// Hiển thị ảnh tiếp theo
function showNextPhoto() {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
        currentPhotoIndex++;
        fullscreenImg.src = filteredPhotos[currentPhotoIndex].url;
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