import { ref, computed, readonly, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'

export interface PWAInstallPrompt {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isOnline = ref(navigator.onLine)
const isInstallable = ref(false)
const isInstalled = ref(false)
const isUpdateAvailable = ref(false)
const installPrompt = ref<PWAInstallPrompt | null>(null)
const registration = ref<ServiceWorkerRegistration | null>(null)

export function usePWA() {
  /**
   * 注册 Service Worker
   */
  const registerServiceWorker = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker 不被支持')
      return false
    }

    try {
      console.log('正在注册 Service Worker...')
      
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      registration.value = reg
      console.log('Service Worker 注册成功:', reg.scope)
      
      // 监听更新
      reg.addEventListener('updatefound', () => {
        console.log('发现 Service Worker 更新')
        const newWorker = reg.installing
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('新的 Service Worker 已安装，等待激活')
              isUpdateAvailable.value = true
              
              toast.info('发现新版本', {
                description: '点击刷新以获取最新功能',
                action: {
                  label: '刷新',
                  onClick: () => {
                    applyUpdate()
                  }
                },
                duration: 10000
              })
            }
          })
        }
      })
      
      // 监听控制器变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker 控制器已更改')
        window.location.reload()
      })
      
      // 监听来自 Service Worker 的消息
      navigator.serviceWorker.addEventListener('message', (event) => {
        handleServiceWorkerMessage(event.data)
      })
      
      return true
    } catch (error) {
      console.error('Service Worker 注册失败:', error)
      return false
    }
  }

  /**
   * 处理来自 Service Worker 的消息
   */
  const handleServiceWorkerMessage = (data: any) => {
    console.log('收到 Service Worker 消息:', data)
    
    switch (data.type) {
      case 'BACKGROUND_SYNC_SUCCESS':
        toast.success('后台同步完成', {
          description: data.message
        })
        break
        
      case 'BACKGROUND_SYNC_FAILED':
        toast.error('后台同步失败', {
          description: data.message
        })
        break
        
      case 'CACHE_UPDATED':
        toast.info('缓存已更新', {
          description: '应用性能已优化'
        })
        break
    }
  }

  /**
   * 应用更新
   */
  const applyUpdate = () => {
    if (registration.value?.waiting) {
      registration.value.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  /**
   * 检查是否已安装为PWA
   */
  const checkInstallStatus = () => {
    // 检查是否在独立模式下运行
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    const isInWebAppChrome = window.matchMedia('(display-mode: minimal-ui)').matches
    
    isInstalled.value = isStandalone || isInWebAppiOS || isInWebAppChrome
    
    console.log('PWA 安装状态:', {
      isStandalone,
      isInWebAppiOS,
      isInWebAppChrome,
      isInstalled: isInstalled.value
    })
  }

  /**
   * 监听安装提示事件
   */
  const setupInstallPrompt = () => {
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('PWA 安装提示事件触发')
      event.preventDefault()
      installPrompt.value = event as any
      isInstallable.value = true
      
      // 显示安装提示
      if (!isInstalled.value) {
        toast.info('可以安装 PICCUT 应用', {
          description: '安装后可以像原生应用一样使用',
          action: {
            label: '安装',
            onClick: () => {
              installApp()
            }
          },
          duration: 8000
        })
      }
    })
    
    window.addEventListener('appinstalled', () => {
      console.log('PWA 已安装')
      isInstalled.value = true
      isInstallable.value = false
      installPrompt.value = null
      
      toast.success('应用安装成功', {
        description: 'PICCUT 已添加到您的设备'
      })
    })
  }

  /**
   * 安装应用
   */
  const installApp = async (): Promise<boolean> => {
    if (!installPrompt.value) {
      console.warn('没有可用的安装提示')
      return false
    }
    
    try {
      await installPrompt.value.prompt()
      const choiceResult = await installPrompt.value.userChoice
      
      console.log('用户安装选择:', choiceResult.outcome)
      
      if (choiceResult.outcome === 'accepted') {
        console.log('用户接受了安装')
        return true
      } else {
        console.log('用户拒绝了安装')
        return false
      }
    } catch (error) {
      console.error('安装应用失败:', error)
      return false
    } finally {
      installPrompt.value = null
      isInstallable.value = false
    }
  }

  /**
   * 监听网络状态
   */
  const setupNetworkListeners = () => {
    const updateOnlineStatus = () => {
      const wasOffline = !isOnline.value
      isOnline.value = navigator.onLine
      
      if (wasOffline && isOnline.value) {
        toast.success('网络已连接', {
          description: '您现在可以正常使用所有功能'
        })
      } else if (!isOnline.value) {
        toast.warning('网络已断开', {
          description: '您仍可以使用已缓存的功能'
        })
      }
    }
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }

  /**
   * 清理缓存
   */
  const clearCache = async (): Promise<boolean> => {
    try {
      if (registration.value) {
        const messageChannel = new MessageChannel()
        
        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              toast.success('缓存已清理', {
                description: '应用将重新加载最新内容'
              })
              resolve(true)
            } else {
              toast.error('清理缓存失败')
              resolve(false)
            }
          }
          
          registration.value?.active?.postMessage(
            { type: 'CLEAR_CACHE' },
            [messageChannel.port2]
          )
        })
      }
      return false
    } catch (error) {
      console.error('清理缓存失败:', error)
      toast.error('清理缓存失败')
      return false
    }
  }

  /**
   * 获取缓存大小
   */
  const getCacheSize = async (): Promise<number> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return estimate.usage || 0
      }
      return 0
    } catch (error) {
      console.error('获取缓存大小失败:', error)
      return 0
    }
  }

  /**
   * 请求持久化存储
   */
  const requestPersistentStorage = async (): Promise<boolean> => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersistent = await navigator.storage.persist()
        
        if (isPersistent) {
          console.log('持久化存储已启用')
          toast.success('存储优化', {
            description: '应用数据将被持久保存'
          })
        } else {
          console.log('持久化存储请求被拒绝')
        }
        
        return isPersistent
      }
      return false
    } catch (error) {
      console.error('请求持久化存储失败:', error)
      return false
    }
  }

  /**
   * 注册后台同步
   */
  const registerBackgroundSync = async (tag: string): Promise<boolean> => {
    try {
      if ((registration.value as any)?.sync) {
        await (registration.value as any).sync.register(tag)
        console.log('后台同步已注册:', tag)
        return true
      }
      return false
    } catch (error) {
      console.error('注册后台同步失败:', error)
      return false
    }
  }

  /**
   * 初始化PWA
   */
  const initPWA = async () => {
    console.log('初始化 PWA...')
    
    // 注册 Service Worker
    await registerServiceWorker()
    
    // 检查安装状态
    checkInstallStatus()
    
    // 设置安装提示
    setupInstallPrompt()
    
    // 设置网络监听
    const cleanupNetworkListeners = setupNetworkListeners()
    
    // 请求持久化存储
    await requestPersistentStorage()
    
    return cleanupNetworkListeners
  }

  // 组件挂载时初始化
  let cleanup: (() => void) | null = null
  
  onMounted(async () => {
    cleanup = await initPWA()
  })
  
  onUnmounted(() => {
    if (cleanup) {
      cleanup()
    }
  })

  return {
    // 状态
    isOnline: readonly(isOnline),
    isInstallable: readonly(isInstallable),
    isInstalled: readonly(isInstalled),
    isUpdateAvailable: readonly(isUpdateAvailable),
    
    // 方法
    installApp,
    applyUpdate,
    clearCache,
    getCacheSize,
    requestPersistentStorage,
    registerBackgroundSync,
    initPWA
  }
}