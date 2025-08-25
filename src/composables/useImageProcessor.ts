import { ref } from 'vue'
import { usePicCutStore, type FilterConfig, type GridConfig, type Parameters, type CropBox } from '@/stores'
import JSZip from 'jszip'

export function useImageProcessor() {
  const store = usePicCutStore()
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const processingStatus = ref('')
  const processingType = ref<'upload' | 'processing' | 'compression' | 'download' | 'error'>('processing')
  const processingDetails = ref('')

  /**
   * 创建Canvas元素
   */
  const createCanvas = (width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  /**
   * 加载图片到Canvas
   */
  const loadImageToCanvas = (imageUrl: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'))
          return
        }
        
        ctx.drawImage(img, 0, 0)
        resolve(canvas)
      }
      
      img.onerror = () => {
        reject(new Error('加载图片失败'))
      }
      
      img.src = imageUrl
    })
  }

  /**
   * 应用滤镜效果
   */
  const applyFilter = (canvas: HTMLCanvasElement, filter: FilterConfig): HTMLCanvasElement => {
    if (filter.name === 'none') return canvas
    
    const filteredCanvas = createCanvas(canvas.width, canvas.height)
    const ctx = filteredCanvas.getContext('2d')
    
    if (!ctx) throw new Error('无法获取Canvas上下文')
    
    // 应用CSS滤镜
    ctx.filter = filter.cssFilter
    ctx.drawImage(canvas, 0, 0)
    
    return filteredCanvas
  }

  /**
   * 获取图片在预览容器中的实际显示信息
   */
  const getImageDisplayInfo = () => {
    // 检测设备类型，选择正确的容器选择器
    const isDesktop = window.innerWidth >= 1024
    const containerSelector = isDesktop ? '.preview-container-desktop' : '.preview-container-mobile'
    
    const previewContainer = document.querySelector(containerSelector) as HTMLElement
    let containerSize = 500 // 默认容器尺寸
    
    if (previewContainer) {
      const containerRect = previewContainer.getBoundingClientRect()
      containerSize = Math.min(containerRect.width, containerRect.height)
    } else {
      console.warn(`⚠️ getImageDisplayInfo - 未找到容器: ${containerSelector}，使用默认尺寸`)
    }
    
    // 计算图片在容器中的实际显示尺寸和位置
    const imageAspectRatio = store.image.width / store.image.height
    const containerAspectRatio = 1 // 正方形容器
    
    let displayWidth, displayHeight, offsetX, offsetY
    
    if (imageAspectRatio > containerAspectRatio) {
      // 图片更宽，以容器宽度为准
      displayWidth = containerSize
      displayHeight = containerSize / imageAspectRatio
      offsetX = 0
      offsetY = (containerSize - displayHeight) / 2
    } else {
      // 图片更高，以容器高度为准
      displayHeight = containerSize
      displayWidth = containerSize * imageAspectRatio
      offsetX = (containerSize - displayWidth) / 2
      offsetY = 0
    }
    
    const result = {
      containerSize,
      displayWidth,
      displayHeight,
      offsetX,
      offsetY,
      scaleX: store.image.width / displayWidth,
      scaleY: store.image.height / displayHeight
    }
    
    console.log('📏 getImageDisplayInfo - 图片显示信息:', {
      设备类型: isDesktop ? '桌面端' : '移动端',
      容器选择器: containerSelector,
      原图尺寸: { width: store.image.width, height: store.image.height },
      容器尺寸: containerSize,
      显示尺寸: { width: displayWidth, height: displayHeight },
      偏移量: { x: offsetX, y: offsetY },
      缩放比例: { x: result.scaleX, y: result.scaleY }
    })
    
    return result
  }

  /**
   * 自由裁剪图片
   */
  const cropImageFree = async (cropBox: CropBox): Promise<string> => {
    if (!store.image.url) throw new Error('没有图片可以裁剪')
    
    try {
      isProcessing.value = true
      processingType.value = 'processing'
      processingStatus.value = '正在加载图片...'
      processingProgress.value = 10
      
      const sourceCanvas = await loadImageToCanvas(store.image.url)
      
      processingStatus.value = '正在应用滤镜...'
      processingProgress.value = 30
      
      const filteredCanvas = applyFilter(sourceCanvas, store.currentFilterConfig)
      
      processingStatus.value = '正在计算裁剪区域...'
      processingProgress.value = 50
    
    // 获取图片在预览容器中的实际显示信息
    const displayInfo = getImageDisplayInfo()
    
    // 将裁剪框坐标从容器坐标系转换为图片坐标系
    const relativeX = cropBox.x - displayInfo.offsetX
    const relativeY = cropBox.y - displayInfo.offsetY
    
    // 确保裁剪框在图片显示区域内
    const clampedX = Math.max(0, Math.min(relativeX, displayInfo.displayWidth - cropBox.width))
    const clampedY = Math.max(0, Math.min(relativeY, displayInfo.displayHeight - cropBox.height))
    const clampedWidth = Math.max(0, Math.min(cropBox.width, displayInfo.displayWidth - clampedX))
    const clampedHeight = Math.max(0, Math.min(cropBox.height, displayInfo.displayHeight - clampedY))
    
    // 转换为原图坐标
    const actualCropBox = {
      x: Math.floor(clampedX * displayInfo.scaleX),
      y: Math.floor(clampedY * displayInfo.scaleY),
      width: Math.floor(clampedWidth * displayInfo.scaleX),
      height: Math.floor(clampedHeight * displayInfo.scaleY)
    }
    
    console.log('✂️ cropImageFree - 坐标转换详情:', {
      裁剪框坐标: { x: cropBox.x, y: cropBox.y, width: cropBox.width, height: cropBox.height },
      相对图片坐标: { x: relativeX, y: relativeY },
      限制后坐标: { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight },
      原图坐标: actualCropBox,
      裁剪区域百分比: {
        x: (actualCropBox.x / store.image.width * 100).toFixed(1) + '%',
        y: (actualCropBox.y / store.image.height * 100).toFixed(1) + '%',
        width: (actualCropBox.width / store.image.width * 100).toFixed(1) + '%',
        height: (actualCropBox.height / store.image.height * 100).toFixed(1) + '%'
      }
    })
    
      // 创建裁剪后的Canvas
      processingStatus.value = '正在裁剪图片...'
      processingProgress.value = 70
      
      const croppedCanvas = createCanvas(actualCropBox.width, actualCropBox.height)
      const ctx = croppedCanvas.getContext('2d')
      
      if (!ctx) throw new Error('无法获取Canvas上下文')
      
      ctx.drawImage(
        filteredCanvas,
        actualCropBox.x,
        actualCropBox.y,
        actualCropBox.width,
        actualCropBox.height,
        0,
        0,
        actualCropBox.width,
        actualCropBox.height
      )
      
      processingStatus.value = '正在生成图片...'
      processingProgress.value = 90
      
      const result = croppedCanvas.toDataURL('image/png', 0.9)
      
      processingProgress.value = 100
      processingStatus.value = '裁剪完成！'
      
      return result
    } finally {
      setTimeout(() => {
        isProcessing.value = false
        processingProgress.value = 0
        processingStatus.value = ''
        processingDetails.value = ''
      }, 1000)
    }
  }

  /**
   * 创建网格拼图（在裁剪区域内绘制网格线）
   */
  const createGridPuzzle = async (gridConfig: GridConfig, parameters: Parameters, cropBox?: CropBox): Promise<string> => {
    if (!store.image.url) throw new Error('没有图片可以裁剪')
    
    try {
      isProcessing.value = true
      processingType.value = 'processing'
      processingStatus.value = '正在准备网格拼图...'
      processingProgress.value = 5
      processingDetails.value = `生成 ${gridConfig.rows}x${gridConfig.cols} 网格`
      
      // 参数验证和处理
      console.log('🎯 createGridPuzzle - 函数开始执行')
    console.log('🎯 createGridPuzzle - 接收到的原始参数:', {
      borderWidth: parameters.borderWidth,
      borderColor: parameters.borderColor
    })
    
    // 参数有效性验证
    if (isNaN(Number(parameters.borderWidth))) {
      console.error('❌ createGridPuzzle - 参数类型错误，包含非数字值')
      throw new Error('createGridPuzzle: 参数包含无效的数字值')
    }
    
    // 确保参数为正确的数字类型
    const originalParams = {
      borderWidth: Number(parameters.borderWidth),
      borderColor: String(parameters.borderColor)
    }
    
    console.log('🎯 createGridPuzzle - 验证后的原始参数:', originalParams)
    
      processingStatus.value = '正在加载图片...'
      processingProgress.value = 15
      
      const sourceCanvas = await loadImageToCanvas(store.image.url)
      
      processingStatus.value = '正在应用滤镜...'
      processingProgress.value = 25
      
      const filteredCanvas = applyFilter(sourceCanvas, store.currentFilterConfig)
    
      // 获取图片在预览容器中的实际显示信息（用于缩放比例计算）
      processingStatus.value = '正在计算显示信息...'
      processingProgress.value = 35
      
      const displayInfo = getImageDisplayInfo()
    
      // 如果提供了裁剪框，先裁剪图片
      processingStatus.value = '正在处理裁剪区域...'
      processingProgress.value = 45
      
      let targetCanvas = filteredCanvas
      let scaleRatio = 1 // 默认缩放比例
      
      if (cropBox) {
      
      // 将裁剪框坐标从容器坐标系转换为图片坐标系
      const relativeX = cropBox.x - displayInfo.offsetX
      const relativeY = cropBox.y - displayInfo.offsetY
      
      // 确保裁剪框在图片显示区域内
      const clampedX = Math.max(0, Math.min(relativeX, displayInfo.displayWidth - cropBox.width))
      const clampedY = Math.max(0, Math.min(relativeY, displayInfo.displayHeight - cropBox.height))
      const clampedWidth = Math.max(0, Math.min(cropBox.width, displayInfo.displayWidth - clampedX))
      const clampedHeight = Math.max(0, Math.min(cropBox.height, displayInfo.displayHeight - clampedY))
      
      // 转换为原图坐标
      const actualCropBox = {
        x: Math.floor(clampedX * displayInfo.scaleX),
        y: Math.floor(clampedY * displayInfo.scaleY),
        width: Math.floor(clampedWidth * displayInfo.scaleX),
        height: Math.floor(clampedHeight * displayInfo.scaleY)
      }
      
      // 计算缩放比例：裁剪后的实际像素 / 预览显示像素
      scaleRatio = actualCropBox.width / cropBox.width
      
      console.log('🧩 createGridPuzzle - 裁剪坐标转换和缩放比例:', {
        裁剪框坐标: { x: cropBox.x, y: cropBox.y, width: cropBox.width, height: cropBox.height },
        相对图片坐标: { x: relativeX, y: relativeY },
        限制后坐标: { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight },
        原图坐标: actualCropBox,
        缩放比例: scaleRatio,
        计算说明: `实际像素(${actualCropBox.width}) / 预览像素(${cropBox.width}) = ${scaleRatio.toFixed(3)}`
      })
      
      // 创建裁剪后的Canvas
      const croppedCanvas = createCanvas(actualCropBox.width, actualCropBox.height)
      const cropCtx = croppedCanvas.getContext('2d')
      
      if (!cropCtx) throw new Error('无法获取Canvas上下文')
      
      cropCtx.drawImage(
        filteredCanvas,
        actualCropBox.x,
        actualCropBox.y,
        actualCropBox.width,
        actualCropBox.height,
        0,
        0,
        actualCropBox.width,
        actualCropBox.height
      )
      
      targetCanvas = croppedCanvas
    } else {
      // 没有裁剪框时，计算整个图片的缩放比例
      scaleRatio = store.image.width / displayInfo.displayWidth
    }
    
    // 根据缩放比例调整边框粗细参数
    const adjustedParams = {
      borderWidth: originalParams.borderWidth * scaleRatio,
      borderColor: originalParams.borderColor
    }
    
    console.log('🔧 createGridPuzzle - 缩放比例调整:', {
      缩放比例: scaleRatio,
      原始参数: originalParams,
      调整后参数: adjustedParams,
      调整说明: `borderWidth: ${originalParams.borderWidth} * ${scaleRatio.toFixed(3)} = ${adjustedParams.borderWidth.toFixed(1)}`
    })
    
      const { rows, cols } = gridConfig
      
      processingStatus.value = '正在创建网格画布...'
      processingProgress.value = 60
      
      // 创建带网格的Canvas
      const gridCanvas = createCanvas(targetCanvas.width, targetCanvas.height)
      const ctx = gridCanvas.getContext('2d')
      
      if (!ctx) throw new Error('无法获取Canvas上下文')
      
      // 绘制背景图片
      ctx.drawImage(targetCanvas, 0, 0)
      
      processingStatus.value = '正在绘制网格线...'
      processingProgress.value = 70
    
    // 新的网格计算逻辑：去掉外围边距，将整个图片平均分割
    // 计算每个网格单元的尺寸（整个图片平均分割）
    const cellWidth = targetCanvas.width / cols
    const cellHeight = targetCanvas.height / rows
    
    console.log('📐 新网格计算逻辑 - 无外围边距:', {
      targetCanvasSize: { width: targetCanvas.width, height: targetCanvas.height },
      gridConfig: { rows, cols },
      cellSize: { width: cellWidth, height: cellHeight }
    })
    
    // 使用调整后的边框粗细，确保与预览效果一致
    const lineWidth = adjustedParams.borderWidth
    
    // 调试日志：网格计算和样式设置
    console.log('📐 createGridPuzzle - 新网格计算:', {
      targetCanvasSize: { width: targetCanvas.width, height: targetCanvas.height },
      cellSize: { width: cellWidth, height: cellHeight },
      原始borderWidth: originalParams.borderWidth,
      调整后borderWidth: adjustedParams.borderWidth,
      lineWidth: lineWidth,
      borderColor: adjustedParams.borderColor,
      gridLines: {
        vertical: `将绘制 ${cols - 1} 条垂直线`,
        horizontal: `将绘制 ${rows - 1} 条水平线`
      }
    })
    
    // 设置网格线样式
    ctx.strokeStyle = adjustedParams.borderColor
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // 移除阴影效果，确保与预览效果一致
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
      // 绘制垂直网格线（居中膨胀效果）
      console.log('🖌️ createGridPuzzle - 开始绘制垂直网格线，共', cols - 1, '条（居中膨胀效果）')
      for (let i = 1; i < cols; i++) {
      const centerX = i * cellWidth
      const halfWidth = lineWidth / 2
      
      // 使用fillRect绘制矩形来实现居中膨胀效果
      ctx.fillStyle = adjustedParams.borderColor
      ctx.fillRect(
        centerX - halfWidth,  // 左边界：中心位置向左偏移半个线宽
        0,                    // 顶部
        lineWidth,            // 宽度：完整线宽
        targetCanvas.height   // 高度：整个画布高度
      )
      
      console.log(`🖌️ 垂直线 ${i}: centerX = ${centerX}, 绘制范围 ${centerX - halfWidth} 到 ${centerX + halfWidth}`)
    }
    
      processingStatus.value = '正在绘制水平网格线...'
      processingProgress.value = 85
      
      // 绘制水平网格线（居中膨胀效果）
      console.log('🖌️ createGridPuzzle - 开始绘制水平网格线，共', rows - 1, '条（居中膨胀效果）')
      for (let i = 1; i < rows; i++) {
      const centerY = i * cellHeight
      const halfWidth = lineWidth / 2
      
      // 使用fillRect绘制矩形来实现居中膨胀效果
      ctx.fillStyle = adjustedParams.borderColor
      ctx.fillRect(
        0,                   // 左边界
        centerY - halfWidth, // 顶部：中心位置向上偏移半个线宽
        targetCanvas.width,  // 宽度：整个画布宽度
        lineWidth            // 高度：完整线宽
      )
      
      console.log(`🖌️ 水平线 ${i}: centerY = ${centerY}, 绘制范围 ${centerY - halfWidth} 到 ${centerY + halfWidth}`)
    }
      
      processingStatus.value = '正在生成最终图片...'
      processingProgress.value = 95
      
      const result = gridCanvas.toDataURL('image/png', 0.9)
      
      processingProgress.value = 100
      processingStatus.value = '网格拼图生成完成！'
      
      return result
    } finally {
      setTimeout(() => {
        isProcessing.value = false
        processingProgress.value = 0
        processingStatus.value = ''
        processingDetails.value = ''
      }, 1500)
    }
  }

  /**
   * 创建完整拼图
   */
  const createCompletePuzzle = async (): Promise<string> => {
    if (!store.image.url) throw new Error('没有图片可以裁剪')
    
    // 参数验证和处理
    console.log('🔧 createCompletePuzzle - 函数开始执行')
    console.log('🔧 createCompletePuzzle - 当前参数:', {
      borderWidth: store.parameters.borderWidth,
      borderColor: store.parameters.borderColor
    })
    
    // 参数有效性验证
    const params = store.parameters
    if (isNaN(Number(params.borderWidth))) {
      console.error('❌ createCompletePuzzle - 参数类型错误，包含非数字值')
      throw new Error('参数包含无效的数字值')
    }
    
    // 确保参数为数字类型
    const validatedParams = {
      borderWidth: Number(params.borderWidth),
      borderColor: String(params.borderColor)
    }
    
    console.log('🔧 createCompletePuzzle - 验证后的参数:', validatedParams)
    
    // 在裁剪区域内创建带网格线的拼图
    return await createGridPuzzle(store.currentGridConfig, validatedParams, store.cropBox)
  }

  /**
   * 下载单个图片
   */
  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * 下载ZIP文件
   */
  const downloadZip = async (images: string[], filename: string) => {
    const zip = new JSZip()
    
    images.forEach((dataUrl, index) => {
      const base64Data = dataUrl.split(',')[1]
      zip.file(`image_${index + 1}.png`, base64Data, { base64: true })
    })
    
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    
    const link = document.createElement('a')
    link.download = filename
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  /**
   * 下载完整拼图
   */
  const downloadCompletePuzzle = async () => {
    try {
      isProcessing.value = true
      processingType.value = 'download'
      processingStatus.value = '正在生成网格拼图...'
      processingProgress.value = 20
      processingDetails.value = '准备下载文件'
      
      const dataUrl = await createCompletePuzzle()
      
      processingStatus.value = '正在准备下载...'
      processingProgress.value = 90
      
      // 直接下载到电脑
      downloadImage(dataUrl, 'grid-puzzle.png')
      
      processingProgress.value = 100
      processingStatus.value = '下载成功！'
      processingDetails.value = '文件已保存到下载文件夹'
      
    } catch (error) {
      console.error('下载网格拼图失败:', error)
      processingStatus.value = '下载失败'
      processingDetails.value = error instanceof Error ? error.message : '未知错误'
      throw error
    } finally {
      setTimeout(() => {
        isProcessing.value = false
        processingProgress.value = 0
        processingStatus.value = ''
        processingDetails.value = ''
      }, 2000)
    }
  }



  return {
    isProcessing,
    processingProgress,
    processingStatus,
    processingType,
    processingDetails,
    downloadCompletePuzzle,
    cropImageFree,
    createGridPuzzle,
    createCompletePuzzle
  }
}