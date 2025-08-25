<template>
  <div v-if="visible" class="progress-indicator">
    <div class="progress-container">
      <!-- 进度环 -->
      <div class="progress-ring">
        <svg class="progress-svg" :width="size" :height="size">
          <!-- 背景圆环 -->
          <circle
            class="progress-background"
            :cx="center"
            :cy="center"
            :r="radius"
            fill="none"
            :stroke-width="strokeWidth"
          />
          <!-- 进度圆环 -->
          <circle
            class="progress-bar"
            :cx="center"
            :cy="center"
            :r="radius"
            fill="none"
            :stroke-width="strokeWidth"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="strokeDashoffset"
            :class="progressClass"
          />
        </svg>
        
        <!-- 中心内容 -->
        <div class="progress-content">
          <div v-if="showIcon" class="progress-icon">
            <component :is="currentIcon" class="w-6 h-6" />
          </div>
          <div v-if="showPercentage" class="progress-percentage">
            {{ Math.round(progress) }}%
          </div>
        </div>
      </div>
      
      <!-- 状态文本 -->
      <div v-if="status" class="progress-status">
        {{ status }}
      </div>
      
      <!-- 详细信息 -->
      <div v-if="details" class="progress-details">
        {{ details }}
      </div>
      
      <!-- 操作按钮 -->
      <div v-if="showActions" class="progress-actions">
        <button 
          v-if="cancellable && !completed"
          @click="$emit('cancel')"
          class="cancel-button"
        >
          <X class="w-4 h-4 mr-1" />
          取消
        </button>
        <button 
          v-if="completed"
          @click="$emit('close')"
          class="close-button"
        >
          <Check class="w-4 h-4 mr-1" />
          完成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { 
  Upload, 
  Image as ImageIcon, 
  Zap, 
  Download, 
  Check, 
  X, 
  AlertCircle,
  Loader2
} from 'lucide-vue-next'

export interface Props {
  visible: boolean
  progress: number // 0-100
  status?: string
  details?: string
  type?: 'upload' | 'processing' | 'compression' | 'download' | 'error'
  size?: number
  strokeWidth?: number
  showIcon?: boolean
  showPercentage?: boolean
  showActions?: boolean
  cancellable?: boolean
  autoHide?: boolean
  autoHideDelay?: number
}

interface Emits {
  cancel: []
  close: []
  complete: []
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  type: 'processing',
  size: 80,
  strokeWidth: 4,
  showIcon: true,
  showPercentage: true,
  showActions: false,
  cancellable: false,
  autoHide: false,
  autoHideDelay: 2000
})

const emit = defineEmits<Emits>()

// 计算属性
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const strokeDashoffset = computed(() => {
  const progress = Math.max(0, Math.min(100, props.progress))
  return circumference.value - (progress / 100) * circumference.value
})

const completed = computed(() => props.progress >= 100)

const progressClass = computed(() => {
  if (props.type === 'error') return 'progress-error'
  if (completed.value) return 'progress-complete'
  return 'progress-active'
})

const currentIcon = computed(() => {
  switch (props.type) {
    case 'upload':
      return Upload
    case 'processing':
      return completed.value ? Check : Loader2
    case 'compression':
      return completed.value ? Check : Zap
    case 'download':
      return completed.value ? Check : Download
    case 'error':
      return AlertCircle
    default:
      return completed.value ? Check : ImageIcon
  }
})

// 自动隐藏逻辑
let autoHideTimer: number | null = null

watch(
  () => props.progress,
  (newProgress) => {
    if (newProgress >= 100) {
      emit('complete')
      
      if (props.autoHide) {
        if (autoHideTimer) {
          clearTimeout(autoHideTimer)
        }
        autoHideTimer = window.setTimeout(() => {
          emit('close')
        }, props.autoHideDelay)
      }
    }
  }
)

// 清理定时器
const clearAutoHideTimer = () => {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
    autoHideTimer = null
  }
}

// 组件卸载时清理
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      clearAutoHideTimer()
    }
  }
)
</script>

<style scoped>
.progress-indicator {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
  backdrop-filter: blur(4px);
}

.progress-container {
  @apply bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full mx-4;
  animation: progressSlideIn 0.3s ease-out;
}

@keyframes progressSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.progress-ring {
  @apply relative inline-block;
}

.progress-svg {
  @apply transform -rotate-90;
}

.progress-background {
  @apply stroke-gray-200;
}

.progress-bar {
  @apply transition-all duration-300 ease-out;
  stroke-linecap: round;
}

.progress-active {
  @apply stroke-blue-500;
  animation: progressPulse 2s ease-in-out infinite;
}

.progress-complete {
  @apply stroke-green-500;
}

.progress-error {
  @apply stroke-red-500;
}

@keyframes progressPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-content {
  @apply absolute inset-0 flex flex-col items-center justify-center;
}

.progress-icon {
  @apply text-gray-600 mb-1;
}

.progress-active .progress-icon {
  @apply text-blue-500;
  animation: iconSpin 2s linear infinite;
}

.progress-complete .progress-icon {
  @apply text-green-500;
}

.progress-error .progress-icon {
  @apply text-red-500;
}

@keyframes iconSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.progress-percentage {
  @apply text-sm font-semibold text-gray-700;
}

.progress-active .progress-percentage {
  @apply text-blue-600;
}

.progress-complete .progress-percentage {
  @apply text-green-600;
}

.progress-error .progress-percentage {
  @apply text-red-600;
}

.progress-status {
  @apply mt-4 text-lg font-medium text-gray-900;
}

.progress-details {
  @apply mt-2 text-sm text-gray-600;
}

.progress-actions {
  @apply mt-6 flex gap-3 justify-center;
}

.cancel-button {
  @apply flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
}

.close-button {
  @apply flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .progress-container {
    @apply p-6;
  }
  
  .progress-status {
    @apply text-base;
  }
  
  .progress-details {
    @apply text-xs;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .progress-container {
    @apply bg-gray-800 text-white;
  }
  
  .progress-background {
    @apply stroke-gray-600;
  }
  
  .progress-status {
    @apply text-gray-100;
  }
  
  .progress-details {
    @apply text-gray-300;
  }
  
  .progress-percentage {
    @apply text-gray-200;
  }
  
  .cancel-button {
    @apply text-gray-200 bg-gray-700 border-gray-600 hover:bg-gray-600;
  }
}
</style>