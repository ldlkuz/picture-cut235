<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-container">
      <div class="error-icon">
        <AlertTriangle class="w-16 h-16 text-red-500" />
      </div>
      <h2 class="error-title">哎呀，出现了一些问题</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <button @click="retry" class="retry-button">
          <RefreshCw class="w-4 h-4 mr-2" />
          重试
        </button>
        <button @click="reportError" class="report-button">
          <Bug class="w-4 h-4 mr-2" />
          报告问题
        </button>
      </div>
      <details v-if="showDetails" class="error-details">
        <summary class="details-summary">技术详情</summary>
        <pre class="error-stack">{{ errorDetails }}</pre>
      </details>
      <button 
        @click="showDetails = !showDetails" 
        class="toggle-details"
      >
        {{ showDetails ? '隐藏' : '显示' }}技术详情
      </button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, onMounted } from 'vue'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-vue-next'

interface Props {
  fallback?: string
  onError?: (error: Error, errorInfo: any) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallback: '应用遇到了意外错误，请刷新页面重试'
})

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')
const showDetails = ref(false)
const lastError = ref<Error | null>(null)

// 捕获组件错误
onErrorCaptured((error: Error, instance, errorInfo) => {
  console.error('ErrorBoundary caught an error:', error)
  handleError(error, errorInfo)
  return false // 阻止错误继续传播
})

// 捕获全局错误
onMounted(() => {
  window.addEventListener('error', (event) => {
    handleError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    handleError(new Error(event.reason), {
      type: 'unhandledrejection',
      reason: event.reason
    })
  })
})

const handleError = (error: Error, errorInfo: any) => {
  hasError.value = true
  lastError.value = error
  
  // 根据错误类型提供友好的错误消息
  errorMessage.value = getFriendlyErrorMessage(error)
  errorDetails.value = `${error.name}: ${error.message}\n\n${error.stack || ''}\n\nError Info: ${JSON.stringify(errorInfo, null, 2)}`
  
  // 调用外部错误处理器
  if (props.onError) {
    props.onError(error, errorInfo)
  }
  
  // 记录错误到控制台
  console.group('🚨 Error Boundary')
  console.error('Error:', error)
  console.error('Error Info:', errorInfo)
  console.groupEnd()
}

const getFriendlyErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) {
    return '网络连接出现问题，请检查您的网络连接后重试'
  }
  
  if (message.includes('permission') || message.includes('denied')) {
    return '权限不足，请检查浏览器设置或联系管理员'
  }
  
  if (message.includes('memory') || message.includes('out of')) {
    return '内存不足，请关闭其他标签页或重启浏览器'
  }
  
  if (message.includes('timeout')) {
    return '操作超时，请重试或检查网络连接'
  }
  
  if (message.includes('file') || message.includes('upload')) {
    return '文件处理出现问题，请检查文件格式和大小后重试'
  }
  
  if (message.includes('canvas') || message.includes('image')) {
    return '图片处理出现问题，请尝试使用其他图片或刷新页面'
  }
  
  // 默认错误消息
  return props.fallback
}

const retry = () => {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  showDetails.value = false
  lastError.value = null
  
  // 刷新页面
  window.location.reload()
}

const reportError = () => {
  if (!lastError.value) return
  
  const errorReport = {
    message: lastError.value.message,
    stack: lastError.value.stack,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  }
  
  // 这里可以发送错误报告到服务器
  console.log('Error Report:', errorReport)
  
  // 复制错误信息到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('错误信息已复制到剪贴板，您可以将其发送给技术支持')
      })
      .catch(() => {
        alert('无法复制错误信息，请手动复制技术详情中的内容')
      })
  } else {
    alert('请手动复制技术详情中的内容并发送给技术支持')
  }
}
</script>

<style scoped>
.error-boundary {
  @apply min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4;
}

.error-container {
  @apply max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center;
}

.error-icon {
  @apply flex justify-center mb-6;
}

.error-title {
  @apply text-2xl font-bold text-gray-900 mb-4;
}

.error-message {
  @apply text-gray-600 mb-6 leading-relaxed;
}

.error-actions {
  @apply flex flex-col sm:flex-row gap-3 mb-6;
}

.retry-button {
  @apply flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium;
}

.report-button {
  @apply flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium;
}

.error-details {
  @apply mt-4 text-left;
}

.details-summary {
  @apply cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 mb-2;
}

.error-stack {
  @apply bg-gray-100 p-4 rounded-lg text-xs font-mono text-gray-800 overflow-auto max-h-40;
}

.toggle-details {
  @apply text-sm text-gray-500 hover:text-gray-700 underline mt-4;
}
</style>