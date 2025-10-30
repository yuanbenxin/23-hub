// 修改版图片加载逻辑
// 不限定文件名、格式，自动适应不同尺寸的图片

document.addEventListener('DOMContentLoaded', () => {
  const galleryContainer = document.querySelector('.gallery-container');
  const imageDir = 'images';
  let scanAttempts = 0;
  const MAX_SCAN_ATTEMPTS = 3;
  
  // 清空容器并显示加载状态
  galleryContainer.innerHTML = `
    <div class="gallery-loading">
      <div class="loading-spinner"></div>
      <p>正在扫描图片目录...</p>
    </div>
  `;
  
  /**
   * 尝试扫描图片目录
   * 使用多重策略确保成功率
   */
  function scanImageDirectory() {
    scanAttempts++;
    
    // 策略1：尝试使用 GitHub 目录列表 API
    fetchDirectoryList()
      .then(processDirectoryData)
      .catch(error => {
        console.log(`[扫描尝试 ${scanAttempts}] 目录列表 API 失败:`, error);
        
        // 策略2：尝试直接获取目录索引
        if (scanAttempts <= MAX_SCAN_ATTEMPTS) {
          setTimeout(fetchDirectoryIndex, 1000 * scanAttempts);
        } else {
          showDetailedError(error);
        }
      });
  }
  
  /**
   * 策略1：使用 GitHub 目录列表 API
   */
  function fetchDirectoryList() {
    return fetch(`${imageDir}/?json=1`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        return response.json();
      });
  }
  
  /**
   * 策略2：尝试直接获取目录索引
   */
  function fetchDirectoryIndex() {
    return fetch(`${imageDir}/index.json`)
      .then(response => {
        if (response.ok) {
          // index.json 存在，尝试获取目录列表
          return fetchDirectoryList();
        } else {
          // 创建诊断信息
          return fetch(imageDir)
            .then(response => {
              if (response.ok) {
                throw new Error('目录存在但无法获取列表 - 可能是权限问题');
              } else {
                throw new Error(`目录不存在 (HTTP ${response.status})`);
              }
            })
            .catch(() => {
              throw new Error('images 目录不存在或名称错误');
            });
        }
      });
  }
  
  /**
   * 处理目录数据并显示图片
   */
  function processDirectoryData(data) {
    // 清空加载提示
    galleryContainer.innerHTML = '';
    
    // 从数据中提取文件列表
    const files = data.files || [];
    
    // 过滤出所有图片文件（支持各种格式）
    const imageFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return /\.(jpe?g|png|webp|gif|bmp|svg|tiff?|heic|avif)$/i.test(name);
    });
    
    // 没有找到图片
    if (imageFiles.length === 0) {
      showNoImagesMessage();
      return;
    }
    
    // 显示找到的图片数量
    const infoBar = document.createElement('div');
    infoBar.className = 'scan-info';
    infoBar.style = `
      text-align: center;
      color: var(--win11-text-secondary);
      margin-bottom: 24px;
      font-size: 0.95rem;
      padding: 12px;
      background: rgba(240, 245, 255, 0.4);
      border-radius: 10px;
      max-width: 800px;
      margin: 0 auto 24px;
    `;
    infoBar.innerHTML = `
      <strong>✓ 找到 ${imageFiles.length} 张图片</strong>
      <div style="font-size: 0.85rem; margin-top: 6px;">
        支持格式: JPG, PNG, WebP, GIF 等
      </div>
    `;
    galleryContainer.parentNode.insertBefore(infoBar, galleryContainer);
    
    // 生成图片项
    imageFiles.forEach(file => {
      const src = `${imageDir}/${encodeURIComponent(file.name)}`;
      const title = decodeURIComponent(file.name).replace(/\.[^/.]+$/, "");
      
      // 创建图片项
      const card = createGalleryItem(src, title);
      galleryContainer.appendChild(card);
    });
    
    // 初始化 Lightbox
    initLightboxSystem();
  }
  
  /**
   * 创建单个图片项
   */
  function createGalleryItem(src, title) {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = title;
    img.loading = 'lazy';
    img.decoding = 'async';
    
    // 添加加载错误处理
    img.onerror = () => {
      console.error(`图片加载失败: ${src}`);
      card.style.opacity = '0.5';
      card.title = '图片加载失败';
    };
    
    const titleEl = document.createElement('div');
    titleEl.className = 'gallery-title';
    titleEl.textContent = title;
    
    card.appendChild(img);
    card.appendChild(titleEl);
    card.dataset.src = src;
    card.dataset.title = title;
    card.addEventListener('click', () => openLightbox(src, title));
    
    return card;
  }
  
  /**
   * 显示没有图片的消息
   */
  function showNoImagesMessage() {
    galleryContainer.innerHTML = `
      <div class="gallery-loading" style="
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px 20px;
        background: rgba(255, 240, 240, 0.3);
        border-radius: 12px;
        max-width: 800px;
        margin: 0 auto;
      ">
        <h3 style="margin-bottom: 15px; color: #e74c3c;">⚠️ 未找到图片</h3>
        <p style="line-height: 1.6; margin-bottom: 20px;">
          <strong>可能的原因：</strong>
        </p>
        <ol style="text-align: left; max-width: 600px; margin: 0 auto 20px; line-height: 1.8;">
          <li>图片不在 <code style="background: #f0f0f0; padding: 2px 5px; border-radius: 4px;">/images/</code> 目录</li>
          <li>目录名称错误（必须是全小写的 <strong>images</strong>）</li>
          <li>图片格式不受支持（请使用 JPG/PNG/WebP/GIF 等）</li>
          <li>文件权限问题（确保图片是公开可访问的）</li>
        </ol>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 20px;">
          <button onclick="location.reload()" style="
            background: var(--win11-accent);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95rem;
          ">重试扫描</button>
          <a href="https://docs.github.com/pages" target="_blank" style="
            color: var(--win11-accent);
            text-decoration: underline;
            font-size: 0.95rem;
          ">GitHub Pages 文档</a>
        </div>
      </div>
    `;
  }
  
  /**
   * 显示详细错误信息
   */
  function showDetailedError(error) {
    const errorMessage = error.message || String(error);
    const repoName = window.location.pathname.split('/')[1];
    
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
          <strong>错误详情:</strong><br>
          <span style="color: #c0392b; font-family: monospace;">${errorMessage}</span>
        </p>
        <p style="margin-bottom: 25px;">
          <strong>请按以下步骤操作：</strong>
        </p>
        <ol style="text-align: left; max-width: 600px; margin: 0 auto 25px; line-height: 1.8;">
          <li>确认存在 <code style="background: #f0f0f0; padding: 2px 5px; border-radius: 4px;">/images/index.json</code> 文件（内容为空）</li>
          <li>图片文件必须在 <code style="background: #f0f0f0; padding: 2px 5px; border-radius: 4px;">/images/</code> 目录（全小写）</li>
          <li>图片扩展名必须是 .jpg/.jpeg/.png/.webp/.gif 等</li>
          <li>Settings → Pages → Source 设置为 <strong>main 分支 + / (root)</strong></li>
          <li>推送到 GitHub 后等待 1-2 分钟（GitHub Pages 有缓存）</li>
        </ol>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 15px;">
          <button onclick="location.reload()" style="
            background: var(--win11-accent);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.95rem;
          ">重试加载</button>
          <a href="https://${repoName}.github.io/${repoName}/?t=${Date.now()}" style="
            background: #f0f0f0;
            color: #333;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 0.95rem;
          ">强制刷新缓存</a>
          <a href="https://github.com/${repoName}/${repoName}/issues" target="_blank" style="
            color: var(--win11-accent);
            text-decoration: underline;
            font-size: 0.95rem;
            margin-top: 10px;
            width: 100%;
          ">需要帮助？提交 Issue</a>
        </div>
      </div>
    `;
  }
  
  /**
   * 初始化 Lightbox 系统
   */
  function initLightboxSystem() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const zoomLevel = document.getElementById('zoom-level');
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
    
    // 打开lightbox
    window.openLightbox = function(src, title) {
      lightboxImg.src = src;
      lightboxTitle.textContent = title || '无标题';
      
      // 等待图片加载完成
      lightboxImg.onload = () => {
        resetView();
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
      };
      
      // 错误处理
      lightboxImg.onerror = () => {
        alert(`无法加载图片: ${src}\n请检查图片路径是否正确`);
      };
    };
    
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
    closeBtn.addEventListener('click', closeLightbox);
    resetBtn.addEventListener('click', resetView);
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) closeLightbox();
    });
    
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lightbox.classList.contains('show')) {
        closeLightbox();
      }
    });
    
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
      link.download = decodeURIComponent(lightboxImg.src.split('/').pop());
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
  }
  
  /**
   * 创建必要的辅助文件（如果不存在）
   */
  function createHelperFiles() {
    // 尝试创建 index.json（如果不存在）
    fetch(`${imageDir}/index.json`)
      .catch(() => {
        // 不需要实际创建，只需触发目录列表
        console.log('index.json 不存在，但这是正常的');
      });
  }
  
  // 启动扫描流程
  createHelperFiles();
  scanImageDirectory();
  
  // 添加重试按钮事件
  window.retryScan = function() {
    galleryContainer.innerHTML = `
      <div class="gallery-loading">
        <div class="loading-spinner"></div>
        <p>正在重新扫描...</p>
      </div>
    `;
    scanAttempts = 0;
    scanImageDirectory();
  };
});

// 观隅反三
// 君命无二
// 凭城借一
