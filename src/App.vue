<template>
  <ErrorBoundary @error="handleGlobalError">
    <router-view />
    
    <!-- 错误详情模态框 -->
    <ErrorModal 
      :is-open="errorHandler.isErrorModalOpen.value"
      :error="errorHandler.currentError.value"
      @close="errorHandler.closeErrorDetails"
    />
    
    <!-- 通知组件 -->
     <Toaster 
       position="top-right"
       :duration="4000"
       :close-button="true"
       rich-colors
     />
     
     <!-- PWA 提示组件 -->
     <PWAPrompt :auto-show="true" :show-delay="5000" />
   </ErrorBoundary>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import PWAPrompt from '@/components/PWAPrompt.vue'
import { globalErrorHandler } from '@/composables/useErrorHandler'
import { useSEO } from '@/composables/useSEO'
import { usePWA } from '@/composables/usePWA'

const errorHandler = globalErrorHandler
const { autoSetSEO } = useSEO()
const { isInstallable, isUpdateAvailable, installApp, applyUpdate } = usePWA()

// 处理全局错误
const handleGlobalError = (error: Error, errorInfo: any) => {
  errorHandler.handleError(error, errorInfo, false) // 不显示 toast，因为 ErrorBoundary 会处理
}

// 初始化SEO
autoSetSEO()
</script>