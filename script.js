// 更新日志
// [10.31.2025]每张图片保持原始宽高比（无变形）
// [10.31.2025]完美支持横图、竖图、方图
// [10.31.2025]仿Win11 风格设计
// [11.2.2025]专为 Netlify 部署优化（不依赖 GitHub Action）
// [11.2.2025]触摸优化（未实验的功能）
// [11.3.2025]修复 Netlify 永久加载问题（路径+CSS+空格）
// [11.3.2025]移除所有 attr() 用法，使用 JS 动态设置高度
// [11.5.2025]重写路径获取函数
document.addEventListener('DOMContentLoaded', () => {
  // ===== 初始化 =====
  initTheme();
  setupYearInFooter();
  setupThemeToggle();
  setupRefreshButton();
  // ===== 加载图片 =====
  loadImages();
  // ===== 设置 Lightbox =====
  setupLightbox();
});

/**
 * 初始化主题（从 localStorage 读取）
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

/**
 * 设置页脚年份
 */
function setupYearInFooter() {
  document.getElementById('current-year')?.textContent = new Date().getFullYear();
}

/**
 * 设置主题切换按钮
 */
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  // 更新按钮图标
  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = isDark ? 
      '<i class="fas fa-sun"></i> 亮色' : 
      '<i class="fas fa-moon"></i> 暗色';
  }
  // 初始设置
  updateThemeIcon();
  // 添加点击事件
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    updateThemeIcon();
  });
}

/**
 * 设置刷新按钮
 */
function setupRefreshButton() {
  const refreshBtn = document.getElementById('refresh-btn');
  if (!refreshBtn) return;
  refreshBtn.addEventListener('click', () => {
    const galleryContainer = document.querySelector('.gallery-container');
    galleryContainer.innerHTML = `
      <div class="gallery-loading">
        <div class="loading-spinner"></div>
        <p>正在刷新图片...</p>
      </div>
    `;
    // 强制刷新缓存
    loadImages(true);
  });
}

/**
 * 获取基础路径（Netlify 专用修复版）
 * 修复：返回空字符串，避免 //images.json 问题
 */
function getBasePath() {
  return '';
}

/**
 * 带超时的 fetch 请求
 */
function fetchWithTimeout(url, options = {}, timeout = 8000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('请求超时（8秒）')), timeout)
    )
  ]);
}

/**
 * 加载图片列表（终极修复版）
 */
function loadImages(forceRefresh = false) {
  const galleryContainer = document.querySelector('.gallery-container');
  
  // 检查必需的 DOM 元素
  if (!galleryContainer) {
    console.error('❌ 错误：.gallery-container 元素不存在');
    document.body.innerHTML = '<div style="text-align:center;padding:40px;color:red">页面结构错误，请检查HTML</div>';
    return;
  }

  // 1. 获取正确的基础路径（空字符串）
  const basePath = getBasePath();
  // 2. 直接使用相对路径（关键修复）
  const imageListPath = 'images.json' + (forceRefresh ? `?t=${Date.now()}` : '');
  
  // 3. 显示加载状态
  galleryContainer.innerHTML = `
    <div class="gallery-loading">
      <div class="loading-spinner"></div>
      <p>正在加载图片列表...</p>
      <div class="debug-info" style="font-size: 0.85rem; color: #666; margin-top: 10px;">
        请求路径: ${imageListPath}
      </div>
    </div>
  `;
  
  // 4. 添加调试日志
  console.log('[23班照片墙] 开始加载图片');
  console.log('[23班照片墙] 当前 URL:', window.location.href);
  console.log('[23班照片墙] 请求 images.json:', imageListPath);
  
  // 5. 使用带超时的 fetch
  fetchWithTimeout(imageListPath)
    .then(response => {
      console.log('[23班照片墙] images.json 响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      
      return response.json();
    })
    .then(imagePaths => {
      console.log('[23班照片墙] images.json 响应内容:', imagePaths);
      
      // 4. 验证数据结构
      if (!Array.isArray(imagePaths)) {
        throw new Error('❌ 图片列表格式错误，应为数组');
      }
      
      // 5. 过滤有效图片路径
      const validImages = imagePaths
        .filter(path => path && typeof path === 'string')
        .map(path => path.trim())
        .filter(path => /\.(jpe?g|png|webp|gif|bmp|svg|tiff?|heic|avif)$/i.test(path));
      
      if (validImages.length === 0) {
        throw new Error('❌ 未找到有效图片路径，请确认：<br>' +
          '1. images/ 目录中有支持的图片格式<br>' +
          '2. Netlify 构建流程已正确生成 images.json');
      }
      
      // 6. 显示调试信息
      console.log('[23班照片墙] 有效图片路径:', validImages);
      
      // 7. 清空容器
      galleryContainer.innerHTML = '';
      
      // 8. 生成图片项
      validImages.forEach(src => {
        createGalleryItem(galleryContainer, src);
      });
      
      // 9. 显示找到的图片数量
      const infoBar = document.createElement('div');
      infoBar.className = 'scan-info';
      infoBar.innerHTML = `
        <strong>✓ 找到 ${validImages.length} 张图片</strong>
        <div class="info-subtext">点击图片查看高清大图</div>
      `;
      galleryContainer.parentNode.insertBefore(infoBar, galleryContainer);
      
      console.log('[23班照片墙] ✅ 图片加载成功！');
    })
    .catch(error => {
      const errorMessage = error.message || String(error);
      console.error('[23班照片墙] 加载错误:', errorMessage);
      
      galleryContainer.innerHTML = `
        <div class="gallery-loading" style="
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px;
          background: rgba(255, 240, 240, 0.4);
          border-radius: 12px;
          max-width: 800px;
          margin: 0 auto;
        ">
          <h3 style="margin-bottom: 15px; color: #e74c3c;">❌ 图片加载失败</h3>
          <p style="line-height: 1.6; margin-bottom: 20px; word-break: break-all;">
            ${errorMessage}
          </p>
          <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: left;">
            <strong>调试信息:</strong>
            <ul style="margin: 10px 0 0 20px; line-height: 1.6;">
              <li>当前 URL: ${window.location.href}</li>
              <li>尝试路径: images.json</li>
              <li>浏览器: ${navigator.userAgent}</li>
            </ul>
          </div>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 15px;">
            <button id="retry-btn" style="
              background: var(--win11-accent);
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.95rem;
            ">重试加载</button>
            <button id="manual-check-btn" style="
              background: #f0f0f0;
              color: #333;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.95rem;
            ">手动检查 images.json</button>
          </div>
        </div>
      `;
      
      // 添加重试按钮事件
      document.getElementById('retry-btn')?.addEventListener('click', () => {
        galleryContainer.innerHTML = `
          <div class="gallery-loading">
            <div class="loading-spinner"></div>
            <p>正在重新加载...</p>
          </div>
        `;
        loadImages(true);
      });
      
      // 添加手动检查按钮
      document.getElementById('manual-check-btn')?.addEventListener('click', () => {
        const checkUrl = `${window.location.origin}/images.json`;
        window.open(checkUrl, '_blank');
        alert(`已打开 images.json 请检查:\n${checkUrl}\n\n如果看到有效的 JSON 内容，说明文件存在但前端无法访问`);
      });
    });
}

/**
 * 创建单个图片项（自适应尺寸版 - 修复CSS问题）
 */
function createGalleryItem(container, src) {
  const filename = src.split('/').pop();
  const title = filename.replace(/\.[^/.]+$/, "");
  
  // 创建图片项
  const card = document.createElement('div');
  card.className = 'gallery-item';
  
  // 创建图片容器（关键修复：不用 attr()）
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  // 设置默认高度（1:1 比例）
  imageContainer.style.paddingTop = '100%';
  
  const img = document.createElement('img');
  img.src = src;
  img.alt = title;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.fetchPriority = 'low';
  
  // 添加加载错误处理
  img.onerror = () => {
    console.error(`图片加载失败: ${src}`);
    card.style.opacity = '0.5';
    card.title = '图片加载失败';
    
    // 显示错误占位符
    img.src = 'image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f8f9fa"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="%236c757d" text-anchor="middle" dominant-baseline="middle">图片加载失败</text></svg>';
    imageContainer.style.paddingTop = '100%'; // 确保有高度
  };
  
  // 动态计算宽高比
  img.onload = () => {
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    // 计算 padding-top 百分比 (高度/宽度 * 100%)
    const paddingTop = (1 / aspectRatio * 100).toFixed(2);
    imageContainer.style.paddingTop = `${paddingTop}%`;
    console.log(`[23班照片墙] "${title}" 比例: ${aspectRatio.toFixed(2)} → paddingTop: ${paddingTop}%`);
  };
  
  const titleEl = document.createElement('div');
  titleEl.className = 'gallery-title';
  titleEl.textContent = title;
  
  // 组装结构
  imageContainer.appendChild(img);
  card.appendChild(imageContainer);
  card.appendChild(titleEl);
  
  // 设置数据属性
  card.dataset.src = src;
  card.dataset.title = title;
  
  // 修复：正确处理点击事件
  card.addEventListener('click', (e) => {
    if (typeof window.openLightbox === 'function') {
      window.openLightbox(src, title);
    } else {
      console.error('lightbox 函数未定义');
      alert('图片查看器未正确初始化，请刷新页面');
    }
  });
  
  container.appendChild(card);
}

/**
 * 设置 Lightbox 系统
 */
function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxTitle = document.getElementById('lightbox-title');
  const zoomLevel = document.getElementById('zoom-level');
  const imageSize = document.getElementById('image-size');
  const imageDimensions = document.getElementById('image-dimensions');
  
  // 控件
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
  let imageSizeData = null;
  
  // 打开lightbox
  window.openLightbox = function(src, title) {
    lightboxTitle.textContent = title || '无标题';
    lightboxImg.src = src;
    
    // 重置状态
    scale = 1;
    translateX = 0;
    translateY = 0;
    
    // 显示加载状态
    imageSize.textContent = '加载中...';
    imageDimensions.textContent = '--- × ---';
    
    // 获取图片尺寸信息
    fetchImageSize(src).then(sizeData => {
      imageSizeData = sizeData;
      updateImageInfo();
    }).catch(() => {
      imageSize.textContent = '未知大小';
    });
    
    // 等待图片加载完成
    lightboxImg.onload = () => {
      applyTransform();
      updateZoomLevel();
      updateImageInfo();
      lightbox.classList.add('show');
      document.body.style.overflow = 'hidden';
    };
    
    // 错误处理
    lightboxImg.onerror = () => {
      alert(`无法加载图片: ${src}\n请检查图片路径是否正确`);
    };
  };
  
  // 获取图片尺寸信息
  async function fetchImageSize(src) {
    try {
      const response = await fetch(src, { method: 'HEAD' });
      if (response.ok) {
        const size = response.headers.get('content-length');
        return {
          size: size ? formatFileSize(parseInt(size)) : '未知大小',
          dimensions: `${lightboxImg.naturalWidth} × ${lightboxImg.naturalHeight}`
        };
      }
      return null;
    } catch (error) {
      console.error('获取图片大小失败:', error);
      return null;
    }
  }
  
  // 格式化文件大小
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  // 更新图片信息
  function updateImageInfo() {
    if (imageSizeData) {
      imageSize.textContent = imageSizeData.size;
      imageDimensions.textContent = imageSizeData.dimensions;
    } else if (lightboxImg.naturalWidth && lightboxImg.naturalHeight) {
      imageSize.textContent = '加载中...';
      imageDimensions.textContent = `${lightboxImg.naturalWidth} × ${lightboxImg.naturalHeight}`;
    }
  }
  
  // 重置视图
  function resetView() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
    updateZoomLevel();
  }
  
  // 应用变换
  function applyTransform() {
    lightboxImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  }
  
  // 更新缩放比例
  function updateZoomLevel() {
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
  }
  
  // 关闭lightbox
  function closeLightbox() {
    lightbox.classList.remove('show');
    document.body.style.overflow = '';
  }
  
  // 事件绑定
  closeBtn?.addEventListener('click', closeLightbox);
  resetBtn?.addEventListener('click', resetView);
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox?.classList.contains('show')) {
      closeLightbox();
    }
  });
  
  // 缩放控制
  zoomInBtn?.addEventListener('click', () => {
    if (scale < MAX_SCALE) {
      scale = Math.min(MAX_SCALE, scale + SCALE_STEP);
      applyTransform();
      updateZoomLevel();
    }
  });
  
  zoomOutBtn?.addEventListener('click', () => {
    if (scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
      applyTransform();
      updateZoomLevel();
    }
  });
  
  // 下载功能
  downloadBtn?.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = lightboxImg.src;
    link.download = decodeURIComponent(lightboxImg.src.split('/').pop());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
  
  // 拖拽控制
  lightboxImg?.addEventListener('mousedown', e => {
    if (e.button !== 0) return; // 只处理左键
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    lightboxImg.setAttribute('data-dragging', 'true');
    lightboxImg.style.cursor = 'grabbing';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    applyTransform();
  });
  
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    lightboxImg?.removeAttribute('data-dragging');
    lightboxImg.style.cursor = 'grab';
  });
  
  // 滚轮缩放（比例感知）
  lightboxImg?.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    
    // 智能缩放：基于图片比例
    if (lightboxImg.naturalWidth && lightboxImg.naturalHeight) {
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
    } else {
      scale = newScale;
    }
    
    applyTransform();
    updateZoomLevel();
  }, { passive: false });
  
  // 触摸设备支持
  let touchStart = { x: 0, y: 0 };
  let isTouchDragging = false;
  
  lightboxImg?.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touchStart = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      };
      isTouchDragging = true;
    }
  });
  
  document.addEventListener('touchmove', e => {
    if (!isTouchDragging || e.touches.length !== 1) return;
    
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;
    
    translateX += deltaX;
    translateY += deltaY;
    
    touchStart = { 
      x: e.touches[0].clientX, 
      y: e.touches[0].clientY 
    };
    
    applyTransform();
    e.preventDefault();
  }, { passive: false });
  
  document.addEventListener('touchend', () => {
    isTouchDragging = false;
  });
}

// 观隅反三
// 君命无二
// 凭城借一
