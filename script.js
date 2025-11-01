// 更新日志
// [10.31.2025]每张图片保持原始宽高比（无变形）
// [10.31.2025]完美支持横图、竖图、方图
// [10.31.2025]仿Win11 风格设计
// [11.2.2025]专为 Netlify 部署优化（不依赖 GitHub Action）
// [11.2.2025]触摸优化（未实验的功能）

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
 * 获取基础路径（Netlify 兼容版）
 * Netlify 部署时，基础路径通常为根路径
 */
function getBasePath() {
  return '/';
}

/**
 * 加载图片列表（Netlify 优化版）
 */
function loadImages(forceRefresh = false) {
  const galleryContainer = document.querySelector('.gallery-container');
  
  // 1. 获取正确的基础路径
  const basePath = getBasePath();
  const imageListPath = `${basePath}images.json${forceRefresh ? `?t=${Date.now()}` : ''}`;
  
  // 2. 显示加载状态
  galleryContainer.innerHTML = `
    <div class="gallery-loading">
      <div class="loading-spinner"></div>
      <p>正在加载图片列表...</p>
      <div class="debug-info" style="font-size: 0.85rem; color: #666; margin-top: 10px;">
        请求路径: ${imageListPath}
      </div>
    </div>
  `;
  
  // 3. 添加调试日志
  console.log('[23班照片墙] 开始加载图片');
  console.log('[23班照片墙] 当前 URL:', window.location.href);
  console.log('[23班照片墙] 基础路径:', basePath);
  console.log('[23班照片墙] 请求 images.json:', imageListPath);
  
  fetch(imageListPath)
    .then(response => {
      console.log('[23班照片墙] images.json 响应状态:', response.status);
      
      if (response.status === 404) {
        throw new Error('❌ images.json 文件不存在，请检查：<br>' + 
          '1. 确保已正确配置 Netlify 构建流程<br>' +
          '2. 确认 images/ 目录中有图片文件<br>' +
          '3. 重新部署站点以生成 images.json');
      }
      
      if (!response.ok) {
        throw new Error(`❌ 无法加载图片列表 (HTTP ${response.status})`);
      }
      
      return response.text().then(text => {
        console.log('[23班照片墙] images.json 响应内容:', text.substring(0, 200) + '...');
        
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error('❌ images.json 格式错误，请检查构建日志：<br>' + 
            `错误: ${e.message}<br>` +
            '请确保生成的是有效的 JSON 数组');
        }
      });
    })
    .then(imagePaths => {
      // 4. 验证数据结构
      if (!Array.isArray(imagePaths)) {
        throw new Error('❌ 图片列表格式错误，应为数组');
      }
      
      // 5. 过滤有效图片路径
      const validImages = imagePaths
        .filter(path => path && typeof path === 'string')
        .map(path => {
          // 确保路径正确
          path = path.trim();
          
          // 如果不是绝对路径，添加 basePath
          if (!path.startsWith('/')) {
            path = `${basePath}${path}`;
          }
          
          // 处理重复斜杠
          path = path.replace(/\/+/g, '/');
          
          return path;
        })
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
              <li>基础路径: ${getBasePath()}</li>
              <li>仓库名: ${window.location.pathname.split('/')[1] || '根仓库'}</li>
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
            <button id="debug-btn" style="
              background: #f0f0f0;
              color: #333;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.95rem;
            ">查看调试信息</button>
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
      
      // 添加调试信息按钮
      document.getElementById('debug-btn')?.addEventListener('click', () => {
        alert(
          '=== 23班照片墙 调试信息 ===\n\n' +
          `当前 URL: ${window.location.href}\n` +
          `基础路径: ${getBasePath()}\n` +
          `仓库名: ${window.location.pathname.split('/')[1] || '根仓库'}\n` +
          `浏览器: ${navigator.userAgent}\n\n` +
          '如果问题持续存在，请联系管理员并提供此信息'
        );
      });
    });
}

/**
 * 创建单个图片项（自适应尺寸版）
 */
function createGalleryItem(container, src) {
  const filename = src.split('/').pop();
  const title = filename.replace(/\.[^/.]+$/, "");
  
  // 创建图片项
  const card = document.createElement('div');
  card.className = 'gallery-item';
  
  // ===== 新增：图片容器（关键修复） =====
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  // 初始设置为1:1，将在图片加载后更新
  imageContainer.dataset.aspectRatio = '1';
  
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
  };
  
  // ===== 新增：动态计算宽高比 =====
  img.onload = () => {
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    imageContainer.dataset.aspectRatio = aspectRatio.toFixed(4);
    
    // 更新容器样式
    imageContainer.style.aspectRatio = aspectRatio;
    imageContainer.style.paddingTop = `calc(100% / ${aspectRatio})`;
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
    // 仅当点击的是卡片本身（而非子元素）时忽略
    if (e.target === card) {
      return;
    }
    
    // 确保 lightbox 函数可用
    if (typeof window.openLightbox === 'function') {
      window.openLightbox(src, title);
    } else {
      console.error('lightbox 函数未定义');
      alert('图片查看器未正确初始化，请刷新页面');
    }
  });
  
  // 为图片和标题单独添加点击事件（更可靠的方案）
  img.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof window.openLightbox === 'function') {
      window.openLightbox(src, title);
    }
  });
  
  titleEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (typeof window.openLightbox === 'function') {
      window.openLightbox(src, title);
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
