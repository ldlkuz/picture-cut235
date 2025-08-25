import { ref, computed } from 'vue'
import { usePicCutStore, type CropBox } from '@/stores'

export function useCropBoxDesktop() {
  const store = usePicCutStore()
  const isDragging = ref(false)
  const isResizing = ref(false)
  const dragStartPos = ref({ x: 0, y: 0 })
  const resizeHandle = ref<string>('')
  const initialCropBox = ref<CropBox>({ x: 0, y: 0, width: 0, height: 0 })
  const cropBoxElement = ref<HTMLElement | null>(null)
  
  // 动态获取容器尺寸
  const getContainerSize = (): number => {
    const previewContainer = document.querySelector('.preview-container-desktop') as HTMLElement
    if (!previewContainer) return 400 // 默认值
    const rect = previewContainer.getBoundingClientRect()
    return Math.min(rect.width, rect.height)
  }
  
  // 最小裁剪框尺寸
  const minSize = 50

  /**
   * 限制裁剪框在容器内
   */
  const constrainCropBox = (cropBox: CropBox): CropBox => {
    const containerSize = getContainerSize()
    
    // 首先确保尺寸不超过容器大小
    let constrainedWidth = Math.max(minSize, Math.min(containerSize, cropBox.width))
    let constrainedHeight = Math.max(minSize, Math.min(containerSize, cropBox.height))
    
    // 然后计算有效的最大位置
    const maxX = Math.max(0, containerSize - constrainedWidth)
    const maxY = Math.max(0, containerSize - constrainedHeight)
    
    // 限制位置在有效范围内
    let constrainedX = Math.max(0, Math.min(maxX, cropBox.x))
    let constrainedY = Math.max(0, Math.min(maxY, cropBox.y))
    
    const result = {
      x: constrainedX,
      y: constrainedY,
      width: constrainedWidth,
      height: constrainedHeight
    }
    
    return result
  }

  /**
   * 开始拖拽
   */
  const startDrag = (event: MouseEvent | TouchEvent) => {
    // 检查是否点击的是手柄元素，如果是则不执行拖拽逻辑
    const target = event.target as HTMLElement
    if (
      target &&
      (target.classList.contains('crop-handle') ||
       target.classList.contains('crop-handle-desktop') ||
       target.classList.contains('crop-handle-mobile'))
    ) {
      return
    }
    
    // 检查并修复异常的裁剪框状态
    if (store.cropBox.width <= 0 || store.cropBox.height <= 0) {
      // 重置到合理的默认状态
      const containerSize = getContainerSize()
      const defaultSize = Math.max(minSize, Math.floor(containerSize * 0.3))
      const defaultOffset = Math.max(0, Math.floor((containerSize - defaultSize) / 2))
      
      const resetBox = {
        x: defaultOffset,
        y: defaultOffset,
        width: defaultSize,
        height: defaultSize
      }
      
      store.updateCropBox(resetBox)
      return // 重置后不继续拖拽操作
    }
    
    event.preventDefault()
    isDragging.value = true
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    // 获取预览容器的边界矩形
    const previewContainer = document.querySelector('.preview-container-desktop')
    if (previewContainer) {
      const rect = previewContainer.getBoundingClientRect()
      dragStartPos.value = {
        x: clientX - rect.left - store.cropBox.x,
        y: clientY - rect.top - store.cropBox.y
      }
    } else {
      dragStartPos.value = {
        x: clientX - store.cropBox.x,
        y: clientY - store.cropBox.y
      }
    }
    
    // 添加拖拽样式
    if (cropBoxElement.value) {
      cropBoxElement.value.classList.add('dragging')
    }
    
    // 添加全局事件监听
    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchmove', handleDrag, { passive: false })
    document.addEventListener('touchend', stopDrag, { passive: false })
  }

  /**
   * 处理拖拽
   */
  const handleDrag = (event: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return
    
    event.preventDefault()
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    // 获取预览容器的边界矩形
    const previewContainer = document.querySelector('.preview-container-desktop')
    if (previewContainer) {
      const rect = previewContainer.getBoundingClientRect()
      const newCropBox = {
        ...store.cropBox,
        x: clientX - rect.left - dragStartPos.value.x,
        y: clientY - rect.top - dragStartPos.value.y
      }
      
      // 使用requestAnimationFrame优化性能
      requestAnimationFrame(() => {
        const constrainedBox = constrainCropBox(newCropBox)
        store.updateCropBox(constrainedBox)
      })
    }
  }

  /**
   * 停止拖拽
   */
  const stopDrag = () => {
    isDragging.value = false
    
    // 移除拖拽样式
    if (cropBoxElement.value) {
      cropBoxElement.value.classList.remove('dragging')
    }
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleDrag)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('touchmove', handleDrag)
    document.removeEventListener('touchend', stopDrag)
  }

  /**
   * 开始调整大小
   */
  const startResize = (event: MouseEvent | TouchEvent, handle: string) => {
    event.preventDefault()
    event.stopPropagation()
    
    // 检查并修复异常的裁剪框状态
    if (store.cropBox.width <= 0 || store.cropBox.height <= 0) {
      // 重置到合理的默认状态
      const containerSize = getContainerSize()
      const defaultSize = Math.max(minSize, Math.floor(containerSize * 0.3))
      const defaultOffset = Math.max(0, Math.floor((containerSize - defaultSize) / 2))
      
      const resetBox = {
        x: defaultOffset,
        y: defaultOffset,
        width: defaultSize,
        height: defaultSize
      }
      
      store.updateCropBox(resetBox)
    }
    
    isResizing.value = true
    resizeHandle.value = handle
    initialCropBox.value = { ...store.cropBox }
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    // 获取预览容器的边界矩形
    const previewContainer = document.querySelector('.preview-container-desktop')
    if (previewContainer) {
      const rect = previewContainer.getBoundingClientRect()
      dragStartPos.value = { 
        x: clientX - rect.left, 
        y: clientY - rect.top 
      }
    } else {
      dragStartPos.value = { x: clientX, y: clientY }
    }
    
    // 添加调整大小样式
    if (cropBoxElement.value) {
      cropBoxElement.value.classList.add('resizing')
    }
    
    // 添加全局事件监听
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', stopResize)
    document.addEventListener('touchmove', handleResize, { passive: false })
    document.addEventListener('touchend', stopResize, { passive: false })
  }

  /**
   * 处理调整大小
   */
  const handleResize = (event: MouseEvent | TouchEvent) => {
    if (!isResizing.value) return
    
    event.preventDefault()
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
    
    // 获取预览容器的边界矩形
    const previewContainer = document.querySelector('.preview-container-desktop')
    let deltaX, deltaY
    
    if (previewContainer) {
      const rect = previewContainer.getBoundingClientRect()
      deltaX = (clientX - rect.left) - dragStartPos.value.x
      deltaY = (clientY - rect.top) - dragStartPos.value.y
    } else {
      deltaX = clientX - dragStartPos.value.x
      deltaY = clientY - dragStartPos.value.y
    }
    
    let newCropBox = { ...initialCropBox.value }
    
    switch (resizeHandle.value) {
      case 'nw': // 左上角
        newCropBox.x += deltaX
        newCropBox.y += deltaY
        newCropBox.width -= deltaX
        newCropBox.height -= deltaY
        break
      case 'ne': // 右上角
        newCropBox.y += deltaY
        newCropBox.width += deltaX
        newCropBox.height -= deltaY
        break
      case 'sw': // 左下角
        newCropBox.x += deltaX
        newCropBox.width -= deltaX
        newCropBox.height += deltaY
        break
      case 'se': // 右下角
        newCropBox.width += deltaX
        newCropBox.height += deltaY
        break
    }
    
    // 简化的最小尺寸约束，避免位置跳跃
    if (newCropBox.width < minSize) {
      newCropBox.width = minSize
    }
    
    if (newCropBox.height < minSize) {
      newCropBox.height = minSize
    }
    
    // 使用requestAnimationFrame优化性能
    requestAnimationFrame(() => {
      const constrainedBox = constrainCropBox(newCropBox)
      store.updateCropBox(constrainedBox)
    })
  }

  /**
   * 停止调整大小
   */
  const stopResize = () => {
    isResizing.value = false
    resizeHandle.value = ''
    
    // 移除调整大小样式
    if (cropBoxElement.value) {
      cropBoxElement.value.classList.remove('resizing')
    }
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', stopResize)
    document.removeEventListener('touchmove', handleResize)
    document.removeEventListener('touchend', stopResize)
  }

  /**
   * 重置裁剪框到中心位置
   */
  const resetCropBox = () => {
    const containerSize = getContainerSize()
    const size = Math.floor(containerSize * 0.6)
    const offset = Math.floor((containerSize - size) / 2)
    
    store.updateCropBox({
      x: offset,
      y: offset,
      width: size,
      height: size
    })
  }

  /**
   * 根据图片尺寸调整裁剪框
   */
  const adjustCropBoxToImage = () => {
    if (!store.hasImage) return
    
    const containerSize = getContainerSize()
    const imageAspectRatio = store.image.width / store.image.height
    const containerAspectRatio = 1 // 正方形容器
    
    let imageDisplayWidth, imageDisplayHeight, offsetX, offsetY
    
    if (imageAspectRatio > containerAspectRatio) {
      // 图片更宽，以容器宽度为准
      imageDisplayWidth = containerSize
      imageDisplayHeight = containerSize / imageAspectRatio
      offsetX = 0
      offsetY = (containerSize - imageDisplayHeight) / 2
    } else {
      // 图片更高，以容器高度为准
      imageDisplayHeight = containerSize
      imageDisplayWidth = containerSize * imageAspectRatio
      offsetX = (containerSize - imageDisplayWidth) / 2
      offsetY = 0
    }
    
    // 设置裁剪框紧贴图片边缘，留出2px边距确保可见性
    const margin = 2
    const cropX = Math.max(0, offsetX + margin)
    const cropY = Math.max(0, offsetY + margin)
    const cropWidth = Math.max(minSize, imageDisplayWidth - margin * 2)
    const cropHeight = Math.max(minSize, imageDisplayHeight - margin * 2)
    
    store.updateCropBox({ 
      x: cropX, 
      y: cropY, 
      width: cropWidth, 
      height: cropHeight 
    })
  }

  // 计算属性
  const cropBoxStyle = computed(() => ({
    left: store.cropBox.x + 'px',
    top: store.cropBox.y + 'px',
    width: store.cropBox.width + 'px',
    height: store.cropBox.height + 'px'
  }))

  const isActive = computed(() => isDragging.value || isResizing.value)

  return {
    isDragging,
    isResizing,
    isActive,
    cropBoxStyle,
    cropBoxElement,
    startDrag,
    startResize,
    resetCropBox,
    adjustCropBoxToImage,
    constrainCropBox,
    getContainerSize
  }
}