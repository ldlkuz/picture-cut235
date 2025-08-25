import { ref, nextTick, readonly } from 'vue'
import { useErrorHandler } from '@/composables/useErrorHandler'

export interface CompressionOptions {
  quality: number // 0.1 - 1.0
  maxWidth?: number
  maxHeight?: number
  format?: 'jpeg' | 'png' | 'webp'
  enableProgressive?: boolean
}

export interface OptimizationResult {
  dataUrl: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
  format: string
  dimensions: { width: number; height: number }
}

const isWebPSupported = ref<boolean | null>(null)
const isOptimizing = ref(false)
const optimizationProgress = ref(0)

export function useImageOptimization() {
  const { handleError, withErrorHandling } = useErrorHandler()

  /**
   * 检测浏览器是否支持 WebP 格式
   */
  const checkWebPSupport = async (): Promise<boolean> => {
    if (isWebPSupported.value !== null) {
      return isWebPSupported.value
    }

    return new Promise((resolve) => {
      const webP = new Image()
      webP.onload = webP.onerror = () => {
        isWebPSupported.value = webP.height === 2
        resolve(isWebPSupported.value)
      }
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
    })
  }

  /**
   * 获取图片的原始尺寸和大小
   */
  const getImageInfo = (file: File): Promise<{ width: number; height: number; size: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('无法加载图片信息'))
      }
      
      img.src = url
    })
  }

  /**
   * 计算压缩后的尺寸
   */
  const calculateCompressedDimensions = (
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } => {
    let { width, height } = { width: originalWidth, height: originalHeight }
    
    // 如果设置了最大尺寸限制
    if (maxWidth && width > maxWidth) {
      height = (height * maxWidth) / width
      width = maxWidth
    }
    
    if (maxHeight && height > maxHeight) {
      width = (width * maxHeight) / height
      height = maxHeight
    }
    
    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  /**
   * 压缩图片
   */
  const compressImage = async (
    file: File,
    options: CompressionOptions = { quality: 0.8 }
  ): Promise<OptimizationResult> => {
    return withErrorHandling(async () => {
      isOptimizing.value = true
      optimizationProgress.value = 0
      
      try {
        // 获取原始图片信息
        optimizationProgress.value = 10
        const originalInfo = await getImageInfo(file)
        
        // 检查 WebP 支持
        optimizationProgress.value = 20
        const webpSupported = await checkWebPSupport()
        
        // 确定输出格式
        let outputFormat = options.format || 'jpeg'
        if (outputFormat === 'webp' && !webpSupported) {
          console.warn('浏览器不支持 WebP，回退到 JPEG 格式')
          outputFormat = 'jpeg'
        }
        
        // 计算压缩后的尺寸
        optimizationProgress.value = 30
        const compressedDimensions = calculateCompressedDimensions(
          originalInfo.width,
          originalInfo.height,
          options.maxWidth,
          options.maxHeight
        )
        
        // 创建 Canvas 进行压缩
        optimizationProgress.value = 40
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          throw new Error('无法获取 Canvas 上下文')
        }
        
        canvas.width = compressedDimensions.width
        canvas.height = compressedDimensions.height
        
        // 加载并绘制图片
        optimizationProgress.value = 60
        const img = new Image()
        const imageUrl = URL.createObjectURL(file)
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // 设置图片平滑处理
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, compressedDimensions.width, compressedDimensions.height)
            URL.revokeObjectURL(imageUrl)
            resolve()
          }
          
          img.onerror = () => {
            URL.revokeObjectURL(imageUrl)
            reject(new Error('图片加载失败'))
          }
          
          img.src = imageUrl
        })
        
        // 生成压缩后的数据
        optimizationProgress.value = 80
        const mimeType = `image/${outputFormat}`
        const dataUrl = canvas.toDataURL(mimeType, options.quality)
        
        // 计算压缩后的大小
        optimizationProgress.value = 90
        const compressedSize = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 3 / 4)
        const compressionRatio = ((originalInfo.size - compressedSize) / originalInfo.size) * 100
        
        optimizationProgress.value = 100
        
        const result: OptimizationResult = {
          dataUrl,
          originalSize: originalInfo.size,
          compressedSize,
          compressionRatio: Math.max(0, compressionRatio),
          format: outputFormat,
          dimensions: compressedDimensions
        }
        
        console.log('🗜️ 图片压缩完成:', {
          原始尺寸: `${originalInfo.width}x${originalInfo.height}`,
          压缩尺寸: `${compressedDimensions.width}x${compressedDimensions.height}`,
          原始大小: `${(originalInfo.size / 1024).toFixed(2)} KB`,
          压缩大小: `${(compressedSize / 1024).toFixed(2)} KB`,
          压缩率: `${compressionRatio.toFixed(1)}%`,
          输出格式: outputFormat,
          质量: options.quality
        })
        
        return result
      } finally {
        isOptimizing.value = false
        optimizationProgress.value = 0
      }
    }, '图片压缩失败') as Promise<OptimizationResult>
  }

  /**
   * 智能压缩：根据文件大小自动选择压缩参数
   */
  const smartCompress = async (file: File): Promise<OptimizationResult> => {
    const fileSizeKB = file.size / 1024
    
    let options: CompressionOptions
    
    if (fileSizeKB > 5000) { // > 5MB
      options = {
        quality: 0.6,
        maxWidth: 2048,
        maxHeight: 2048,
        format: 'webp'
      }
    } else if (fileSizeKB > 2000) { // > 2MB
      options = {
        quality: 0.7,
        maxWidth: 3000,
        maxHeight: 3000,
        format: 'webp'
      }
    } else if (fileSizeKB > 1000) { // > 1MB
      options = {
        quality: 0.8,
        maxWidth: 4000,
        maxHeight: 4000,
        format: 'webp'
      }
    } else {
      options = {
        quality: 0.9,
        format: 'webp'
      }
    }
    
    console.log(`🤖 智能压缩策略 (${fileSizeKB.toFixed(2)} KB):`, options)
    
    return compressImage(file, options)
  }

  /**
   * 批量压缩图片
   */
  const batchCompress = async (
    files: File[],
    options: CompressionOptions = { quality: 0.8 }
  ): Promise<OptimizationResult[]> => {
    const results: OptimizationResult[] = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await compressImage(files[i], options)
        results.push(result)
        
        // 更新批量处理进度
        optimizationProgress.value = ((i + 1) / files.length) * 100
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('批量压缩失败'), {
          fileIndex: i,
          fileName: files[i].name
        })
      }
    }
    
    return results
  }

  /**
   * 预加载图片（懒加载支持）
   */
  const preloadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`图片预加载失败: ${src}`))
      
      img.src = src
    })
  }

  /**
   * 懒加载图片
   */
  const lazyLoadImage = (element: HTMLImageElement, src: string, placeholder?: string): void => {
    // 设置占位符
    if (placeholder) {
      element.src = placeholder
    }
    
    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            
            // 预加载真实图片
            preloadImage(src)
              .then(() => {
                img.src = src
                img.classList.add('loaded')
              })
              .catch((error) => {
                handleError(error, { src, element: img })
              })
              .finally(() => {
                observer.unobserve(img)
              })
          }
        })
      },
      {
        rootMargin: '50px 0px', // 提前50px开始加载
        threshold: 0.1
      }
    )
    
    observer.observe(element)
  }

  /**
   * 生成不同尺寸的响应式图片
   */
  const generateResponsiveImages = async (
    file: File,
    sizes: number[] = [480, 768, 1024, 1920]
  ): Promise<{ size: number; dataUrl: string; format: string }[]> => {
    const results = []
    
    for (const size of sizes) {
      try {
        const result = await compressImage(file, {
          quality: 0.8,
          maxWidth: size,
          maxHeight: size,
          format: 'webp'
        })
        
        results.push({
          size,
          dataUrl: result.dataUrl,
          format: result.format
        })
      } catch (error) {
        console.warn(`生成 ${size}px 响应式图片失败:`, error)
      }
    }
    
    return results
  }

  return {
    // 状态
    isWebPSupported: readonly(isWebPSupported),
    isOptimizing: readonly(isOptimizing),
    optimizationProgress: readonly(optimizationProgress),
    
    // 方法
    checkWebPSupport,
    compressImage,
    smartCompress,
    batchCompress,
    preloadImage,
    lazyLoadImage,
    generateResponsiveImages,
    getImageInfo
  }
}