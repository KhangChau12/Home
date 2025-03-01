// Global variables
let photos = [];
let filteredPhotos = []; 
let currentPhotoIndex = 0;

// DOM Elements
const preloader = document.getElementById('preloader');
const uploadForm = document.getElementById('upload-form');
const photoUploadInput = document.getElementById('photo-upload');
const photoDateInput = document.getElementById('photo-date');
const selectedFilesContainer = document.getElementById('selected-files');
const uploadModal = document.getElementById('upload-modal');
const showUploadModalBtn = document.getElementById('show-upload-modal');
const closeUploadModalBtn = document.getElementById('close-upload-modal');
const cancelUploadBtn = document.getElementById('cancel-upload');
const submitUploadBtn = document.getElementById('submit-upload');
const emptyUploadBtn = document.getElementById('empty-upload-btn');
const yearFilter = document.getElementById('year-filter');
const personFilters = document.querySelectorAll('.badge[data-person]');
const photosTimeline = document.getElementById('photos-timeline');
const emptyTimeline = document.getElementById('empty-timeline');
const fullscreenView = document.getElementById('fullscreen-view');
const fullscreenImg = document.getElementById('fullscreen-img');
const closeFullscreenBtn = document.getElementById('close-fullscreen');
const prevPhotoBtn = document.getElementById('prev-photo');
const nextPhotoBtn = document.getElementById('next-photo');
const toastContainer = document.getElementById('toast-container');
const navUploadBtn = document.querySelector('.navbar-actions .btn');

// Set current date as default for photo upload
photoDateInput.valueAsDate = new Date();

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
showUploadModalBtn.addEventListener('click', () => showModal(uploadModal)); // Đổi từ openModal sang showModal
if (navUploadBtn) {
    navUploadBtn.addEventListener('click', () => showModal(uploadModal));
}
closeUploadModalBtn.addEventListener('click', () => closeModal(uploadModal));
cancelUploadBtn.addEventListener('click', () => closeModal(uploadModal));
emptyUploadBtn.addEventListener('click', () => showModal(uploadModal)); // Đổi từ openModal sang showModal
submitUploadBtn.addEventListener('click', handlePhotoUpload);

yearFilter.addEventListener('change', filterPhotos);
personFilters.forEach(filter => {
    filter.addEventListener('click', togglePersonFilter);
});

closeFullscreenBtn.addEventListener('click', closeFullscreen);
prevPhotoBtn.addEventListener('click', showPrevPhoto);
nextPhotoBtn.addEventListener('click', showNextPhoto);

photoUploadInput.addEventListener('change', handleFileSelect);

// Keyboard navigation for fullscreen view
document.addEventListener('keydown', (e) => {
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

// Initialize app
function initialize() {
    // Show preloader
    preloader.style.display = 'flex';
    preloader.querySelector('p').textContent = 'Đang tải ảnh...';
    
    // Fetch photos from server
    fetch('/api/photos')
        .then(response => response.json())
        .then(data => {
            photos = data;
            filterPhotos();
            
            if (photos.length === 0) {
                emptyTimeline.style.display = 'block';
            } else {
                emptyTimeline.style.display = 'none';
            }
            
            // Hide preloader
            preloader.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching photos:', error);
            showToast('Lỗi', 'Không thể tải dữ liệu ảnh', 'error');
            
            // Hide preloader
            preloader.style.display = 'none';
        });
}