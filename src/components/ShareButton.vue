<template>
  <div class="share-container">
    <!-- 分享按钮 -->
    <button 
      @click="toggleShareMenu"
      class="share-button"
      :class="{ 'active': isShareMenuOpen }"
    >
      <Share2 class="w-4 h-4 mr-2" />
      分享
    </button>
    
    <!-- 分享菜单 -->
    <Teleport to="body">
      <div 
        v-if="isShareMenuOpen" 
        class="share-overlay"
        @click="closeShareMenu"
      >
        <div 
          class="share-menu"
          @click.stop
        >
          <div class="share-header">
            <h3 class="share-title">分享 PICCUT</h3>
            <button 
              @click="closeShareMenu"
              class="close-button"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <div class="share-content">
            <p class="share-description">
              分享这个强大的在线图片处理工具给你的朋友们！
            </p>
            
            <!-- 社交媒体分享按钮 -->
            <div class="share-buttons">
              <a 
                v-for="platform in sharePlatforms"
                :key="platform.name"
                :href="platform.url"
                :target="platform.name === 'wechat' ? '_self' : '_blank'"
                :rel="platform.name === 'wechat' ? '' : 'noopener noreferrer'"
                class="share-platform-button"
                :class="`share-${platform.name}`"
                @click="handleShare(platform)"
              >
                <component :is="platform.icon" class="w-5 h-5" />
                <span>{{ platform.label }}</span>
              </a>
            </div>
            
            <!-- 复制链接 -->
            <div class="copy-link-section">
              <div class="copy-link-input">
                <input 
                  ref="linkInput"
                  :value="currentUrl"
                  readonly
                  class="link-input"
                />
                <button 
                  @click="copyLink"
                  class="copy-button"
                  :class="{ 'copied': isCopied }"
                >
                  <component :is="isCopied ? Check : Copy" class="w-4 h-4" />
                  {{ isCopied ? '已复制' : '复制' }}
                </button>
              </div>
            </div>
            
            <!-- 二维码分享 -->
            <div class="qr-code-section">
              <button 
                @click="toggleQRCode"
                class="qr-toggle-button"
              >
                <QrCode class="w-4 h-4 mr-2" />
                {{ showQRCode ? '隐藏二维码' : '显示二维码' }}
              </button>
              
              <div v-if="showQRCode" class="qr-code-container">
                <img 
                  :src="qrCodeUrl"
                  alt="PICCUT 宫格切割工具二维码 - 微信朋友圈图片分割神器"
                  class="qr-code-image"
                />
                <p class="qr-code-text">扫描二维码访问 PICCUT</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Share2, 
  X, 
  Copy, 
  Check, 
  QrCode,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useSEO } from '@/composables/useSEO'

interface SharePlatform {
  name: string
  label: string
  url: string
  icon: any
  color: string
}

const { generateShareUrls, currentConfig } = useSEO()

const isShareMenuOpen = ref(false)
const showQRCode = ref(false)
const isCopied = ref(false)
const linkInput = ref<HTMLInputElement>()

const currentUrl = computed(() => window.location.href)

const qrCodeUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl.value)}`
})

const sharePlatforms = computed((): SharePlatform[] => {
  const shareUrls = generateShareUrls()
  
  return [
    {
      name: 'wechat',
      label: '微信',
      url: '#',
      icon: MessageCircle,
      color: '#07C160'
    },
    {
      name: 'weibo',
      label: '微博',
      url: shareUrls.weibo,
      icon: Share2,
      color: '#E6162D'
    },
    {
      name: 'qq',
      label: 'QQ',
      url: shareUrls.qq,
      icon: MessageCircle,
      color: '#12B7F5'
    },
    {
      name: 'twitter',
      label: 'Twitter',
      url: shareUrls.twitter,
      icon: Twitter,
      color: '#1DA1F2'
    },
    {
      name: 'facebook',
      label: 'Facebook',
      url: shareUrls.facebook,
      icon: Facebook,
      color: '#1877F2'
    },
    {
      name: 'linkedin',
      label: 'LinkedIn',
      url: shareUrls.linkedin,
      icon: Linkedin,
      color: '#0A66C2'
    }
  ]
})

const toggleShareMenu = () => {
  isShareMenuOpen.value = !isShareMenuOpen.value
  if (isShareMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    showQRCode.value = false
  }
}

const closeShareMenu = () => {
  isShareMenuOpen.value = false
  document.body.style.overflow = ''
  showQRCode.value = false
}

const toggleQRCode = () => {
  showQRCode.value = !showQRCode.value
}

const handleShare = (platform: SharePlatform) => {
  if (platform.name === 'wechat') {
    // 微信分享显示二维码
    showQRCode.value = true
    toast.info('请使用微信扫描二维码分享')
  } else {
    // 记录分享事件
    console.log(`分享到 ${platform.label}:`, platform.url)
    toast.success(`正在打开 ${platform.label} 分享页面`)
  }
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(currentUrl.value)
    isCopied.value = true
    toast.success('链接已复制到剪贴板')
    
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (error) {
    // 降级方案：选择文本
    if (linkInput.value) {
      linkInput.value.select()
      linkInput.value.setSelectionRange(0, 99999) // 移动端兼容
      
      try {
        document.execCommand('copy')
        isCopied.value = true
        toast.success('链接已复制到剪贴板')
        
        setTimeout(() => {
          isCopied.value = false
        }, 2000)
      } catch (fallbackError) {
        toast.error('复制失败，请手动复制链接')
      }
    }
  }
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isShareMenuOpen.value) {
    closeShareMenu()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.share-button {
  @apply flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
}

.share-button.active {
  @apply bg-blue-50 border-blue-300 text-blue-700;
}

.share-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50;
  backdrop-filter: blur(4px);
}

.share-menu {
  @apply bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden;
  animation: shareSlideIn 0.3s ease-out;
}

@keyframes shareSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.share-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.share-title {
  @apply text-xl font-semibold text-gray-900;
}

.close-button {
  @apply p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors;
}

.share-content {
  @apply p-6 space-y-6;
}

.share-description {
  @apply text-gray-600 text-center;
}

.share-buttons {
  @apply grid grid-cols-2 gap-3;
}

.share-platform-button {
  @apply flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-transparent transition-all duration-200 text-white font-medium;
}

.share-platform-button:hover {
  @apply transform scale-105 shadow-lg;
}

.share-wechat {
  background-color: #07C160;
}

.share-weibo {
  background-color: #E6162D;
}

.share-qq {
  background-color: #12B7F5;
}

.share-twitter {
  background-color: #1DA1F2;
}

.share-facebook {
  background-color: #1877F2;
}

.share-linkedin {
  background-color: #0A66C2;
}

.copy-link-section {
  @apply space-y-2;
}

.copy-link-input {
  @apply flex gap-2;
}

.link-input {
  @apply flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600;
}

.copy-button {
  @apply flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
}

.copy-button.copied {
  @apply bg-green-50 border-green-300 text-green-700;
}

.qr-code-section {
  @apply space-y-4;
}

.qr-toggle-button {
  @apply flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors;
}

.qr-code-container {
  @apply flex flex-col items-center space-y-2;
}

.qr-code-image {
  @apply w-32 h-32 border border-gray-200 rounded-lg;
}

.qr-code-text {
  @apply text-xs text-gray-500 text-center;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .share-menu {
    @apply mx-2;
  }
  
  .share-header {
    @apply p-4;
  }
  
  .share-content {
    @apply p-4;
  }
  
  .share-buttons {
    @apply grid-cols-1;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .share-menu {
    @apply bg-gray-800;
  }
  
  .share-header {
    @apply border-gray-700;
  }
  
  .share-title {
    @apply text-gray-100;
  }
  
  .share-description {
    @apply text-gray-300;
  }
  
  .link-input {
    @apply bg-gray-700 border-gray-600 text-gray-200;
  }
  
  .copy-button {
    @apply bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600;
  }
  
  .qr-toggle-button {
    @apply bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600;
  }
}
</style>