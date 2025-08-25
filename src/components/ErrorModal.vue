<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="error-modal-overlay"
      @click="closeModal"
    >
      <div 
        class="error-modal-content"
        @click.stop
      >
        <div class="error-modal-header">
          <div class="error-icon">
            <AlertTriangle 
              v-if="error?.type === 'error'" 
              class="w-6 h-6 text-red-500" 
            />
            <AlertCircle 
              v-else-if="error?.type === 'warning'" 
              class="w-6 h-6 text-yellow-500" 
            />
            <Info 
              v-else 
              class="w-6 h-6 text-blue-500" 
            />
          </div>
          <h3 class="error-title">{{ error?.title }}</h3>
          <button 
            @click="closeModal"
            class="close-button"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="error-modal-body">
          <div class="error-message">
            <h4 class="message-title">错误描述</h4>
            <p class="message-text">{{ error?.message }}</p>
          </div>
          
          <div v-if="error?.timestamp" class="error-time">
            <h4 class="time-title">发生时间</h4>
            <p class="time-text">{{ formatTime(error.timestamp) }}</p>
          </div>
          
          <div v-if="error?.context" class="error-context">
            <h4 class="context-title">上下文信息</h4>
            <pre class="context-text">{{ formatContext(error.context) }}</pre>
          </div>
          
          <div v-if="error?.stack" class="error-stack">
            <h4 class="stack-title">技术详情</h4>
            <details class="stack-details">
              <summary class="stack-summary">点击查看堆栈信息</summary>
              <pre class="stack-text">{{ error.stack }}</pre>
            </details>
          </div>
        </div>
        
        <div class="error-modal-footer">
          <button 
            @click="copyErrorInfo"
            class="copy-button"
          >
            <Copy class="w-4 h-4 mr-2" />
            复制错误信息
          </button>
          <button 
            @click="reportError"
            class="report-button"
          >
            <Bug class="w-4 h-4 mr-2" />
            报告问题
          </button>
          <button 
            @click="closeModal"
            class="close-modal-button"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, AlertCircle, Info, X, Copy, Bug } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { ErrorInfo } from '@/composables/useErrorHandler'

interface Props {
  isOpen: boolean
  error: ErrorInfo | null
}

interface Emits {
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const closeModal = () => {
  emit('close')
}

const formatTime = (timestamp: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(timestamp)
}

const formatContext = (context: any): string => {
  if (typeof context === 'string') {
    return context
  }
  return JSON.stringify(context, null, 2)
}

const copyErrorInfo = async () => {
  if (!props.error) return
  
  const errorInfo = {
    id: props.error.id,
    type: props.error.type,
    title: props.error.title,
    message: props.error.message,
    timestamp: props.error.timestamp.toISOString(),
    context: props.error.context,
    stack: props.error.stack,
    userAgent: navigator.userAgent,
    url: window.location.href
  }
  
  try {
    await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2))
    toast.success('错误信息已复制到剪贴板')
  } catch (error) {
    toast.error('复制失败，请手动选择文本复制')
  }
}

const reportError = () => {
  if (!props.error) return
  
  // 这里可以集成错误报告服务
  const subject = encodeURIComponent(`错误报告: ${props.error.title}`)
  const body = encodeURIComponent(`
错误ID: ${props.error.id}
错误类型: ${props.error.type}
错误消息: ${props.error.message}
发生时间: ${formatTime(props.error.timestamp)}
页面URL: ${window.location.href}
浏览器: ${navigator.userAgent}

请描述您在遇到此错误时正在进行的操作：


技术详情：
${props.error.stack || '无'}

上下文信息：
${formatContext(props.error.context || {})}
  `)
  
  // 可以替换为实际的错误报告邮箱或系统
  const mailtoLink = `mailto:support@example.com?subject=${subject}&body=${body}`
  window.open(mailtoLink)
  
  toast.info('已打开邮件客户端，请发送错误报告')
}
</script>

<style scoped>
.error-modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50;
  backdrop-filter: blur(4px);
}

.error-modal-content {
  @apply bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.error-modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.error-icon {
  @apply flex-shrink-0;
}

.error-title {
  @apply flex-1 text-xl font-semibold text-gray-900 mx-4;
}

.close-button {
  @apply p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors;
}

.error-modal-body {
  @apply p-6 space-y-6 overflow-y-auto max-h-96;
}

.error-message,
.error-time,
.error-context,
.error-stack {
  @apply space-y-2;
}

.message-title,
.time-title,
.context-title,
.stack-title {
  @apply text-sm font-medium text-gray-700;
}

.message-text {
  @apply text-gray-900 leading-relaxed;
}

.time-text {
  @apply text-gray-600 text-sm;
}

.context-text {
  @apply bg-gray-50 p-4 rounded-lg text-sm font-mono text-gray-800 overflow-auto;
}

.stack-details {
  @apply bg-gray-50 rounded-lg;
}

.stack-summary {
  @apply p-4 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 select-none;
}

.stack-text {
  @apply p-4 pt-0 text-xs font-mono text-gray-600 overflow-auto max-h-40;
}

.error-modal-footer {
  @apply flex flex-wrap gap-3 p-6 border-t border-gray-200 bg-gray-50;
}

.copy-button {
  @apply flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
}

.report-button {
  @apply flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors;
}

.close-modal-button {
  @apply flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
}

@media (max-width: 640px) {
  .error-modal-content {
    @apply mx-2;
  }
  
  .error-modal-header {
    @apply p-4;
  }
  
  .error-modal-body {
    @apply p-4;
  }
  
  .error-modal-footer {
    @apply p-4 flex-col;
  }
  
  .close-modal-button {
    @apply flex-none;
  }
}
</style>