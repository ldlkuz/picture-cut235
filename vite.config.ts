import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import Inspector from 'unplugin-vue-dev-locator/vite'
import traeBadgePlugin from 'vite-plugin-trae-solo-badge'
import { splitVendorChunkPlugin } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  
  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    open: true,
    cors: true
  },
  
  // 预览服务器配置
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // 构建配置优化
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    
    // Terser 压缩配置
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log'] : []
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Rollup 配置
    rollupOptions: {
      output: {
        // 手动代码分割
        manualChunks: {
          // Vue 核心库
          'vue-vendor': ['vue', 'vue-router'],
          
          // UI 组件库
          'ui-vendor': ['lucide-vue-next', 'vue-sonner'],
          
          // 工具库
          'utils-vendor': ['jszip']
        },
        
        // 资源文件命名
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const fileName = path.basename(facadeModuleId, path.extname(facadeModuleId))
            return `js/${fileName}-[hash].js`
          }
          return 'js/[name]-[hash].js'
        },
        
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name || '')) {
            return `media/[name]-[hash].${ext}`
          }
          
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name || '')) {
            return `images/[name]-[hash].${ext}`
          }
          
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
            return `fonts/[name]-[hash].${ext}`
          }
          
          return `assets/[name]-[hash].${ext}`
        }
      },
      
      // 外部依赖（如果需要CDN）
      external: [],
      
      // Tree shaking 配置
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },
    
    // 资源内联阈值
    assetsInlineLimit: 4096,
    
    // CSS 代码分割
    cssCodeSplit: true,
    
    // 构建报告
    reportCompressedSize: true,
    
    // Chunk 大小警告限制
    chunkSizeWarningLimit: 1000
  },
  
  // CSS 配置
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 依赖优化
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'lucide-vue-next',
      'vue-sonner',
      'jszip'
    ],
    exclude: [
      // 排除不需要预构建的依赖
    ]
  },
  plugins: [
    vue({
      // Vue 编译优化
      template: {
        compilerOptions: {
          // 移除生产环境的注释
          comments: process.env.NODE_ENV !== 'production'
        }
      }
    }),
    
    // 开发环境插件
    ...(process.env.NODE_ENV === 'development' ? [Inspector()] : []),
    
    // 代码分割插件
    splitVendorChunkPlugin(),
    
    // Gzip 压缩
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // Brotli 压缩
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false
    }),
    
    // 构建分析（仅在分析模式下启用）
    ...(process.env.ANALYZE ? [
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ] : []),
    
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#app',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ✅ 定义 @ = src
    },
  },
})
