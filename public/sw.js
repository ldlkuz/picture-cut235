// Service Worker for PICCUT PWA
const CACHE_NAME = 'piccut-v1.0.0'
const STATIC_CACHE_NAME = 'piccut-static-v1.0.0'
const DYNAMIC_CACHE_NAME = 'piccut-dynamic-v1.0.0'
const IMAGE_CACHE_NAME = 'piccut-images-v1.0.0'

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// 需要缓存的动态资源模式
const CACHE_PATTERNS = {
  // JavaScript 和 CSS 文件
  assets: /\.(js|css|woff2?|ttf|eot)$/,
  // 图片文件
  images: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
  // API 请求
  api: /\/api\//
}

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      // 立即激活新的 Service Worker
      self.skipWaiting()
    ])
  )
})

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== STATIC_CACHE_NAME && 
                     cacheName !== DYNAMIC_CACHE_NAME && 
                     cacheName !== IMAGE_CACHE_NAME
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      }),
      // 立即控制所有客户端
      self.clients.claim()
    ])
  )
})

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return
  }
  
  // 根据请求类型选择缓存策略
  if (request.method === 'GET') {
    if (CACHE_PATTERNS.images.test(url.pathname)) {
      // 图片资源：缓存优先策略
      event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME))
    } else if (CACHE_PATTERNS.assets.test(url.pathname)) {
      // 静态资源：缓存优先策略
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME))
    } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      // HTML 页面：网络优先策略
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME))
    } else {
      // 其他资源：网络优先策略
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME))
    }
  }
})

// 缓存优先策略
async function cacheFirstStrategy(request, cacheName) {
  try {
    // 先从缓存中查找
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url)
      return cachedResponse
    }
    
    // 缓存中没有，从网络获取
    console.log('[SW] Cache miss, fetching from network:', request.url)
    const networkResponse = await fetch(request)
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error)
    
    // 如果是图片请求失败，返回占位图
    if (CACHE_PATTERNS.images.test(request.url)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">图片加载失败</text></svg>',
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
          }
        }
      )
    }
    
    throw error
  }
}

// 网络优先策略
async function networkFirstStrategy(request, cacheName) {
  try {
    // 先尝试从网络获取
    console.log('[SW] Fetching from network:', request.url)
    const networkResponse = await fetch(request)
    
    // 缓存成功的响应
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      const responseClone = networkResponse.clone()
      cache.put(request, responseClone)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    // 网络失败，从缓存中查找
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url)
      return cachedResponse
    }
    
    // 如果是 HTML 请求，返回离线页面
    if (request.destination === 'document') {
      const offlineResponse = await cache.match('/')
      if (offlineResponse) {
        return offlineResponse
      }
    }
    
    throw error
  }
}

// 后台同步事件
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// 执行后台同步
async function doBackgroundSync() {
  try {
    console.log('[SW] Performing background sync...')
    
    // 这里可以添加后台同步逻辑
    // 例如：上传离线时保存的数据
    
    // 通知客户端同步完成
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_SUCCESS',
        message: '后台同步完成'
      })
    })
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
    
    // 通知客户端同步失败
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_FAILED',
        message: '后台同步失败'
      })
    })
  }
}

// 推送通知事件
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'PICCUT 有新的更新',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看更新',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/icons/icon-192x192.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('PICCUT', options)
  )
})

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'explore') {
    // 打开应用
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus()
        }
        return clients.openWindow('/')
      })
    )
  }
})

// 消息事件 - 与客户端通信
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    })
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      }).then(() => {
        event.ports[0].postMessage({
          success: true,
          message: '缓存已清理'
        })
      })
    )
  }
})

// 错误处理
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason)
  event.preventDefault()
})

console.log('[SW] Service Worker loaded successfully')