<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { usePicCutStore, type GridSize, type FilterType } from '@/stores'
import { useImageUpload } from '@/composables/useImageUpload'
import { useImageProcessor } from '@/composables/useImageProcessor'
import { useCropBoxMobile } from '@/composables/useCropBoxMobile'
import { useCropBoxDesktop } from '@/composables/useCropBoxDesktop'
import { Upload, Download, X, Loader2, ChevronDown, ChevronUp, Grid3x3, Settings, Palette } from 'lucide-vue-next'

const store = usePicCutStore()
const { isUploading, uploadError, handleFileSelect, handleDrop, handleDragOver, clearImage } = useImageUpload()
const { isProcessing, processingProgress, processingStatus, downloadCompletePuzzle } = useImageProcessor()
// 手机端裁剪框
const {
  isDragging: isDraggingMobile,
  isResizing: isResizingMobile,
  isActive: isActiveMobile,
  cropBoxStyle: cropBoxStyleMobile,
  cropBoxElement: cropBoxElementMobile,
  startDrag: startDragMobile,
  startResize: startResizeMobile,
  adjustCropBoxToImage: adjustCropBoxToImageMobile,
  getContainerSize: getContainerSizeMobile
} = useCropBoxMobile()

// 桌面端裁剪框
const {
  isDragging: isDraggingDesktop,
  isResizing: isResizingDesktop,
  isActive: isActiveDesktop,
  cropBoxStyle: cropBoxStyleDesktop,
  cropBoxElement: cropBoxElementDesktop,
  startDrag: startDragDesktop,
  startResize: startResizeDesktop,
  adjustCropBoxToImage: adjustCropBoxToImageDesktop,
  getContainerSize: getContainerSizeDesktop
} = useCropBoxDesktop()
const fileInputRef = ref<HTMLInputElement>()

// 折叠状态控制
const isGridExpanded = ref(false)
const isParametersExpanded = ref(false)
const isFiltersExpanded = ref(false)
const isMobile = ref(false)

// 切换函数
const toggleGridExpanded = () => {
  isGridExpanded.value = !isGridExpanded.value
}

const toggleParametersExpanded = () => {
  isParametersExpanded.value = !isParametersExpanded.value
}

const toggleFiltersExpanded = () => {
  isFiltersExpanded.value = !isFiltersExpanded.value
}

// 检测屏幕尺寸
const checkScreenSize = () => {
  isMobile.value = window.innerWidth < 768
}



// 触发文件选择
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

// 监听图片变化，自动调整裁剪框
watch(() => store.hasImage, (hasImage) => {
  if (hasImage) {
    // 图片上传后自动显示裁剪区域
    setTimeout(() => {
      adjustCropBoxToImageMobile()
      adjustCropBoxToImageDesktop()
    }, 100)
  }
})

// 监听参数变化，验证响应式更新
watch(() => store.parameters, (newParams, oldParams) => {
  console.log('🔄 Vue watch - 参数发生变化')
  console.log('🔄 Vue watch - 旧参数:', oldParams)
  console.log('🔄 Vue watch - 新参数:', newParams)
  console.log('🔄 Vue watch - 参数类型检查:', {
    borderWidth: typeof newParams.borderWidth + ' = ' + newParams.borderWidth,
    borderColor: typeof newParams.borderColor + ' = ' + newParams.borderColor
  })
}, { deep: true })

watch(() => store.parameters.borderWidth, (newBorderWidth, oldBorderWidth) => {
  console.log('🔄 Vue watch - borderWidth变化:', { old: oldBorderWidth, new: newBorderWidth, type: typeof newBorderWidth })
})



watch(() => store.parameters.borderColor, (newBorderColor, oldBorderColor) => {
  console.log('🔄 Vue watch - borderColor变化:', { old: oldBorderColor, new: newBorderColor, type: typeof newBorderColor })
})

// 处理图片裁剪
const handleCropImage = async () => {
  console.log('🔄 handleCropImage - 开始裁剪', { 
    hasImage: store.hasImage, 
    cropBox: store.cropBox,
    imageUrl: store.image.url,
    imageSize: { width: store.image.width, height: store.image.height }
  })
  
  if (!store.hasImage) {
    console.warn('⚠️ handleCropImage - 没有图片，无法裁剪')
    alert('请先上传图片')
    return
  }
  
  if (!store.cropBox || store.cropBox.width <= 0 || store.cropBox.height <= 0) {
    console.warn('⚠️ handleCropImage - 裁剪框无效', store.cropBox)
    alert('裁剪框无效，请重新设置裁剪区域')
    return
  }
  
  try {
    console.log('🔄 handleCropImage - 开始调用cropImageFree')
    const { cropImageFree } = useImageProcessor()
    
    // 使用cropImageFree函数裁剪图片
    const croppedDataURL = await cropImageFree(store.cropBox)
    console.log('✅ handleCropImage - 裁剪完成，生成新图片URL')
    
    // 创建新的Image对象来获取裁剪后图片的尺寸
    const img = new Image()
    img.onload = () => {
      console.log('✅ handleCropImage - 新图片加载完成', { width: img.width, height: img.height })
      
      // 更新store中的图片数据为裁剪后的图片
      store.setImage({
        file: null, // 裁剪后的图片不再有原始文件
        url: croppedDataURL,
        width: img.width,
        height: img.height
      })
      
      // 裁剪后将裁剪框调整为覆盖整个新图片区域
      setTimeout(() => {
        console.log('🔄 handleCropImage - 调整裁剪框到新图片')
        setCropBoxToFullImage()
      }, 100)
    }
    
    img.onerror = (error) => {
      console.error('❌ handleCropImage - 新图片加载失败:', error)
      alert('裁剪后的图片加载失败，请重试')
    }
    
    img.src = croppedDataURL
  } catch (error) {
    console.error('❌ handleCropImage - 裁剪图片失败:', error)
    console.error('❌ 错误详情:', {
      message: error.message,
      stack: error.stack,
      store: {
        hasImage: store.hasImage,
        cropBox: store.cropBox,
        imageUrl: store.image.url
      }
    })
    alert(`裁剪失败：${error.message || '未知错误'}，请重试`)
  }
}

// 将裁剪框设置为保持与裁剪前相同的相对位置和大小比例
const setCropBoxToFullImage = () => {
  if (!store.hasImage) return
  
  // 根据设备类型使用对应的容器尺寸获取函数
  const containerSize = isMobile.value ? getContainerSizeMobile() : getContainerSizeDesktop()
  const imageAspectRatio = store.image.width / store.image.height
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
  
  // 裁剪后将裁剪框设置为紧贴新图片的边缘
  // 使用很小的边距确保裁剪框在图片边界内，但尽可能接近边缘
  const margin = 2 // 2px的最小边距，确保裁剪框可见且在图片内
  
  store.updateCropBox({
    x: offsetX + margin,
    y: offsetY + margin,
    width: imageDisplayWidth - margin * 2,
    height: imageDisplayHeight - margin * 2
  })
}

// 下载当前图片
const handleDownloadImage = () => {
  if (!store.hasImage) return
  
  const link = document.createElement('a')
  link.download = 'image.png'
  link.href = store.image.url!
  link.click()
}

// 计算实际边框粗细
const actualBorderWidth = computed(() => {
  if (!store.hasImage) return store.parameters.borderWidth
  
  // 获取图片显示信息来计算缩放比例
  const previewContainer = document.querySelector('.preview-container') as HTMLElement
  let containerSize = 500 // 默认容器尺寸
  
  if (previewContainer) {
    const containerRect = previewContainer.getBoundingClientRect()
    containerSize = Math.min(containerRect.width, containerRect.height)
  }
  
  // 计算图片在容器中的实际显示尺寸
  const imageAspectRatio = store.image.width / store.image.height
  const containerAspectRatio = 1 // 正方形容器
  
  let displayWidth, displayHeight
  
  if (imageAspectRatio > containerAspectRatio) {
    // 图片更宽，以容器宽度为准
    displayWidth = containerSize
    displayHeight = containerSize / imageAspectRatio
  } else {
    // 图片更高，以容器高度为准
    displayHeight = containerSize
    displayWidth = containerSize * imageAspectRatio
  }
  
  // 计算缩放比例
  let scaleRatio = 1
  
  if (store.cropBox) {
    // 如果有裁剪框，计算裁剪后的缩放比例
    const actualCropWidth = store.cropBox.width * (store.image.width / displayWidth)
    scaleRatio = actualCropWidth / store.cropBox.width
  } else {
    // 没有裁剪框时，使用整个图片的缩放比例
    scaleRatio = store.image.width / displayWidth
  }
  
  return store.parameters.borderWidth * scaleRatio
})

// 处理下载操作
const handleDownloadComplete = async () => {
  try {
    console.log('🚀 handleDownloadComplete - 开始下载操作')
    console.log('🚀 handleDownloadComplete - 当前store状态:', {
      hasImage: store.hasImage,
      gridSize: store.gridSize,
      parameters: store.parameters,
      cropBox: store.cropBox
    })
    console.log('🚀 handleDownloadComplete - 参数传递链路检查:', {
      'UI显示的borderWidth': store.parameters.borderWidth,
      'UI显示的borderColor': store.parameters.borderColor,
      '参数类型': {
        borderWidth: typeof store.parameters.borderWidth,
        borderColor: typeof store.parameters.borderColor
      }
    })
    
    await downloadCompletePuzzle()
    
    console.log('🚀 handleDownloadComplete - 下载操作完成')
  } catch (error) {
    console.error('❌ handleDownloadComplete - 下载拼图失败:', error)
    alert('下载失败，请重试')
  }
}



onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
    <!-- 头部标题 -->
    <header class="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg px-4 py-4">
      <div class="flex items-center">
        <h1 class="text-xl font-bold text-white">图片宫格生成</h1>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="flex-1 flex flex-col lg:flex-row gap-4 p-4 container-padding main-layout" :class="{ 'no-image-layout': !store.hasImage }">
      <!-- 手机版：垂直布局 -->
      <div class="lg:hidden w-full space-y-2">
        <!-- 上传区域 -->
        <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 card-padding hover:shadow-xl transition-all duration-300">
          <div v-if="!store.hasImage" 
                class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors"
                @drop="handleDrop"
                @dragover="handleDragOver"
           >
             <Upload class="w-12 h-12 text-gray-400 mx-auto mb-4" />
             <h3 class="text-lg font-medium text-gray-900 mb-2">上传图片</h3>
             <p class="text-sm text-gray-600 mb-4">支持 JPG、PNG、GIF、WebP 格式</p>
             <p class="text-xs text-gray-500 mb-4">拖拽图片到此处或点击选择文件</p>
             
             <button 
               @click="triggerFileSelect"
               :disabled="isUploading"
               class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
             >
               {{ isUploading ? '上传中...' : '选择图片' }}
             </button>
             
             <!-- 隐藏的文件输入 -->
             <input
               ref="fileInputRef"
               type="file"
               accept="image/jpeg,image/png,image/gif,image/webp"
               @change="handleFileSelect"
               class="hidden"
             />
             
             <!-- 错误提示 -->
             <div v-if="uploadError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
               <p class="text-sm text-red-600">{{ uploadError }}</p>
             </div>
           </div>
          
          <!-- 图片预览区 -->
           <div v-else class="space-y-4">
             <div class="relative bg-gray-100 rounded-lg overflow-hidden preview-container preview-container-mobile">
               <!-- 清除图片按钮 -->
               <button
                 @click="clearImage"
                 class="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 rounded-full p-1.5 shadow-md transition-all duration-200 backdrop-blur-sm"
                 title="清除图片"
               >
                 <X class="w-4 h-4" />
               </button>
               <!-- 背景图片 -->
               <img 
                 v-if="store.image.url"
                 :src="store.image.url"
                 alt="预览图片"
                 class="w-full h-full object-contain"
                 :style="{
                   filter: store.currentFilterConfig.cssFilter
                 }"
               />
               
               <!-- 裁剪框预览 -->
               <div class="absolute inset-0">
                 <!-- 裁剪框 -->
                 <div
                   ref="cropBoxElementMobile"
                   class="absolute crop-box-mobile"
                   :style="cropBoxStyleMobile"
                   @mousedown="startDragMobile"
                   @touchstart="startDragMobile"
                 >
                   <!-- 裁剪框内的网格预览（居中膨胀效果） -->
                   <div class="relative w-full h-full">
                     <!-- 网格单元格 -->
                     <div 
                       class="grid w-full h-full"
                       :style="{
                         gridTemplateColumns: `repeat(${store.currentGridConfig.cols}, 1fr)`,
                         gridTemplateRows: `repeat(${store.currentGridConfig.rows}, 1fr)`,
                         gap: '0px',
                         padding: '0px'
                       }"
                     >
                       <div
                         v-for="i in store.currentGridConfig.total"
                         :key="i"
                         class="flex items-center justify-center text-white font-bold text-sm relative"
                         style="background-color: transparent;"
                       >
                         {{ i }}
                       </div>
                     </div>
                     
                     <!-- 网格线（居中膨胀效果） -->
                     <div class="absolute inset-0 pointer-events-none">
                       <!-- 垂直网格线 -->
                       <div
                         v-for="i in store.currentGridConfig.cols - 1"
                         :key="'v' + i"
                         class="absolute top-0 bottom-0"
                         :style="{
                           left: `calc(${(i / store.currentGridConfig.cols) * 100}% - ${store.parameters.borderWidth / 2}px)`,
                           width: `${store.parameters.borderWidth}px`,
                           backgroundColor: store.parameters.borderColor
                         }"
                       ></div>
                       
                       <!-- 水平网格线 -->
                       <div
                         v-for="i in store.currentGridConfig.rows - 1"
                         :key="'h' + i"
                         class="absolute left-0 right-0"
                         :style="{
                           top: `calc(${(i / store.currentGridConfig.rows) * 100}% - ${store.parameters.borderWidth / 2}px)`,
                           height: `${store.parameters.borderWidth}px`,
                           backgroundColor: store.parameters.borderColor
                         }"
                       ></div>
                     </div>
                   </div>
                   
                   <!-- 调整手柄 -->
                   <div
                     class="absolute -top-1 -left-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-nw-resize crop-handle crop-handle-mobile shadow-lg"
                     @mousedown="(e) => startResizeMobile(e, 'nw')"
                     @touchstart="(e) => startResizeMobile(e, 'nw')"
                   ></div>
                   <div
                     class="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-ne-resize crop-handle crop-handle-mobile shadow-lg"
                     @mousedown="(e) => startResizeMobile(e, 'ne')"
                     @touchstart="(e) => startResizeMobile(e, 'ne')"
                   ></div>
                   <div
                     class="absolute -bottom-1 -left-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-sw-resize crop-handle crop-handle-mobile shadow-lg"
                     @mousedown="(e) => startResizeMobile(e, 'sw')"
                     @touchstart="(e) => startResizeMobile(e, 'sw')"
                   ></div>
                   <div
                     class="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-se-resize crop-handle crop-handle-mobile shadow-lg"
                     @mousedown="(e) => startResizeMobile(e, 'se')"
                     @touchstart="(e) => startResizeMobile(e, 'se')"
                   ></div>
                 </div>
                 
                 <!-- 遮罩层 -->
                 <div class="absolute inset-0 bg-black bg-opacity-30 pointer-events-none crop-overlay"></div>
               </div>
             </div>
             
             <!-- 像素信息显示 -->
             <div class="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
               <div class="flex items-center justify-between">
                 <span class="font-medium">原图:</span>
                 <span>{{ store.image.width }} × {{ store.image.height }}px</span>
               </div>
               <div class="flex items-center justify-between">
                 <span class="font-medium">裁剪区域:</span>
                 <span>{{ Math.round(store.cropBox.width) }} × {{ Math.round(store.cropBox.height) }}px</span>
               </div>
               <div class="flex items-center justify-between">
                 <span class="font-medium">网格:</span>
                 <span>{{ store.gridSize }}</span>
               </div>
               <div class="flex items-center justify-between">
                 <span class="font-medium">滤镜:</span>
                 <span>{{ store.currentFilterConfig.displayName }}</span>
               </div>
             </div>
           </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300">
          <!-- 处理进度 -->
          <div v-if="isProcessing" class="mb-4">
            <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{{ processingStatus }}</span>
              <span>{{ processingProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: processingProgress + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- 手机版：水平布局 -->
          <div class="flex gap-3 action-buttons-mobile">
            <!-- 裁剪按钮 -->
            <button
              @click="handleCropImage"
              :disabled="!store.hasImage"
              class="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 px-3 rounded-lg hover:from-emerald-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center gap-1 text-sm font-medium"
            >
              <X class="w-4 h-4 rotate-45" />
              裁剪
            </button>
            <!-- 下载当前图片按钮 -->
            <button 
              @click="handleDownloadImage"
              :disabled="!store.hasImage"
              class="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-3 px-3 rounded-lg hover:from-blue-600 hover:to-cyan-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center gap-1 text-sm font-medium"
            >
              <Download class="w-4 h-4" />
              下载
            </button>
            
            <!-- 下载网格拼图按钮 -->
            <button 
              @click="handleDownloadComplete"
              :disabled="!store.hasImage || isProcessing"
              class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center gap-1 text-sm font-medium"
            >
              <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
              <Download v-else class="w-4 h-4" />
              网格
            </button>
          </div>
          
          <!-- 提示信息 -->
         <div class="mt-3 text-xs text-gray-500 text-center">
           裁剪、下载图片或下载 {{ store.gridSize }} 网格拼图
         </div>
       </div>

       <!-- 网格拼图模块 -->
       <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300">
         <div class="flex items-center justify-between mb-3">
           <h3 class="text-base font-medium text-gray-800 flex items-center gap-2">
             <Grid3x3 class="w-4 h-4 text-indigo-600" />
             网格拼图
           </h3>
           <button
             @click="toggleGridExpanded"
             class="p-2 hover:bg-indigo-100 rounded-lg transition-all duration-300 transform hover:scale-110"
           >
             <ChevronDown 
               class="w-4 h-4 text-indigo-500 transition-all duration-300"
               :class="{ 'rotate-180': isGridExpanded }"
             />
           </button>
         </div>
         
         <div v-if="isGridExpanded" class="space-y-3">
           <div class="grid grid-cols-4 gap-1">
             <button
               v-for="size in ['2x2', '3x3', '4x4', '5x5']"
               :key="size"
               @click="store.setGridSize(size as GridSize)"
               :class="[
                 'py-2 px-2 rounded-lg border-2 transition-all duration-300 text-xs font-medium transform hover:scale-105 shadow-sm hover:shadow-md',
                 store.gridSize === size
                   ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-md'
                   : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
               ]"
             >
               {{ size }}
             </button>
           </div>
         </div>
       </div>

       <!-- 基础参数模块 -->
       <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300">
         <div class="flex items-center justify-between mb-3">
           <h3 class="text-base font-medium text-gray-800 flex items-center gap-2">
             <Settings class="w-4 h-4 text-purple-600" />
             基础参数
           </h3>
           <button
             @click="toggleParametersExpanded"
             class="p-2 hover:bg-purple-100 rounded-lg transition-all duration-300 transform hover:scale-110"
           >
             <ChevronDown 
               class="w-4 h-4 text-purple-500 transition-all duration-300"
               :class="{ 'rotate-180': isParametersExpanded }"
             />
           </button>
         </div>
         
         <div v-if="isParametersExpanded" class="space-y-4">
           <!-- 边框宽度 -->
           <div class="space-y-2">
             <label class="text-sm font-medium text-gray-700 flex items-center justify-between">
               边框宽度
               <span class="text-xs text-gray-500">{{ store.parameters.borderWidth }}px</span>
             </label>
             <div class="relative">
               <input
                 type="range"
                 min="1"
                 max="20"
                 step="1"
                 v-model="store.parameters.borderWidth"
                 class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
               />
             </div>
           </div>
           
           <!-- 边框颜色 -->
           <div class="space-y-2">
             <label class="text-sm font-medium text-gray-700">边框颜色</label>
             <div class="grid grid-cols-6 gap-2">
               <button
                 v-for="color in ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']"
                 :key="color"
                 @click="store.parameters.borderColor = color"
                 :class="[
                   'w-8 h-8 rounded-full border-2 transition-all duration-200 color-button',
                   store.parameters.borderColor === color
                     ? 'border-gray-800 scale-110 shadow-md'
                     : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                 ]"
                 :style="{ backgroundColor: color }"
                 :title="color"
               ></button>
             </div>
           </div>
           

         </div>
       </div>

       <!-- 滤镜效果模块 -->
       <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300">
         <div class="flex items-center justify-between mb-3">
           <h3 class="text-base font-medium text-gray-800 flex items-center gap-2">
             <Palette class="w-4 h-4 text-pink-600" />
             滤镜效果
           </h3>
           <button
             @click="toggleFiltersExpanded"
             class="p-2 hover:bg-pink-100 rounded-lg transition-all duration-300 transform hover:scale-110"
           >
             <ChevronDown 
               class="w-4 h-4 text-pink-500 transition-all duration-300"
               :class="{ 'rotate-180': isFiltersExpanded }"
             />
           </button>
         </div>
         
         <div v-if="isFiltersExpanded" class="space-y-3">
           <div class="grid grid-cols-2 gap-2">
             <button
               v-for="(config, key) in {
                 none: { name: 'none', displayName: '无滤镜' },
                 grayscale: { name: 'grayscale', displayName: '黑白' },
                 vintage_film: { name: 'vintage_film', displayName: '复古胶片' },
                 cinema_bw: { name: 'cinema_bw', displayName: '电影黑白' },
                 vivid: { name: 'vivid', displayName: '鲜艳增强' },
                 warm_tone: { name: 'warm_tone', displayName: '暖色调' },
                 cool_tone: { name: 'cool_tone', displayName: '冷色调' },
                 dreamy_blur: { name: 'dreamy_blur', displayName: '梦幻模糊' },
                 neon_glow: { name: 'neon_glow', displayName: '霓虹效果' },
                 japanese_fresh: { name: 'japanese_fresh', displayName: '日系清新' },
                 urban_night: { name: 'urban_night', displayName: '都市夜景' },
                 soft_vintage: { name: 'soft_vintage', displayName: '柔和怀旧' }
               }"
               :key="key"
               @click="store.setFilter(key as FilterType)"
               :class="[
                 'p-2 rounded-lg border-2 transition-all duration-300 text-xs font-medium filter-button transform hover:scale-105 shadow-sm hover:shadow-md',
                 store.filter === key
                   ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-md'
                   : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
               ]"
             >
               {{ config.displayName }}
             </button>
           </div>
         </div>
       </div>
     </div>

     <!-- 左侧控制面板（桌面版） -->
     <div class="hidden lg:block w-full lg:w-80 space-y-4 lg:space-y-4 md:space-y-3 space-y-2 control-panel">


        <!-- 网格拼图面板 -->
        <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300">
          <h2 class="text-sm font-medium text-indigo-700 mb-3 flex items-center gap-2">🧩 网格拼图</h2>
          
          <!-- 网格拼图操作 -->
          <div class="space-y-3 lg:space-y-3 md:space-y-2 space-y-1">
            <div>
              <label class="text-xs text-gray-600 mb-2 block">选择网格大小</label>
              <!-- 桌面版：2列布局 -->
              <div class="hidden md:grid grid-cols-2 gap-2 grid-buttons">
                <button
                  v-for="size in ['2x2', '3x3', '4x4', '5x5']"
                  :key="size"
                  @click="store.setGridSize(size as GridSize)"
                  :class="[
                    'py-2 px-3 text-sm rounded-lg border-2 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md',
                    store.gridSize === size
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
                  ]"
                >
                  {{ size }}
                </button>
              </div>
              <!-- 手机版：4列布局 -->
              <div class="md:hidden grid grid-cols-4 gap-1 grid-buttons-mobile">
                <button
                  v-for="size in ['2x2', '3x3', '4x4', '5x5']"
                  :key="size"
                  @click="store.setGridSize(size as GridSize)"
                  :class="[
                    'py-1 px-2 text-xs rounded-md border transition-colors',
                    store.gridSize === size
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  ]"
                >
                  {{ size }}
                </button>
              </div>
            </div>
            <div class="text-xs text-gray-500 text-center">
               在选中区域内生成网格拼图
             </div>
           </div>
         </div>

        <!-- 基础参数调整 -->
        <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
          <!-- 桌面版标题 -->
          <div class="p-4 pb-0">
            <h2 class="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">🎛️ 基础参数</h2>
          </div>
          
          <!-- 参数内容 -->
          <div class="transition-all duration-300 ease-in-out overflow-hidden">
            <div class="p-4 md:pt-0">
              <div class="space-y-4 lg:space-y-4 md:space-y-3 space-y-2">
            <!-- 边框粗细 -->
            <div>
              <label class="text-xs text-gray-600 mb-2 block">
                边框粗细: {{ store.parameters.borderWidth }}px
                <span v-if="store.hasImage && actualBorderWidth !== store.parameters.borderWidth" class="text-gray-500">
                  (实际: {{ actualBorderWidth.toFixed(1) }}px)
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                v-model.number="store.parameters.borderWidth"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            
            <!-- 边框颜色 -->
            <div>
              <label class="text-xs text-gray-600 mb-2 block">边框颜色</label>
              <!-- 预设颜色按钮 -->
              <div class="grid grid-cols-6 gap-2 mb-3 lg:gap-2 gap-1 color-preset-buttons">
                <button
                  v-for="color in ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']"
                  :key="color"
                  @click="store.updateParameters({ borderColor: color })"
                  :class="[
                    'w-8 h-8 rounded-md border-2 transition-all',
                    store.parameters.borderColor === color
                      ? 'border-indigo-500 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  ]"
                  :style="{ backgroundColor: color }"
                  :title="color"
                ></button>
              </div>
              <!-- 自定义颜色选择器 -->
              <input
                type="color"
                v-model="store.parameters.borderColor"
                class="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
              />
            </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 滤镜效果 -->
        <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
          <!-- 桌面版标题 -->
          <div class="p-4 pb-0">
            <h2 class="text-sm font-medium text-pink-700 mb-3 flex items-center gap-2">🎨 滤镜效果</h2>
          </div>
          
          <!-- 滤镜内容 -->
          <div class="transition-all duration-300 ease-in-out overflow-hidden">
            <div class="p-4 md:pt-0">
              <div class="grid grid-cols-3 gap-1.5 md:gap-2 filter-buttons">
            <button
              v-for="(config, key) in {
                none: { name: 'none', displayName: '无滤镜' },
                grayscale: { name: 'grayscale', displayName: '黑白' },
                vintage_film: { name: 'vintage_film', displayName: '复古胶片' },
                cinema_bw: { name: 'cinema_bw', displayName: '电影黑白' },
                vivid: { name: 'vivid', displayName: '鲜艳增强' },
                warm_tone: { name: 'warm_tone', displayName: '暖色调' },
                cool_tone: { name: 'cool_tone', displayName: '冷色调' },
                dreamy_blur: { name: 'dreamy_blur', displayName: '梦幻模糊' },
                neon_glow: { name: 'neon_glow', displayName: '霓虹效果' },
                japanese_fresh: { name: 'japanese_fresh', displayName: '日系清新' },
                urban_night: { name: 'urban_night', displayName: '都市夜景' },
                soft_vintage: { name: 'soft_vintage', displayName: '柔和怀旧' }
              }"
              :key="key"
              @click="store.setFilter(key as FilterType)"
              :class="[
                'py-2 px-3 text-xs rounded-lg border-2 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md',
                store.filter === key
                  ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-md'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
              ]"
            >
              {{ config.displayName }}
            </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧预览区域（桌面版） -->
      <div class="hidden lg:block flex-1 preview-area" :class="store.hasImage ? 'space-y-4' : 'space-y-1'">
        <!-- 图片上传区 -->
        <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 card-padding hover:shadow-xl transition-all duration-300">
          <div v-if="!store.hasImage" 
                class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors"
                @drop="handleDrop"
                @dragover="handleDragOver"
           >
             <Upload class="w-12 h-12 text-gray-400 mx-auto mb-4" />
             <h3 class="text-lg font-medium text-gray-900 mb-2">上传图片</h3>
             <p class="text-sm text-gray-600 mb-4">支持 JPG、PNG、GIF、WebP 格式</p>
             <p class="text-xs text-gray-500 mb-4">拖拽图片到此处或点击选择文件</p>
             
             <button 
               @click="triggerFileSelect"
               :disabled="isUploading"
               class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
             >
               {{ isUploading ? '上传中...' : '选择图片' }}
             </button>
             
             <!-- 隐藏的文件输入 -->
             <input
               ref="fileInputRef"
               type="file"
               accept="image/jpeg,image/png,image/gif,image/webp"
               @change="handleFileSelect"
               class="hidden"
             />
             
             <!-- 错误提示 -->
             <div v-if="uploadError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
               <p class="text-sm text-red-600">{{ uploadError }}</p>
             </div>
           </div>
          
          <!-- 图片预览区 -->
           <div v-else class="space-y-4">

             
             <div class="relative bg-gray-100 rounded-lg overflow-hidden preview-container preview-container-desktop">
               <!-- 清除图片按钮 -->
               <button
                 @click="clearImage"
                 class="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 rounded-full p-1.5 shadow-md transition-all duration-200 backdrop-blur-sm"
                 title="清除图片"
               >
                 <X class="w-4 h-4" />
               </button>
               <!-- 背景图片 -->
               <img 
                 v-if="store.image.url"
                 :src="store.image.url"
                 alt="预览图片"
                 class="w-full h-full object-contain"
                 :style="{
                   filter: store.currentFilterConfig.cssFilter
                 }"
               />
               
               <!-- 裁剪框预览 -->
               <div class="absolute inset-0">
                 <!-- 裁剪框 -->
                 <div
                   ref="cropBoxElementDesktop"
                   class="absolute crop-box-desktop"
                   :style="cropBoxStyleDesktop"
                   @mousedown="startDragDesktop"
                   @touchstart="startDragDesktop"
                 >
                   <!-- 裁剪框内的网格预览（居中膨胀效果） -->
                   <div class="relative w-full h-full">
                     <!-- 网格单元格 -->
                     <div 
                       class="grid w-full h-full"
                       :style="{
                         gridTemplateColumns: `repeat(${store.currentGridConfig.cols}, 1fr)`,
                         gridTemplateRows: `repeat(${store.currentGridConfig.rows}, 1fr)`,
                         gap: '0px',
                         padding: '0px'
                       }"
                     >
                       <div
                         v-for="i in store.currentGridConfig.total"
                         :key="i"
                         class="flex items-center justify-center text-white font-bold text-sm relative"
                         style="background-color: transparent;"
                       >
                         {{ i }}
                       </div>
                     </div>
                     
                     <!-- 网格线（居中膨胀效果） -->
                     <div class="absolute inset-0 pointer-events-none">
                       <!-- 垂直网格线 -->
                       <div
                         v-for="i in store.currentGridConfig.cols - 1"
                         :key="'v' + i"
                         class="absolute top-0 bottom-0"
                         :style="{
                           left: `calc(${(i / store.currentGridConfig.cols) * 100}% - ${store.parameters.borderWidth / 2}px)`,
                           width: `${store.parameters.borderWidth}px`,
                           backgroundColor: store.parameters.borderColor
                         }"
                       ></div>
                       
                       <!-- 水平网格线 -->
                       <div
                         v-for="i in store.currentGridConfig.rows - 1"
                         :key="'h' + i"
                         class="absolute left-0 right-0"
                         :style="{
                           top: `calc(${(i / store.currentGridConfig.rows) * 100}% - ${store.parameters.borderWidth / 2}px)`,
                           height: `${store.parameters.borderWidth}px`,
                           backgroundColor: store.parameters.borderColor
                         }"
                       ></div>
                     </div>
                   </div>
                   
                   <!-- 调整手柄 -->
                   <div
                     class="absolute -top-1 -left-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-nw-resize crop-handle crop-handle-desktop shadow-lg"
                     @mousedown="(e) => startResizeDesktop(e, 'nw')"
                     @touchstart="(e) => startResizeDesktop(e, 'nw')"
                   ></div>
                   <div
                     class="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-ne-resize crop-handle crop-handle-desktop shadow-lg"
                     @mousedown="(e) => startResizeDesktop(e, 'ne')"
                     @touchstart="(e) => startResizeDesktop(e, 'ne')"
                   ></div>
                   <div
                     class="absolute -bottom-1 -left-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-sw-resize crop-handle crop-handle-desktop shadow-lg"
                     @mousedown="(e) => startResizeDesktop(e, 'sw')"
                     @touchstart="(e) => startResizeDesktop(e, 'sw')"
                   ></div>
                   <div
                     class="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 border-2 border-white cursor-se-resize crop-handle crop-handle-desktop shadow-lg"
                     @mousedown="(e) => startResizeDesktop(e, 'se')"
                     @touchstart="(e) => startResizeDesktop(e, 'se')"
                   ></div>
                 </div>
                 
                 <!-- 遮罩层 -->
                 <div class="absolute inset-0 bg-black bg-opacity-30 pointer-events-none crop-overlay"></div>
               </div>
             </div>
             
             <!-- 像素信息显示 -->
             <div class="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
               <div class="flex items-center justify-between">
                 <span class="font-medium">原图:</span>
                 <span>{{ store.image.width }} × {{ store.image.height }}px</span>
               </div>
               <div class="flex items-center justify-between">
                 <span class="font-medium">裁剪区域:</span>
                 <span>{{ Math.round(store.cropBox.width) }} × {{ Math.round(store.cropBox.height) }}px</span>
               </div>
               <div class="flex items-center justify-between">
                 <span class="font-medium">网格:</span>
                 <span>{{ store.gridSize }}</span>
               </div>
               <div class="flex items-center justify-between">
                 <span class="font-medium">滤镜:</span>
                 <span>{{ store.currentFilterConfig.displayName }}</span>
               </div>
             </div>
           </div>
        </div>

        <!-- 操作按钮区 -->
         <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
           <!-- 处理进度 -->
           <div v-if="isProcessing" class="mb-4">
             <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
               <span>{{ processingStatus }}</span>
               <span>{{ processingProgress }}%</span>
             </div>
             <div class="w-full bg-gray-200 rounded-full h-2">
               <div 
                 class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                 :style="{ width: processingProgress + '%' }"
               ></div>
             </div>
           </div>
           
           <!-- 桌面版：垂直布局 -->
           <div class="hidden md:flex flex-col gap-3 action-buttons">
             <!-- 裁剪按钮 -->
             <button
               @click="handleCropImage"
               :disabled="!store.hasImage"
               class="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
             >
               <X class="w-4 h-4 rotate-45" />
               裁剪为选中区域
             </button>
             <!-- 下载当前图片按钮 -->
             <button 
               @click="handleDownloadImage"
               :disabled="!store.hasImage"
               class="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
             >
               <Download class="w-4 h-4" />
               下载当前图片
             </button>
             
             <!-- 下载网格拼图按钮 -->
             <button 
               @click="handleDownloadComplete"
               :disabled="!store.hasImage || isProcessing"
               class="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
             >
               <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
               <Download v-else class="w-4 h-4" />
               下载网格拼图
             </button>
           </div>
           
           <!-- 手机版：水平布局 -->
           <div class="md:hidden flex gap-3 action-buttons-mobile">
             <!-- 裁剪按钮 -->
             <button
               @click="handleCropImage"
               :disabled="!store.hasImage"
               class="flex-1 bg-green-600 text-white py-3 px-3 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 text-sm font-medium"
             >
               <X class="w-4 h-4 rotate-45" />
               裁剪
             </button>
             <!-- 下载当前图片按钮 -->
             <button 
               @click="handleDownloadImage"
               :disabled="!store.hasImage"
               class="flex-1 bg-blue-600 text-white py-3 px-3 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 text-sm font-medium"
             >
               <Download class="w-4 h-4" />
               下载
             </button>
             
             <!-- 下载网格拼图按钮 -->
             <button 
               @click="handleDownloadComplete"
               :disabled="!store.hasImage || isProcessing"
               class="flex-1 bg-indigo-600 text-white py-3 px-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1 text-sm font-medium"
             >
               <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
               <Download v-else class="w-4 h-4" />
               网格
             </button>
           </div>
           
           <!-- 提示信息 -->
           <div class="mt-3 text-xs text-gray-500 text-center">
             <span class="hidden md:inline">下载当前显示的图片或下载 {{ store.gridSize }} 网格拼图</span>
             <span class="md:hidden">裁剪、下载图片或下载 {{ store.gridSize }} 网格拼图</span>
           </div>
         </div>
      </div>
    </main>
    

  </div>
</template>

<style scoped>
/* 预览容器样式 */
.preview-container {
  width: 100%;
  max-width: 500px;
  aspect-ratio: 1;
  margin: 0 auto;
}

/* 裁剪框手柄基础样式 */
.crop-handle {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.8);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  pointer-events: auto;
  cursor: pointer;
}

.crop-handle:hover {
  background: linear-gradient(135deg, #6366F1 0%, #7C3AED 100%);
  transform: scale(1.15);
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.9);
}

.crop-handle:active {
  transform: scale(0.9);
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.8);
}

/* 裁剪框基础样式 */
.crop-box {
  z-index: 999;
  pointer-events: auto;
  cursor: move;
}

/* 手机端裁剪框样式 */
.crop-box-mobile {
  z-index: 999;
  pointer-events: auto;
  cursor: move;
  border: 2px solid #4F46E5;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
}

/* 桌面端裁剪框样式 */
.crop-box-desktop {
  z-index: 999;
  pointer-events: auto;
  cursor: move;
  border: 2px solid #4F46E5;
  background: transparent;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
}

/* 自定义滑块样式 */
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #4F46E5;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.slider::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  background: #4F46E5;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

/* 桌面端优化 */
@media (min-width: 1025px) {
  /* 裁剪框手柄桌面端优化 */
  .crop-handle-desktop {
    width: 20px;
    height: 20px;
    z-index: 1000;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: auto;
    border-radius: 50%;
  }
  
  .crop-handle-desktop:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    background-color: #6366f1;
  }
  
  .crop-handle-desktop:active {
    transform: scale(0.95);
    background-color: #4f46e5;
  }
  
  /* 裁剪框桌面端优化 */
  .crop-box-desktop {
    cursor: move;
    z-index: 999;
    pointer-events: auto;
  }
  
  .crop-box-desktop:hover {
    border-color: #6366f1;
  }
  
  /* 拖拽区域桌面端优化 */
  .drag-area-desktop {
    cursor: move;
    -webkit-user-select: none;
    user-select: none;
  }
}

/* 移动端触摸优化 */
@media (max-width: 1024px) {
  /* 增大触摸目标 */
  .slider::-webkit-slider-thumb {
    height: 28px;
    width: 28px;
  }
  
  .slider::-moz-range-thumb {
    height: 28px;
    width: 28px;
  }
  
  /* 按钮触摸优化 */
  button {
    min-height: 44px;
    touch-action: manipulation;
  }
  
  /* 裁剪框手柄触摸优化 */
  .crop-handle-mobile {
    width: 24px !important;
    height: 24px !important;
    touch-action: none;
    transition: all 0.2s ease;
    z-index: 1000;
    pointer-events: auto;
    border-radius: 50%;
  }
  
  .crop-handle-mobile:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4) !important;
  }
  
  .crop-handle-mobile:active {
    transform: scale(0.95);
  }
  
  /* 裁剪框移动端优化 */
  .crop-box-mobile {
    cursor: move;
    z-index: 999;
    pointer-events: auto;
  }
  
  /* 拖拽区域触摸优化 */
  .drag-area-mobile {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}

/* 小屏幕布局优化 */
@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  /* 没有图片时的特殊布局 */
  .main-layout.no-image-layout {
    gap: 0.25rem;
  }
  
  /* 移动端预览容器尺寸调整 */
  .preview-container {
    max-width: min(90vw, 450px);
  }
  
  .control-panel {
    width: 100%;
    order: 2;
  }
  
  .preview-area {
    order: 1;
    margin-bottom: 0;
  }
  
  /* 没有图片时减少上传区域的内边距 */
  .preview-area .card-padding {
    padding: 1rem;
  }
  
  /* 没有图片时减少预览区域的space-y间距 */
  .no-image-layout .preview-area {
    gap: 0.25rem;
  }
  
  .no-image-layout .preview-area > div {
    margin-bottom: 0.25rem;
  }
  
  .no-image-layout .preview-area > div:last-child {
    margin-bottom: 0;
  }
  
  /* 控制面板间距优化 */
  .control-panel > div {
    margin-bottom: 0.75rem;
  }
  
  .control-panel > div:last-child {
    margin-bottom: 0;
  }
  
  /* 网格按钮在小屏幕上单列显示 */
  .grid-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
  
  /* 滤镜按钮在小屏幕上调整 */
  .filter-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.375rem;
  }
  
  /* 按钮高度优化 */
  button {
    min-height: 36px;
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
  
  /* 卡片内边距优化 */
  .bg-white {
    padding: 0.75rem;
  }
  
  /* 标题字体大小优化 */
  h2 {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  h3 {
    font-size: 0.75rem;
    margin-bottom: 0.375rem;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .container-padding {
    padding: 0.5rem;
  }
  
  .card-padding {
    padding: 0.75rem;
  }
  
  .main-layout {
    gap: 0.375rem;
  }
  
  /* 没有图片时进一步减少间距 */
  .main-layout.no-image-layout {
    gap: 0.125rem;
  }
  
  .no-image-layout .preview-area {
    gap: 0.125rem;
  }
  
  .no-image-layout .preview-area > div {
    margin-bottom: 0.125rem;
  }
  
  .button-text {
    font-size: 0.75rem;
  }
  
  /* 超小屏幕预览容器尺寸 */
  .preview-container {
    max-width: min(95vw, 360px);
  }
  
  /* 操作按钮在超小屏幕上垂直排列 */
  .action-buttons {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .action-buttons button {
    width: 100%;
    min-height: 32px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  /* 控制面板更紧凑 */
  .control-panel > div {
    margin-bottom: 0.5rem;
  }
  
  /* 卡片内边距进一步优化 */
  .bg-white {
    padding: 0.5rem;
  }
  
  /* 网格和滤镜按钮更紧凑 */
  .grid-buttons,
  .filter-buttons {
    gap: 0.25rem;
  }
  
  .grid-buttons button,
  .filter-buttons button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    min-height: 28px;
  }
  
  /* 颜色按钮更紧凑 */
  .color-preset-buttons {
    gap: 0.25rem;
  }
  
  .color-preset-buttons button {
    width: 24px;
    height: 24px;
    min-height: 24px;
  }
  
  /* 滑块标签字体优化 */
  label {
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }
  
  /* 标题进一步优化 */
  h2 {
    font-size: 0.8125rem;
    margin-bottom: 0.375rem;
  }
  
  h3 {
    font-size: 0.6875rem;
    margin-bottom: 0.25rem;
  }
  
  /* 提示文字优化 */
  .text-xs {
    font-size: 0.6875rem;
  }
}

/* 防止页面缩放 */
@media (max-width: 1024px) {
  * {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
}

/* 滚动优化 */
.scroll-container {
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* 焦点状态优化 */
button:focus-visible {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}

input:focus-visible {
  outline: 2px solid #4F46E5;
  outline-offset: 2px;
}

/* 加载状态动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 拖拽状态视觉反馈 */
.dragging {
  cursor: grabbing !important;
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.resizing {
  box-shadow: 0 0 0 2px #4F46E5, 0 8px 25px rgba(79, 70, 229, 0.2);
}

/* 裁剪框样式 */
.crop-box {
  border: 2px solid #4F46E5;
  background: transparent;
  z-index: 999;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
  pointer-events: auto;
  cursor: move;
}

.crop-handle {
  z-index: 1000;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
}

.crop-overlay {
  z-index: 998;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

/* 触摸反馈 */
@media (hover: none) and (pointer: coarse) {
  button:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
  
  .crop-handle:active {
    transform: scale(1.2);
    transition: transform 0.1s ease;
  }
}

/* 没有图片时的布局优化 */
.no-image-layout {
  gap: 1rem;
}

@media (max-width: 768px) {
  .no-image-layout {
    gap: 0.5rem;
  }
  
  .no-image-layout .preview-area {
    margin-bottom: 0;
  }
}

@media (max-width: 480px) {
  .no-image-layout {
    gap: 0.375rem;
  }
}
</style>
