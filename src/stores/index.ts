import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 类型定义
export interface CropBox {
  x: number // 裁剪框左上角X坐标
  y: number // 裁剪框左上角Y坐标
  width: number // 裁剪框宽度
  height: number // 裁剪框高度
}

export interface Parameters {
  borderWidth: number // 边框粗细 (px)
  borderColor: string // 边框颜色
}

export interface ImageData {
  file: File | null
  url: string | null
  width: number
  height: number
}

export interface FilterConfig {
  name: string
  displayName: string
  cssFilter: string
}

export interface GridConfig {
  rows: number
  cols: number
  total: number
}

export type GridSize = '2x2' | '3x3' | '4x4' | '5x5'
export type FilterType = 'none' | 'grayscale' | 'vintage_film' | 'cinema_bw' | 'vivid' | 'warm_tone' | 'cool_tone' | 'dreamy_blur' | 'neon_glow' | 'japanese_fresh' | 'urban_night' | 'soft_vintage'

// 滤镜配置
export const filterConfigs: Record<FilterType, FilterConfig> = {
  none: { name: 'none', displayName: '无滤镜', cssFilter: 'none' },
  grayscale: { name: 'grayscale', displayName: '黑白', cssFilter: 'grayscale(100%)' },
  vintage_film: { name: 'vintage_film', displayName: '复古胶片', cssFilter: 'sepia(40%) contrast(1.2) brightness(0.9) saturate(0.8)' },
  cinema_bw: { name: 'cinema_bw', displayName: '电影黑白', cssFilter: 'grayscale(100%) contrast(1.3) brightness(1.1)' },
  vivid: { name: 'vivid', displayName: '鲜艳增强', cssFilter: 'saturate(1.8) contrast(1.3) brightness(1.05)' },
  warm_tone: { name: 'warm_tone', displayName: '暖色调', cssFilter: 'sepia(25%) saturate(1.2) brightness(1.1) hue-rotate(10deg)' },
  cool_tone: { name: 'cool_tone', displayName: '冷色调', cssFilter: 'hue-rotate(200deg) saturate(1.1) contrast(1.1) brightness(0.95)' },
  dreamy_blur: { name: 'dreamy_blur', displayName: '梦幻模糊', cssFilter: 'blur(1px) saturate(1.3) brightness(1.1) contrast(0.9)' },
  neon_glow: { name: 'neon_glow', displayName: '霓虹效果', cssFilter: 'saturate(2) contrast(1.4) brightness(1.2) hue-rotate(300deg)' },
  japanese_fresh: { name: 'japanese_fresh', displayName: '日系清新', cssFilter: 'saturate(0.8) brightness(1.15) contrast(0.95) hue-rotate(5deg)' },
  urban_night: { name: 'urban_night', displayName: '都市夜景', cssFilter: 'hue-rotate(240deg) saturate(1.5) contrast(1.3) brightness(0.8)' },
  soft_vintage: { name: 'soft_vintage', displayName: '柔和怀旧', cssFilter: 'sepia(30%) brightness(1.1) contrast(0.9)' }
}

// 网格配置
export const gridConfigs: Record<GridSize, GridConfig> = {
  '2x2': { rows: 2, cols: 2, total: 4 },
  '3x3': { rows: 3, cols: 3, total: 9 },
  '4x4': { rows: 4, cols: 4, total: 16 },
  '5x5': { rows: 5, cols: 5, total: 25 }
}

export const usePicCutStore = defineStore('piccut', () => {
  // 网格配置
  const gridSize = ref<GridSize>('3x3')
  
  // 裁剪框配置
  const cropBox = ref<CropBox>({
    x: 50,
    y: 50,
    width: 300,
    height: 300
  })
  
  // 基础参数
  const parameters = ref<Parameters>({
    borderWidth: 3,
    borderColor: '#FFFFFF'
  })
  
  // 滤镜效果
  const filter = ref<FilterType>('none')
  
  // 图片数据
  const image = ref<ImageData>({
    file: null,
    url: null,
    width: 0,
    height: 0
  })
  
  // 裁剪结果
  const croppedImages = ref<string[]>([])
  
  // 计算属性
  const currentGridConfig = computed(() => gridConfigs[gridSize.value])
  const currentFilterConfig = computed(() => filterConfigs[filter.value])
  const hasImage = computed(() => image.value.url !== null && image.value.url !== '')
  
  // Actions
  const setGridSize = (size: GridSize) => {
    gridSize.value = size
  }
  
  const updateCropBox = (box: Partial<CropBox>) => {
    cropBox.value = { ...cropBox.value, ...box }
  }
  
  const updateParameters = (params: Partial<Parameters>) => {
    console.log('🔧 Store updateParameters called with:', params)
    console.log('🔧 Current parameters before update:', JSON.stringify(parameters.value))
    
    parameters.value = { ...parameters.value, ...params }
    
    console.log('🔧 Parameters after update:', JSON.stringify(parameters.value))
    console.log('🔧 Parameter types after update:', {
      borderWidth: typeof parameters.value.borderWidth,
      borderColor: typeof parameters.value.borderColor
    })
  }
  
  const setFilter = (filterType: FilterType) => {
    filter.value = filterType
  }
  
  const setImage = (imageData: Partial<ImageData>) => {
    image.value = { ...image.value, ...imageData }
  }
  
  const setCroppedImages = (images: string[]) => {
    croppedImages.value = images
  }
  
  const resetState = () => {
    gridSize.value = '3x3'
    cropBox.value = { x: 50, y: 50, width: 300, height: 300 }
    parameters.value = { borderWidth: 3, borderColor: '#FFFFFF' }
    filter.value = 'none'
    image.value = { file: null, url: null, width: 0, height: 0 }
    croppedImages.value = []
  }
  
  return {
    // State
    gridSize,
    cropBox,
    parameters,
    filter,
    image,
    croppedImages,
    
    // Computed
    currentGridConfig,
    currentFilterConfig,
    hasImage,
    
    // Actions
    setGridSize,
    updateCropBox,
    updateParameters,
    setFilter,
    setImage,
    setCroppedImages,
    resetState
  }
})