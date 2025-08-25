import { ref, computed, readonly, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

export interface SEOConfig {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'product'
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
}

const defaultConfig: SEOConfig = {
  title: 'PICCUT - 专业在线图片裁剪和网格拼图生成器',
  description: 'PICCUT是一个专业的免费在线图片处理工具，支持智能图片裁剪、网格拼图生成、图片压缩优化。提供1x1到9x9的网格布局，支持JPG、PNG、GIF、WebP格式，响应式设计完美适配桌面和移动端设备。',
  keywords: '图片裁剪,网格拼图,图片处理,在线工具,图片编辑,拼图生成器,免费工具,图片压缩,WebP转换,响应式图片,图片优化',
  image: 'https://piccut.vercel.app/og-image.png',
  url: 'https://piccut.vercel.app',
  type: 'website',
  author: 'PICCUT Team'
}

const currentConfig = ref<SEOConfig>({ ...defaultConfig })

export function useSEO() {
  const route = useRoute()

  /**
   * 更新页面标题
   */
  const updateTitle = (title: string) => {
    document.title = title
    updateMetaTag('og:title', title)
    updateMetaTag('twitter:title', title)
  }

  /**
   * 更新页面描述
   */
  const updateDescription = (description: string) => {
    updateMetaTag('description', description)
    updateMetaTag('og:description', description)
    updateMetaTag('twitter:description', description)
  }

  /**
   * 更新关键词
   */
  const updateKeywords = (keywords: string) => {
    updateMetaTag('keywords', keywords)
  }

  /**
   * 更新社交媒体图片
   */
  const updateImage = (imageUrl: string, alt?: string) => {
    updateMetaTag('og:image', imageUrl)
    updateMetaTag('twitter:image', imageUrl)
    if (alt) {
      updateMetaTag('og:image:alt', alt)
      updateMetaTag('twitter:image:alt', alt)
    }
  }

  /**
   * 更新页面URL
   */
  const updateUrl = (url: string) => {
    updateMetaTag('og:url', url)
    updateLinkTag('canonical', url)
  }

  /**
   * 更新页面类型
   */
  const updateType = (type: string) => {
    updateMetaTag('og:type', type)
  }

  /**
   * 更新作者信息
   */
  const updateAuthor = (author: string) => {
    updateMetaTag('author', author)
  }

  /**
   * 更新发布时间
   */
  const updatePublishedTime = (time: string) => {
    updateMetaTag('article:published_time', time)
  }

  /**
   * 更新修改时间
   */
  const updateModifiedTime = (time: string) => {
    updateMetaTag('article:modified_time', time)
    updateMetaTag('og:updated_time', time)
  }

  /**
   * 更新文章标签
   */
  const updateTags = (tags: string[]) => {
    // 移除现有的标签
    const existingTags = document.querySelectorAll('meta[property="article:tag"]')
    existingTags.forEach(tag => tag.remove())

    // 添加新标签
    tags.forEach(tag => {
      const meta = document.createElement('meta')
      meta.setAttribute('property', 'article:tag')
      meta.setAttribute('content', tag)
      document.head.appendChild(meta)
    })
  }

  /**
   * 更新meta标签
   */
  const updateMetaTag = (name: string, content: string) => {
    // 尝试通过name属性查找
    let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
    
    // 如果没找到，尝试通过property属性查找
    if (!meta) {
      meta = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement
    }
    
    if (meta) {
      meta.setAttribute('content', content)
    } else {
      // 创建新的meta标签
      const newMeta = document.createElement('meta')
      
      // 根据标签类型设置属性
      if (name.startsWith('og:') || name.startsWith('article:')) {
        newMeta.setAttribute('property', name)
      } else {
        newMeta.setAttribute('name', name)
      }
      
      newMeta.setAttribute('content', content)
      document.head.appendChild(newMeta)
    }
  }

  /**
   * 更新link标签
   */
  const updateLinkTag = (rel: string, href: string) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement
    
    if (link) {
      link.setAttribute('href', href)
    } else {
      const newLink = document.createElement('link')
      newLink.setAttribute('rel', rel)
      newLink.setAttribute('href', href)
      document.head.appendChild(newLink)
    }
  }

  /**
   * 更新结构化数据
   */
  const updateStructuredData = (data: any) => {
    // 移除现有的结构化数据
    const existingScript = document.querySelector('script[type="application/ld+json"]')
    if (existingScript) {
      existingScript.remove()
    }

    // 添加新的结构化数据
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data, null, 2)
    document.head.appendChild(script)
  }

  /**
   * 设置SEO配置
   */
  const setSEO = (config: Partial<SEOConfig>) => {
    const newConfig = { ...currentConfig.value, ...config }
    currentConfig.value = newConfig

    // 更新各项SEO元素
    if (config.title) {
      updateTitle(config.title)
    }

    if (config.description) {
      updateDescription(config.description)
    }

    if (config.keywords) {
      updateKeywords(config.keywords)
    }

    if (config.image) {
      updateImage(config.image)
    }

    if (config.url) {
      updateUrl(config.url)
    }

    if (config.type) {
      updateType(config.type)
    }

    if (config.author) {
      updateAuthor(config.author)
    }

    if (config.publishedTime) {
      updatePublishedTime(config.publishedTime)
    }

    if (config.modifiedTime) {
      updateModifiedTime(config.modifiedTime)
    }

    if (config.tags) {
      updateTags(config.tags)
    }

    // 更新结构化数据
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': config.type === 'article' ? 'Article' : 'WebApplication',
      name: config.title || defaultConfig.title,
      description: config.description || defaultConfig.description,
      url: config.url || defaultConfig.url,
      image: config.image || defaultConfig.image,
      author: {
        '@type': 'Organization',
        name: config.author || defaultConfig.author
      },
      datePublished: config.publishedTime,
      dateModified: config.modifiedTime || new Date().toISOString()
    }

    updateStructuredData(structuredData)
  }

  /**
   * 重置为默认SEO配置
   */
  const resetSEO = () => {
    setSEO(defaultConfig)
  }

  /**
   * 根据路由自动设置SEO
   */
  const autoSetSEO = () => {
    const routeName = route.name as string
    const routePath = route.path

    let config: Partial<SEOConfig> = {}

    switch (routeName) {
      case 'home':
      default:
        config = {
          title: 'PICCUT - 专业在线图片裁剪和网格拼图生成器 | 免费图片处理工具',
          description: 'PICCUT是一个专业的免费在线图片处理工具，支持智能图片裁剪、网格拼图生成、图片压缩优化。提供1x1到9x9的网格布局，支持JPG、PNG、GIF、WebP格式，响应式设计完美适配桌面和移动端设备。',
          url: `https://piccut.vercel.app${routePath}`,
          type: 'website'
        }
        break
    }

    setSEO(config)
  }

  /**
   * 生成页面分享链接
   */
  const generateShareUrls = () => {
    const config = currentConfig.value
    const encodedTitle = encodeURIComponent(config.title || '')
    const encodedDescription = encodeURIComponent(config.description || '')
    const encodedUrl = encodeURIComponent(config.url || '')

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      weibo: `https://service.weibo.com/share/share.php?title=${encodedTitle}&url=${encodedUrl}`,
      qq: `https://connect.qq.com/widget/shareqq/index.html?title=${encodedTitle}&desc=${encodedDescription}&url=${encodedUrl}`,
      wechat: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`
    }
  }

  // 监听路由变化自动更新SEO
  watch(
    () => route.path,
    () => {
      autoSetSEO()
    },
    { immediate: true }
  )

  // 初始化时设置默认SEO
  onMounted(() => {
    autoSetSEO()
  })

  return {
    currentConfig: readonly(currentConfig),
    setSEO,
    resetSEO,
    autoSetSEO,
    updateTitle,
    updateDescription,
    updateKeywords,
    updateImage,
    updateUrl,
    updateType,
    updateAuthor,
    updatePublishedTime,
    updateModifiedTime,
    updateTags,
    generateShareUrls
  }
}