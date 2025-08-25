# PICCUT - 图片宫格生成器

一个基于 Vue 3 的在线图片处理工具，支持图片裁剪和网格拼图生成。提供直观的用户界面，让您轻松创建个性化的图片网格拼图。

## ✨ 功能特性

### 🖼️ 图片处理
- **多格式支持**：支持 JPG、PNG、GIF、WebP 格式图片上传
- **自由裁剪**：可视化裁剪工具，支持拖拽调整裁剪区域
- **实时预览**：所见即所得的编辑体验
- **图片滤镜**：内置多种滤镜效果

### 🎯 网格拼图
- **多种尺寸**：支持 1x1 到 9x9 的网格布局
- **自定义边框**：可调节边框颜色和粗细
- **智能适配**：自动适应图片比例和容器尺寸
- **高质量输出**：保持原图清晰度的网格拼图生成

### 📱 用户体验
- **响应式设计**：完美适配桌面端和移动端
- **触摸优化**：移动端触摸操作体验优化
- **一键下载**：支持下载裁剪后的图片和网格拼图
- **拖拽上传**：支持拖拽文件上传

## 🛠️ 技术栈

### 前端框架
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 快速的前端构建工具

### UI 和样式
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Lucide Vue Next** - 精美的图标库
- **响应式设计** - 移动端和桌面端适配

### 状态管理和工具
- **Pinia** - Vue 3 官方推荐的状态管理库
- **Canvas API** - 原生图片处理和绘制
- **Vue Router** - 单页应用路由管理

## 📁 项目结构

```
PICCUT/
├── src/
│   ├── components/          # 可复用组件
│   ├── composables/         # Vue 3 组合式函数
│   │   ├── useCropBox.ts           # 裁剪框通用逻辑
│   │   ├── useCropBoxDesktop.ts    # 桌面端裁剪框
│   │   ├── useCropBoxMobile.ts     # 移动端裁剪框
│   │   ├── useImageProcessor.ts    # 图片处理逻辑
│   │   ├── useImageUpload.ts       # 图片上传逻辑
│   │   └── useTheme.ts             # 主题管理
│   ├── pages/               # 页面组件
│   │   └── HomePage.vue            # 主页面
│   ├── stores/              # Pinia 状态管理
│   │   └── index.ts                # 主要状态存储
│   ├── lib/                 # 工具函数
│   └── router/              # 路由配置
├── public/                  # 静态资源
└── .trae/                   # 项目文档
    └── documents/
        ├── 产品需求文档.md
        └── 技术架构文档.md
```

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0 或 pnpm >= 6.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd PICCUT
```

2. **安装依赖**
```bash
npm install
# 或
pnpm install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
pnpm dev
```

4. **访问应用**
打开浏览器访问 `http://localhost:5173`

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🌐 部署指南

### 🐳 Docker 一键部署（推荐）

项目已配置完整的 Docker 部署方案，支持一键部署：

#### 快速启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd PICCUT

# 2. 一键启动（生产环境）
docker-compose up -d

# 3. 访问应用
# 浏览器打开 http://localhost
```

#### 开发环境

```bash
# 启动开发环境（支持热重载）
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# 访问开发服务器
# 浏览器打开 http://localhost:5173
```

#### Docker 部署特性

- **多阶段构建**：优化镜像大小，提高构建效率
- **Nginx 优化**：生产级 Nginx 配置，支持 gzip 压缩和缓存
- **安全配置**：非 root 用户运行，安全头配置
- **健康检查**：自动监控应用状态
- **SPA 路由支持**：完美支持 Vue Router 路由
- **日志管理**：持久化日志存储

#### 自定义配置

```bash
# 自定义端口
docker-compose up -d
# 然后编辑 docker-compose.yml 中的端口映射

# 查看日志
docker-compose logs -f piccut

# 停止服务
docker-compose down

# 重新构建
docker-compose build --no-cache
```

#### 生产环境建议

```bash
# 1. 设置环境变量
export NODE_ENV=production

# 2. 使用生产配置启动
docker-compose -f docker-compose.yml up -d

# 3. 配置反向代理（可选）
# 如使用 Traefik、Nginx Proxy Manager 等
```

### GitHub Pages 部署

项目已配置自动部署到 GitHub Pages：

1. **推送到主分支**
```bash
git push origin main
```

2. **自动构建**
   - GitHub Actions 会自动触发构建流程
   - 构建完成后自动部署到 GitHub Pages
   - 访问地址：`https://[username].github.io/[repository-name]`

### Vercel 部署

项目已配置 Vercel 部署：

1. **连接 GitHub 仓库**
   - 在 Vercel 控制台导入 GitHub 项目
   - 选择本仓库进行部署

2. **自动部署**
   - 每次推送到主分支会自动触发部署
   - 支持预览部署和生产部署
   - 获得自定义域名和 HTTPS 支持

### 传统部署

如需手动部署到其他平台：

```bash
# 1. 构建项目
npm run build

# 2. dist 目录包含所有静态文件
# 3. 将 dist 目录内容上传到您的服务器
```

**注意事项：**
- 确保服务器支持 SPA（单页应用）路由
- 配置服务器将所有路由重定向到 `index.html`
- 建议启用 gzip 压缩以提高加载速度

## 📖 使用说明

### 基本操作流程

1. **上传图片**
   - 点击上传按钮选择图片文件
   - 或直接拖拽图片到上传区域
   - 支持 JPG、PNG、GIF、WebP 格式

2. **调整裁剪区域**
   - 拖拽裁剪框移动位置
   - 拖拽四角手柄调整大小
   - 实时预览裁剪效果

3. **设置网格参数**
   - 选择网格尺寸（1x1 到 9x9）
   - 调整边框颜色和粗细
   - 应用图片滤镜效果

4. **下载结果**
   - 下载裁剪后的图片
   - 下载网格拼图

### 功能详解

#### 裁剪功能
- **可视化操作**：直观的裁剪框界面
- **精确控制**：支持像素级精度调整
- **实时反馈**：即时显示裁剪区域信息

#### 网格生成
- **灵活配置**：多种网格尺寸选择
- **样式定制**：自定义边框样式
- **高质量输出**：保持图片清晰度

#### 响应式适配
- **桌面端**：完整功能界面，支持鼠标操作
- **移动端**：触摸优化界面，手势操作友好

## 🏗️ 开发说明

### 架构特点

1. **组合式 API**：使用 Vue 3 Composition API 提高代码复用性
2. **类型安全**：TypeScript 提供完整的类型检查
3. **模块化设计**：功能模块独立，便于维护和扩展
4. **响应式分离**：桌面端和移动端逻辑完全分离

### 主要组件

#### Composables（组合式函数）
- `useImageUpload`：处理图片上传和验证
- `useImageProcessor`：图片处理和Canvas操作
- `useCropBoxMobile/Desktop`：分别处理移动端和桌面端裁剪逻辑
- `useTheme`：主题和样式管理

#### 状态管理
- 使用 Pinia 管理全局状态
- 包括图片数据、裁剪框状态、用户设置等

#### 样式系统
- Tailwind CSS 实用类优先
- 响应式断点设计
- 自定义组件样式

### 开发规范

- **代码风格**：遵循 Vue 3 和 TypeScript 最佳实践
- **组件设计**：单一职责原则，保持组件简洁
- **性能优化**：使用 requestAnimationFrame 优化动画
- **错误处理**：完善的错误边界和用户提示

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目！

---

**PICCUT** - 让图片处理变得简单有趣 🎨
