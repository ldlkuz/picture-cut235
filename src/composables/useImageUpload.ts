import { ref } from 'vue'
import { usePicCutStore } from '@/stores'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useImageOptimization } from '@/composables/useImageOptimization'

export function useImageUpload() {
  const store = usePicCutStore()
  const { handleError, handleWarning, withErrorHandling } = useErrorHandler()
  const { smartCompress, isOptimizing, optimizationProgress } = useImageOptimization()
  const isUploading = ref(false)
  const uploadError = ref<string | null>(null)
  const compressionEnabled = ref(true) // 默认启用压缩

  // 支持的文件类型
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  
  // 最大文件大小 (5MB) - 降低以提高安全性
  const maxFileSize = 5 * 1024 * 1024
  
  // 最大图片尺寸限制
  const maxImageWidth = 8000
  const maxImageHeight = 8000
  
  // 最小图片尺寸限制
  const minImageWidth = 10
  const minImageHeight = 10
  
  // 文件头签名检查
  const fileSignatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46]
  }

  /**
   * 检查文件头签名
   */
  const checkFileSignature = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const uint8Array = new Uint8Array(arrayBuffer)
        
        const expectedSignature = fileSignatures[file.type as keyof typeof fileSignatures]
        if (!expectedSignature) {
          resolve(false)
          return
        }
        
        // 检查文件头是否匹配
        for (let i = 0; i < expectedSignature.length; i++) {
          if (uint8Array[i] !== expectedSignature[i]) {
            resolve(false)
            return
          }
        }
        resolve(true)
      }
      reader.onerror = () => resolve(false)
      reader.readAsArrayBuffer(file.slice(0, 12)) // 只读取前12字节
    })
  }

  /**
   * 验证文件名安全性
   */
  const validateFileName = (fileName: string): boolean => {
    // 检查危险字符和扩展名
    const dangerousChars = /[<>:"/\|?*\x00-\x1f]/
    const dangerousExtensions = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i
    
    return !dangerousChars.test(fileName) && !dangerousExtensions.test(fileName)
  }

  /**
   * 验证文件
   */
  const validateFile = async (file: File): Promise<string | null> => {
    // 基本类型检查
    if (!supportedTypes.includes(file.type)) {
      return '不支持的文件格式，请选择 JPG、PNG、GIF 或 WebP 格式的图片'
    }
    
    // 文件大小检查
    if (file.size > maxFileSize) {
      return '文件大小不能超过 5MB'
    }
    
    // 最小文件大小检查（防止空文件）
    if (file.size < 100) {
      return '文件大小过小，请选择有效的图片文件'
    }
    
    // 文件名安全检查
    if (!validateFileName(file.name)) {
      return '文件名包含不安全字符，请重命名后重试'
    }
    
    // 文件头签名检查
    const isValidSignature = await checkFileSignature(file)
    if (!isValidSignature) {
      return '文件格式验证失败，可能是伪造的图片文件'
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
   * 获取图片尺寸并验证
   */
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        
        // 验证图片尺寸
        if (width > maxImageWidth || height > maxImageHeight) {
          reject(new Error(`图片尺寸过大，最大支持 ${maxImageWidth}x${maxImageHeight} 像素`))
          return
        }
        
        if (width < minImageWidth || height < minImageHeight) {
          reject(new Error(`图片尺寸过小，最小需要 ${minImageWidth}x${minImageHeight} 像素`))
          return
        }
        
        // 检查宽高比是否合理（防止异常图片）
        const aspectRatio = Math.max(width, height) / Math.min(width, height)
        if (aspectRatio > 50) {
          reject(new Error('图片宽高比异常，请选择正常比例的图片'))
          return
        }
        
        resolve({ width, height })
      }
      
      img.onerror = () => {
        reject(new Error('图片加载失败，可能是损坏的文件'))
      }
      
      // 设置超时
      setTimeout(() => {
        reject(new Error('图片加载超时'))
      }, 10000)
      
      img.src = url
    })
  }

  /**
   * 动态获取容器尺寸
   */
  const getContainerSize = (): number => {
    // 检测设备类型
    const isMobile = window.innerWidth < 768
    
    // 根据设备类型选择正确的容器选择器
    const containerSelector = isMobile ? '.preview-container-mobile' : '.preview-container-desktop'
    const previewContainer = document.querySelector(containerSelector) as HTMLElement
    
    if (!previewContainer) {
      console.warn(`容器未找到: ${containerSelector}, 使用默认尺寸`)
      return 400 // 默认值
    }
    
    const rect = previewContainer.getBoundingClientRect()
    const containerSize = Math.min(rect.width, rect.height)
    
    console.log(`📏 获取容器尺寸: 设备=${isMobile ? '手机' : '桌面'}, 选择器=${containerSelector}, 尺寸=${containerSize}`)
    
    return containerSize
  }

  /**
   * 处理文件上传
   */
  const handleFileUpload = async (file: File) => {
    try {
      isUploading.value = true
      uploadError.value = null

      // 验证文件
      const validationError = await validateFile(file)
      if (validationError) {
        uploadError.value = validationError
        handleWarning(validationError, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })
        return false
      }

      let url: string
      let processedFile = file
      
      // 如果启用压缩且文件大于1MB，则进行智能压缩
      if (compressionEnabled.value && file.size > 1024 * 1024) {
        try {
          console.log('🗜️ 开始智能压缩图片...', {
            原始大小: `${(file.size / 1024).toFixed(2)} KB`,
            文件名: file.name
          })
          
          const compressionResult = await smartCompress(file)
          
          // 将压缩后的 dataUrl 转换为 Blob
          const response = await fetch(compressionResult.dataUrl)
          const blob = await response.blob()
          
          // 创建新的 File 对象
          processedFile = new File([blob], file.name, {
            type: `image/${compressionResult.format}`,
            lastModified: Date.now()
          })
          
          url = compressionResult.dataUrl
          
          console.log('✅ 图片压缩完成:', {
            压缩率: `${compressionResult.compressionRatio.toFixed(1)}%`,
            原始大小: `${(compressionResult.originalSize / 1024).toFixed(2)} KB`,
            压缩大小: `${(compressionResult.compressedSize / 1024).toFixed(2)} KB`,
            格式: compressionResult.format
          })
        } catch (compressionError) {
          console.warn('图片压缩失败，使用原始文件:', compressionError)
          url = await createImageUrl(file)
        }
      } else {
        // 创建预览URL
        url = await createImageUrl(processedFile)
      }
      
      // 获取图片尺寸
      const dimensions = await getImageDimensions(url)
      
      // 更新store
      store.setImage({
        file: processedFile,
        url,
        width: dimensions.width,
        height: dimensions.height
      })
      
      // 等待DOM更新后再获取容器尺寸
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 动态获取容器尺寸
      const containerSize = getContainerSize()
      const imageAspectRatio = dimensions.width / dimensions.height
      const containerAspectRatio = 1 // 正方形容器
      
      let imageDisplayWidth, imageDisplayHeight, offsetX, offsetY
      
      if (imageAspectRatio > containerAspectRatio) {
        // 图片更宽，以容器宽度为准
        imageDisplayWidth = containerSize
        imageDisplayHeight = containerSize / imageAspectRatio
        offsetX = 0
        offsetY = (containerSize - imageDisplayHeight) / 2
      } else {
        // 图片更高或正方形，以容器高度为准
        imageDisplayHeight = containerSize
        imageDisplayWidth = containerSize * imageAspectRatio
        offsetX = (containerSize - imageDisplayWidth) / 2
        offsetY = 0
      }
      
      // 设置裁剪框紧贴图片边缘，留出很小的边距确保裁剪框可见
      const margin = 3 // 3px的边距，确保裁剪框可见且在图片内
      
      console.log(`📏 图片上传后调整裁剪框: 容器=${containerSize}, 图片显示=${imageDisplayWidth}x${imageDisplayHeight}, 偏移=${offsetX},${offsetY}`)
      
      store.updateCropBox({
        x: offsetX + margin,
        y: offsetY + margin,
        width: imageDisplayWidth - margin * 2,
        height: imageDisplayHeight - margin * 2
      })
      
      return true
    } catch (error) {
      console.error('上传文件失败:', error)
      const errorMessage = error instanceof Error ? error.message : '上传失败'
      uploadError.value = errorMessage
      handleError(error instanceof Error ? error : new Error(errorMessage), {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
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

  /**
   * 切换压缩功能
   */
  const toggleCompression = () => {
    compressionEnabled.value = !compressionEnabled.value
  }

  return {
    isUploading,
    uploadError,
    compressionEnabled,
    isOptimizing,
    optimizationProgress,
    handleFileSelect,
    handleFileUpload,
    handleDrop,
    handleDragOver,
    clearImage,
    toggleCompression
  }
}