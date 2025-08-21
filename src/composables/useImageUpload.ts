import { ref } from 'vue'
import { usePicCutStore } from '@/stores'

export function useImageUpload() {
  const store = usePicCutStore()
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)

  // 支持的文件类型
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  
  // 最大文件大小 (10MB)
  const maxFileSize = 10 * 1024 * 1024

  /**
   * 验证文件
   */
  const validateFile = (file: File): string | null => {
    if (!supportedTypes.includes(file.type)) {
      return '不支持的文件格式，请选择 JPG、PNG、GIF 或 WebP 格式的图片'
    }
    
    if (file.size > maxFileSize) {
      return '文件大小不能超过 10MB'
    }
    
    return null
  }

  /**
   * 创建图片预览URL
   */
  const createImageUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const result = e.target?.result as string
        resolve(result)
      }
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  /**
   * 获取图片尺寸
   */
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        })
      }
      
      img.onerror = () => {
        reject(new Error('加载图片失败'))
      }
      
      img.src = url
    })
  }

  /**
   * 动态获取容器尺寸
   */
  const getContainerSize = (): number => {
    const previewContainer = document.querySelector('.preview-container') as HTMLElement
    if (!previewContainer) return 400 // 默认值
    const rect = previewContainer.getBoundingClientRect()
    return Math.min(rect.width, rect.height)
  }

  /**
   * 处理文件上传
   */
  const handleFileUpload = async (file: File) => {
    try {
      isUploading.value = true
      uploadError.value = null

      // 验证文件
      const validationError = validateFile(file)
      if (validationError) {
        uploadError.value = validationError
        return false
      }

      // 创建预览URL
      const url = await createImageUrl(file)
      
      // 获取图片尺寸
      const dimensions = await getImageDimensions(url)
      
      // 更新store
      store.setImage({
        file,
        url,
        width: dimensions.width,
        height: dimensions.height
      })
      
      // 等待DOM更新后再获取容器尺寸
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 动态获取容器尺寸
      const containerSize = getContainerSize()
      const minCropSize = 50 // 最小裁剪框尺寸
      
      // 计算合适的裁剪框尺寸，确保不会太小
      let cropBoxSize = Math.floor(containerSize * 0.6)
      cropBoxSize = Math.max(cropBoxSize, minCropSize) // 确保不小于最小值
      cropBoxSize = Math.min(cropBoxSize, containerSize - 20) // 确保不超出容器
      
      const offset = Math.floor((containerSize - cropBoxSize) / 2)
      
      console.log(`📏 图片上传后调整裁剪框: 容器=${containerSize}, 裁剪框=${cropBoxSize}, 偏移=${offset}`)
      
      store.updateCropBox({
        x: offset,
        y: offset,
        width: cropBoxSize,
        height: cropBoxSize
      })
      
      return true
    } catch (error) {
      console.error('上传文件失败:', error)
      uploadError.value = error instanceof Error ? error.message : '上传失败'
      return false
    } finally {
      isUploading.value = false
    }
  }

  /**
   * 处理文件选择
   */
  const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (file) {
      handleFileUpload(file)
    }
    
    // 清空input值，允许重复选择同一文件
    target.value = ''
  }

  /**
   * 处理拖拽上传
   */
  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    
    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  /**
   * 清除图片
   */
  const clearImage = () => {
    store.setImage({
      file: null,
      url: null,
      width: 0,
      height: 0
    })
    store.setCroppedImages([])
    uploadError.value = null
  }

  return {
    isUploading,
    uploadError,
    handleFileSelect,
    handleFileUpload,
    handleDrop,
    handleDragOver,
    clearImage
  }
}