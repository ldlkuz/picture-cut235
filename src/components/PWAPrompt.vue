<template>
  <!-- PWA 安装提示 -->
  <Teleport to="body">
    <div 
      v-if="showInstallPrompt" 
      class="pwa-install-prompt"
    >
      <div class="prompt-content">
        <div class="prompt-icon">
          <Smartphone class="w-6 h-6 text-indigo-600" />
        </div>
        <div class="prompt-text">
          <h3 class="prompt-title">安装 PICCUT 应用</h3>
          <p class="prompt-description">
            安装后可以像原生应用一样使用，支持离线功能
          </p>
        </div>
        <div class="prompt-actions">
          <button 
            @click="dismissInstall"
            class="dismiss-button"
          >
            稍后
          </button>
          <button 
            @click="handleInstall"
            class="install-button"
            :disabled="installing"
          >
            <Download v-if="!installing" class="w-4 h-4 mr-1" />
            <Loader2 v-else class="w-4 h-4 mr-1 animate-spin" />
            {{ installing ? '安装中...' : '安装' }}
          </button>
        </div>
        <button 
          @click="dismissInstall"
          class="close-button"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <!-- PWA 更新提示 -->
    <div 
      v-if="showUpdatePrompt" 
      class="pwa-update-prompt"
    >
      <div class="prompt-content">
        <div class="prompt-icon">
          <RefreshCw class="w-6 h-6 text-green-600" />
        </div>
        <div class="prompt-text">
          <h3 class="prompt-title">发现新版本</h3>
          <p class="prompt-description">
            新版本包含功能改进和性能优化
          </p>
        </div>
        <div class="prompt-actions">
          <button 
            @click="dismissUpdate"
            class="dismiss-button"
          >
            稍后
          </button>
          <button 
            @click="handleUpdate"
            class="update-button"
            :disabled="updating"
          >
            <RefreshCw v-if="!updating" class="w-4 h-4 mr-1" />
            <Loader2 v-else class="w-4 h-4 mr-1 animate-spin" />
            {{ updating ? '更新中...' : '立即更新' }}
          </button>
        </div>
        <button 
          @click="dismissUpdate"
          class="close-button"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  Smartphone, 
  Download, 
  RefreshCw, 
  X, 
  Loader2 
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { usePWA } from '@/composables/usePWA'

interface Props {
  autoShow?: boolean
  showDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoShow: true,
  showDelay: 3000
})

const { 
  isInstallable, 
  isUpdateAvailable, 
  installApp, 
  applyUpdate 
} = usePWA()

const showInstallPrompt = ref(false)
const showUpdatePrompt = ref(false)
const installing = ref(false)
const updating = ref(false)
const installDismissed = ref(false)
const updateDismissed = ref(false)

// 计算是否应该显示安装提示
const shouldShowInstall = computed(() => {
  return isInstallable.value && !installDismissed.value && props.autoShow
})

// 计算是否应该显示更新提示
const shouldShowUpdate = computed(() => {
  return isUpdateAvailable.value && !updateDismissed.value
})

// 监听安装状态变化
watch(shouldShowInstall, (show) => {
  if (show) {
    // 延迟显示安装提示
    setTimeout(() => {
      if (shouldShowInstall.value) {
        showInstallPrompt.value = true
      }
    }, props.showDelay)
  } else {
    showInstallPrompt.value = false
  }
})

// 监听更新状态变化
watch(shouldShowUpdate, (show) => {
  if (show) {
    showUpdatePrompt.value = true
  } else {
    showUpdatePrompt.value = false
  }
})

// 处理安装
const handleInstall = async () => {
  try {
    installing.value = true
    const success = await installApp()
    
    if (success) {
      showInstallPrompt.value = false
      toast.success('应用安装成功', {
        description: 'PICCUT 已添加到您的设备'
      })
    } else {
      toast.info('安装已取消')
    }
  } catch (error) {
    console.error('安装失败:', error)
    toast.error('安装失败，请重试')
  } finally {
    installing.value = false
  }
}

// 处理更新
const handleUpdate = async () => {
  try {
    updating.value = true
    applyUpdate()
    
    toast.info('正在更新应用', {
      description: '应用将在几秒钟后重新加载'
    })
    
    showUpdatePrompt.value = false
  } catch (error) {
    console.error('更新失败:', error)
    toast.error('更新失败，请刷新页面重试')
  } finally {
    updating.value = false
  }
}

// 忽略安装提示
const dismissInstall = () => {
  showInstallPrompt.value = false
  installDismissed.value = true
  
  // 24小时后重新显示
  setTimeout(() => {
    installDismissed.value = false
  }, 24 * 60 * 60 * 1000)
}

// 忽略更新提示
const dismissUpdate = () => {
  showUpdatePrompt.value = false
  updateDismissed.value = true
  
  // 1小时后重新显示
  setTimeout(() => {
    updateDismissed.value = false
  }, 60 * 60 * 1000)
}

// 手动显示安装提示
const showInstall = () => {
  if (isInstallable.value) {
    installDismissed.value = false
    showInstallPrompt.value = true
  }
}

// 手动显示更新提示
const showUpdate = () => {
  if (isUpdateAvailable.value) {
    updateDismissed.value = false
    showUpdatePrompt.value = true
  }
}

defineExpose({
  showInstall,
  showUpdate
})
</script>

<style scoped>
.pwa-install-prompt,
.pwa-update-prompt {
  @apply fixed bottom-4 left-4 right-4 z-50;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prompt-content {
  @apply bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-md mx-auto relative;
  backdrop-filter: blur(10px);
}

.prompt-icon {
  @apply flex-shrink-0;
}

.prompt-text {
  @apply flex-1 min-w-0;
}

.prompt-title {
  @apply text-lg font-semibold text-gray-900 mb-1;
}

.prompt-description {
  @apply text-sm text-gray-600 leading-relaxed;
}

.prompt-actions {
  @apply flex gap-2 mt-4;
}

.dismiss-button {
  @apply flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors;
}

.install-button {
  @apply flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors;
}

.update-button {
  @apply flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors;
}

.close-button {
  @apply absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors;
}

/* 桌面端样式调整 */
@media (min-width: 768px) {
  .pwa-install-prompt,
  .pwa-update-prompt {
    @apply bottom-6 left-auto right-6 max-w-sm;
  }
  
  .prompt-content {
    @apply p-6;
  }
  
  .prompt-actions {
    @apply flex-row;
  }
}

/* 移动端优化 */
@media (max-width: 640px) {
  .prompt-content {
    @apply mx-2;
  }
  
  .prompt-actions {
    @apply flex-col gap-2;
  }
  
  .dismiss-button,
  .install-button,
  .update-button {
    @apply w-full;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .prompt-content {
    @apply bg-gray-800 border-gray-700;
  }
  
  .prompt-title {
    @apply text-gray-100;
  }
  
  .prompt-description {
    @apply text-gray-300;
  }
  
  .dismiss-button {
    @apply text-gray-300 bg-gray-700 hover:bg-gray-600;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .prompt-content {
    @apply border-2 border-gray-900;
  }
  
  .install-button,
  .update-button {
    @apply border-2 border-transparent;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .pwa-install-prompt,
  .pwa-update-prompt {
    animation: none;
  }
  
  .prompt-content {
    @apply transition-none;
  }
}
</style>