// 智能图片扫描
document.addEventListener('DOMContentLoaded', () => {
  const galleryContainer = document.querySelector('.gallery-container');
  const imageDir = 'images';
  const maxImages = 500; // 安全上限（避免无限请求）
  let loadedImages = [];
  let currentIndex = 1;
  
  // 清空加载提示
  galleryContainer.innerHTML = '';
  
  // 智能扫描图片目录
  function scanImages() {
    const img = new Image();
    img.onload = () => {
      // 获取图片自然宽高比
      const ratio = img.naturalWidth / img.naturalHeight;
      const ratioClass = 
        ratio > 1.3 ? 'landscape' : 
        ratio < 0.7 ? 'portrait' : 
        'square';
      
      // 提取文件名（不含扩展名）
      const filename = img.src.split('/').pop();
      const title = filename.replace(/\.[^/.]+$/, "");
      
      // 创建图片项
      const card = createGalleryItem(img.src, title, ratioClass);
      galleryContainer.appendChild(card);
      loadedImages.push(img.src);
      
      // 继续扫描下一张
      currentIndex++;
      if (currentIndex <= maxImages) {
        scanImages();
      }
    };
    
    img.onerror = () => {
      // 扫描完成：没有更多图片
      if (loadedImages.length === 0) {
        galleryContainer.innerHTML = `
          <div class="gallery-loading" style="grid-column: 1 / -1">
            未找到图片！请将图片放入 /images 目录
          </div>
        `;
      }
    };
    
    // 尝试加载图片
    img.src = `${imageDir}/${currentIndex}.jpg`;
  }
  
  // 创建图片项
  function createGalleryItem(src, title, ratioClass) {
    const card = document.createElement('div');
    card.className = `gallery-item ${ratioClass}`;
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = title;
    img.loading = 'lazy';
    img.decoding = 'async';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'gallery-title';
    titleEl.textContent = title;
    
    card.appendChild(img);
    card.appendChild(titleEl);
    card.addEventListener('click', () => openLightbox(src, title));
    
    return card;
  }
  
  // 启动扫描
  scanImages();
});

// Lightbox 系统
let lightboxImg, lightboxTitle, zoomLevel;

document.addEventListener('DOMContentLoaded', () => {
  lightboxImg = document.getElementById('lightbox-image');
  lightboxTitle = document.getElementById('lightbox-title');
  zoomLevel = document.getElementById('zoom-level');
  
  // 初始化控件
  initLightboxControls();
});

function openLightbox(src, title) {
  lightboxImg.src = src;
  lightboxTitle.textContent = title || '无标题';
  
  // 等待图片加载完成再显示
  lightboxImg.onload = () => {
    resetView();
    document.getElementById('lightbox').classList.add('show');
    document.body.style.overflow = 'hidden';
  };
}

function resetView() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  applyTransform();
  updateZoomLevel();
}

function applyTransform() {
  lightboxImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
}

function updateZoomLevel() {
  zoomLevel.textContent = `${Math.round(scale * 100)}%`;
}

// Lightbox 控件初始化
function initLightboxControls() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('close');
  const resetBtn = document.getElementById('reset');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const downloadBtn = document.getElementById('download');

  let scale = 1;
  const SCALE_STEP = 0.25;
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 4;
  let isDragging = false;
  let startX, startY, translateX = 0, translateY = 0;

  // 事件绑定
  closeBtn.addEventListener('click', () => {
    lightbox.classList.remove('show');
    document.body.style.overflow = '';
  });
  
  resetBtn.addEventListener('click', resetView);
  lightbox.addEventListener('click', e => e.target === lightbox && closeLightbox());
  document.addEventListener('keydown', e => e.key === 'Escape' && lightbox.classList.contains('show') && closeLightbox());

  // 缩放控制
  zoomInBtn.addEventListener('click', () => {
    if (scale < MAX_SCALE) {
      scale = Math.min(MAX_SCALE, scale + SCALE_STEP);
      applyTransform();
      updateZoomLevel();
    }
  });

  zoomOutBtn.addEventListener('click', () => {
    if (scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
      applyTransform();
      updateZoomLevel();
    }
  });

  // 下载功能
  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = lightboxImg.src;
    link.download = lightboxImg.src.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // 拖拽控制
  lightboxImg.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    lightboxImg.setAttribute('data-dragging', 'true');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    applyTransform();
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    lightboxImg.removeAttribute('data-dragging');
  });

  // 滚轮缩放（比例感知）
  lightboxImg.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    
    // 智能缩放：横图/竖图不同处理
    const imgRatio = lightboxImg.naturalWidth / lightboxImg.naturalHeight;
    const containerRatio = lightboxImg.parentElement.clientWidth / lightboxImg.parentElement.clientHeight;
    
    // 横图处理（宽度受限）
    if (imgRatio > containerRatio && newScale > 1) {
      const maxScale = lightboxImg.parentElement.clientWidth / lightboxImg.naturalWidth;
      scale = Math.min(maxScale, newScale);
    } 
    // 竖图处理（高度受限）
    else if (imgRatio < containerRatio && newScale > 1) {
      const maxScale = lightboxImg.parentElement.clientHeight / lightboxImg.naturalHeight;
      scale = Math.min(maxScale, newScale);
    } 
    // 方图处理
    else {
      scale = newScale;
    }
    
    applyTransform();
    updateZoomLevel();
  }, { passive: false });
}
