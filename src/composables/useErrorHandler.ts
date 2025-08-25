import { ref, computed, readonly } from 'vue'
import { toast } from 'vue-sonner'

export interface ErrorInfo {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  stack?: string
  context?: any
}

const errors = ref<ErrorInfo[]>([])
const isErrorModalOpen = ref(false)
const currentError = ref<ErrorInfo | null>(null)

export function useErrorHandler() {
  /**
   * 生成错误ID
   */
  const generateErrorId = (): string => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加错误记录
   */
  const addError = (error: Omit<ErrorInfo, 'id' | 'timestamp'>): string => {
    const errorInfo: ErrorInfo = {
      ...error,
      id: generateErrorId(),
      timestamp: new Date()
    }
    
    errors.value.unshift(errorInfo)
    
    // 限制错误记录数量
    if (errors.value.length > 50) {
      errors.value = errors.value.slice(0, 50)
    }
    
    return errorInfo.id
  }

  /**
   * 处理错误并显示用户友好的提示
   */
  const handleError = (error: Error | string, context?: any, showToast = true): string => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    const friendlyMessage = getFriendlyErrorMessage(errorObj)
    
    const errorId = addError({
      type: 'error',
      title: '操作失败',
      message: friendlyMessage,
      stack: errorObj.stack,
      context
    })
    
    if (showToast) {
      toast.error(friendlyMessage, {
        duration: 5000,
        action: {
          label: '查看详情',
          onClick: () => showErrorDetails(errorId)
        }
      })
    }
    
    // 记录到控制台
    console.error('🚨 Error handled:', {
      error: errorObj,
      context,
      errorId
    })
    
    return errorId
  }

  /**
   * 处理警告
   */
  const handleWarning = (message: string, context?: any): string => {
    const errorId = addError({
      type: 'warning',
      title: '注意',
      message,
      context
    })
    
    toast.warning(message, {
      duration: 4000
    })
    
    return errorId
  }

  /**
   * 处理信息提示
   */
  const handleInfo = (message: string, context?: any): string => {
    const errorId = addError({
      type: 'info',
      title: '提示',
      message,
      context
    })
    
    toast.info(message, {
      duration: 3000
    })
    
    return errorId
  }

  /**
   * 获取友好的错误消息
   */
  const getFriendlyErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase()
    
    // 网络相关错误
    if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
      return '网络连接出现问题，请检查您的网络连接后重试'
    }
    
    // 文件相关错误
    if (message.includes('file') || message.includes('upload')) {
      if (message.includes('size') || message.includes('大小')) {
        return '文件大小超出限制，请选择较小的文件'
      }
      if (message.includes('type') || message.includes('format') || message.includes('格式')) {
        return '不支持的文件格式，请选择正确的图片文件'
      }
      return '文件处理失败，请检查文件是否损坏'
    }
    
    // 图片处理错误
    if (message.includes('image') || message.includes('canvas') || message.includes('图片')) {
      if (message.includes('load') || message.includes('加载')) {
        return '图片加载失败，请检查图片是否损坏或网络连接'
      }
      if (message.includes('size') || message.includes('尺寸')) {
        return '图片尺寸不符合要求，请选择合适尺寸的图片'
      }
      return '图片处理失败，请尝试使用其他图片'
    }
    
    // 权限错误
    if (message.includes('permission') || message.includes('denied') || message.includes('权限')) {
      return '权限不足，请检查浏览器设置或联系管理员'
    }
    
    // 内存错误
    if (message.includes('memory') || message.includes('out of')) {
      return '内存不足，请关闭其他标签页或重启浏览器'
    }
    
    // 超时错误
    if (message.includes('timeout') || message.includes('超时')) {
      return '操作超时，请重试或检查网络连接'
    }
    
    // 验证错误
    if (message.includes('validation') || message.includes('invalid') || message.includes('验证')) {
      return '输入数据不正确，请检查后重试'
    }
    
    // 默认错误消息
    return error.message || '操作失败，请重试'
  }

  /**
   * 显示错误详情
   */
  const showErrorDetails = (errorId: string) => {
    const error = errors.value.find(e => e.id === errorId)
    if (error) {
      currentError.value = error
      isErrorModalOpen.value = true
    }
  }

  /**
   * 关闭错误详情
   */
  const closeErrorDetails = () => {
    isErrorModalOpen.value = false
    currentError.value = null
  }

  /**
   * 清除所有错误记录
   */
  const clearErrors = () => {
    errors.value = []
  }

  /**
   * 清除指定错误
   */
  const clearError = (errorId: string) => {
    const index = errors.value.findIndex(e => e.id === errorId)
    if (index > -1) {
      errors.value.splice(index, 1)
    }
  }

  /**
   * 异步操作包装器
   */
  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    errorMessage?: string,
    showToast = true
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      if (errorMessage) {
        errorObj.message = errorMessage
      }
      handleError(errorObj, undefined, showToast)
      return null
    }
  }

  /**
   * 同步操作包装器
   */
  const withSyncErrorHandling = <T>(
    operation: () => T,
    errorMessage?: string,
    showToast = true
  ): T | null => {
    try {
      return operation()
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      if (errorMessage) {
        errorObj.message = errorMessage
      }
      handleError(errorObj, undefined, showToast)
      return null
    }
  }

  return {
    // 状态
    errors: readonly(errors),
    isErrorModalOpen: readonly(isErrorModalOpen),
    currentError: readonly(currentError),
    
    // 方法
    handleError,
    handleWarning,
    handleInfo,
    showErrorDetails,
    closeErrorDetails,
    clearErrors,
    clearError,
    withErrorHandling,
    withSyncErrorHandling
  }
}

// 全局错误处理器实例
export const globalErrorHandler = useErrorHandler()

// 设置全局错误监听
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    globalErrorHandler.handleError(
      new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    )
  })

  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.handleError(
      new Error(event.reason),
      {
        type: 'unhandledrejection',
        reason: event.reason
      }
    )
  })
}