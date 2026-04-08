# 🤖 zxaiNexForge — 多平台账号自动注册控制台

> 一站式自动注册 ChatGPT、Cursor、Grok、Kiro、Trae、Tavily 等平台账号，配合 Web 管理面板，支持批量注册、代理池管理、邮箱对接、CPA 上传等功能。

---

## 📑 目录

- [项目简介](#-项目简介)
- [系统架构](#-系统架构)
- [功能一览](#-功能一览)
- [环境准备](#-环境准备)
- [快速开始（本地运行）](#-快速开始本地运行)
- [Docker 一键部署（推荐）](#-docker-一键部署推荐)
- [邮箱服务配置](#-邮箱服务配置)
  - [Cloudflare 临时邮箱部署](#方案一cloudflare-临时邮箱部署推荐)
  - [其他邮箱方案](#方案二其他邮箱方案)
- [代理配置](#-代理配置)
- [CPA / 第三方同步](#-cpa--第三方同步)
- [Nginx 反向代理](#-nginx-反向代理)
- [GitHub Actions 自动部署](#-github-actions-自动部署)
- [常见问题](#-常见问题)
- [目录结构说明](#-目录结构说明)
- [开发命令](#-开发命令)

---

## 🎯 项目简介

**Any Auto Register** 是一个全自动多平台账号注册管理系统。你只需要：

1. **部署一个邮箱服务**（收注册验证码）
2. **导入代理 IP**（避免封 IP）
3. **在 Web 面板上点击「开始注册」**

系统就会自动完成：注册账号 → 收取验证码 → 填写验证码 → 获取 Token → 上传到你的 CPA 面板。

**支持的平台：**

| 平台 | 说明 |
|------|------|
| ChatGPT | OpenAI 旗下智能对话工具 |
| Cursor | AI 编程助手 |
| Grok | xAI 旗下 AI 模型 |
| Kiro | AWS 旗下 AI IDE |
| Trae | 字节跳动旗下 AI IDE |
| Tavily | AI 搜索引擎 |
| OpenBlockLabs | Web3 数据平台 |

---

## 🏗 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   浏览器 Web 面板                      │
│         (React + TypeScript + Vite 前端)              │
└────────────────────────┬────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────┐
│              FastAPI 后端 (Python 3.12)               │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ 账号管理  │  │ 任务引擎  │  │  Turnstile Solver │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ 代理池   │  │ 邮箱对接  │  │  CPA / 同步服务   │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────┬──────────────┬───────────────┬───────────────┘
       │              │               │
  ┌────▼────┐  ┌──────▼──────┐  ┌─────▼──────┐
  │ 代理 IP │  │ 邮箱服务     │  │ CPA 面板   │
  │ (HTTP/  │  │ (CF Worker/ │  │ CLIProxy   │
  │  SOCKS) │  │  LuckMail/  │  │ Sub2API    │
  └─────────┘  │  AppleMail) │  └────────────┘
               └─────────────┘
```

---

## ✨ 功能一览

- ✅ **多平台注册** — 插件化架构，一键注册多平台账号
- ✅ **丰富的邮箱对接** — 支持 14+ 种邮箱服务（CF Worker、LuckMail、AppleMail、MaliAPI、GPTMail 等）
- ✅ **代理池管理** — 支持 HTTP / SOCKS5 代理，批量导入、检测、轮转
- ✅ **Turnstile 验证码自动解决** — 内置 Solver 服务，自动过 Cloudflare 人机验证
- ✅ **Web 管理面板** — 总览面板、账号管理、任务监控、实时日志
- ✅ **CPA 自动上传** — 注册完自动上传到 CLIProxyAPI / Sub2API / CodexProxy
- ✅ **任务控制** — 支持暂停、跳过、停止当前注册任务
- ✅ **Token 刷新** — 自动刷新过期 Token
- ✅ **状态探测** — 探测账号订阅状态、有效性
- ✅ **Docker 一键部署** — 前后端一体构建，开箱即用
- ✅ **访问控制** — 支持管理员密钥、JWT 认证

---

## 📋 环境准备

### 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | macOS / Linux / Windows |
| Python | ≥ 3.12 |
| Node.js | ≥ 18（仅构建前端需要） |
| Git | 最新版本 |

### 你还需要准备（按需）

| 项目 | 说明 | 是否必须 |
|------|------|---------|
| 邮箱服务 | 收注册验证码（推荐 CF 自建邮箱） | ✅ 必须 |
| 代理 IP | 避免注册 IP 被封（推荐住宅代理） | ✅ 必须 |
| 域名 | 部署 CF 邮箱需要（推荐便宜域名） | 自建邮箱时需要 |
| Cloudflare 账号 | 部署 CF 临时邮箱 | 自建邮箱时需要 |

---

## 🚀 快速开始（本地运行）

> 💡 适合开发调试和个人使用。生产环境推荐使用 [Docker 部署](#-docker-一键部署推荐)。

### 第 1 步：克隆代码

```bash
git clone https://github.com/你的用户名/zxaiNexForge.git
cd zxaiNexForge
```

### 第 2 步：创建 Python 虚拟环境 & 安装依赖

```bash
python3.12 -m venv .venv

# macOS / Linux
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -r requirements.txt

# Windows
.venv\Scripts\python -m pip install -U pip
.venv\Scripts\python -m pip install -r requirements.txt
```

### 第 3 步：安装浏览器（Solver 需要）

```bash
# macOS / Linux
.venv/bin/python -m playwright install chromium

# Windows
.venv\Scripts\python -m playwright install chromium
```

### 第 4 步：构建前端

```bash
cd frontend
npm install
npm run build
cd ..
```

> 构建产物会自动输出到 `static/` 目录，后端会自动挂载。

### 第 5 步：启动后端

**不启用访问控制（默认）：**

```bash
# macOS / Linux
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Windows（两种方式，任选一种）
.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000
# 或者直接运行脚本
.\start_backend.ps1
```

**启用管理员密钥保护（推荐）：**

```bash
ZXAI_ADMIN_KEY='你的管理员密码' \
APP_JWT_SECRET='你的jwt密钥随便填一串' \
.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 第 6 步：打开浏览器

```
http://127.0.0.1:8000
```

🎉 看到管理面板就说明启动成功了！

---

## 🐳 Docker 一键部署（推荐）

> 💡 适合生产环境服务器部署，自动构建前端 + 后端 + Solver，开箱即用。

### 第 1 步：准备环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，**修改以下两个必改项**：

```env
# 必改！管理员密码，用于登录后台
ZXAI_ADMIN_KEY=改成你自己的密码

# 必改！JWT 密钥，可以随便敲一串随机字符
APP_JWT_SECRET=改成一串随机字符串
```

其他配置项说明：

```env
# 应用运行端口，默认 8000
PORT=8000

# Turnstile Solver 开关，1=开启（推荐开启）
APP_ENABLE_SOLVER=1

# 数据持久化目录（Docker 挂载）
APP_RUNTIME_BIND=./data
```

### 第 2 步：启动

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
```

> ⏳ 首次构建大约需要 5-10 分钟（需要安装 Chromium 浏览器），之后重启很快。

### 第 3 步：查看日志

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f app
```

### 第 4 步：停止

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml down
```

### 第 5 步：打开面板

```
http://你的服务器IP:8000
```

> 如果配置了 `ZXAI_ADMIN_KEY`，打开时会跳转到登录页面，输入你设置的管理员密码即可。

---

## 📧 邮箱服务配置

注册平台账号时需要收取验证码邮件。你需要配置一个邮箱服务来实现"自动收信"。

### 方案一：Cloudflare 临时邮箱部署（推荐）

> 基于 Cloudflare 免费服务搭建，零成本、高性能、支持多域名。
>
> 项目地址：https://github.com/usagisean/cloudflare_temp_email

#### 你需要准备

| 项目 | 说明 |
|------|------|
| Cloudflare 账号 | 免费注册：https://dash.cloudflare.com |
| 域名 | 便宜域名即可（如 `.xyz`、`.top`，几块钱一年） |
| 良好的上网环境 | 能访问 Cloudflare 控制台 |

#### 部署步骤简述

CF 临时邮箱有三种部署方式，推荐选择**用户界面部署（最简单）**：

**① 创建 D1 数据库**

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 左侧菜单 → `Workers 和 Pages` → `D1 SQL 数据库`
3. 点击 `创建` → 数据库名填 `temp-email-db` → 创建
4. 进入数据库 → 点击 `控制台` → 粘贴建表 SQL 并执行

   > 建表 SQL 请从 [CF 临时邮箱项目](https://github.com/usagisean/cloudflare_temp_email) 的 `db/` 目录中获取

**② 部署 Worker 后端**

1. 左侧菜单 → `Workers 和 Pages` → `创建`
2. 选择 `创建 Worker` → 名称填 `temp-email-worker` → 部署
3. 进入 Worker → `设置` → `变量和密钥` → 添加以下环境变量：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `DOMAINS` | `["你的域名.xyz"]` | 邮箱域名列表，JSON 数组 |
   | `DB` | 绑定到你创建的 D1 数据库 | 在"绑定"里配置 |
   | `ADMIN_PASSWORDS` | `["你的管理员密码"]` | 管理后台密码 |
   | `JWT_SECRET` | `随意一串字符` | JWT 密钥 |

4. 上传 Worker 代码（从 `worker/` 目录获取）

**③ 配置邮件转发 (Email Routing)**

1. Cloudflare 控制台 → 选择你的域名
2. 左侧 `电子邮件` → `电子邮件路由`
3. 启用 Email Routing
4. 添加路由规则：`Catch-all`（全部捕获）→ 发送到 Worker

**④ 部署前端页面**

1. `Workers 和 Pages` → `创建` → 选择 `Pages`
2. 上传 `frontend/` 构建产物
3. 设置环境变量 `VITE_API_BASE` 为你的 Worker 地址

> 📚 **详细图文教程**：https://temp-mail-docs.awsl.uk/zh/guide/quick-start
>
> 📚 **小白教程**：https://linux.do/t/topic/316819/1

#### 在注册面板中配置 CF 邮箱



CF 临时邮箱部署好之后，回到 **zxaiNexForge** 面板进行对接：

1. 打开面板 → `设置` 页面
2. 找到 `邮箱服务` 区域
3. `邮箱方案` 选择 → `cfworker`
4. 填写以下配置：

   | 配置项 | 填什么 | 示例 |
   |--------|--------|------|
   | `cfworker_api_url` | 你的 CF Worker 后端地址 | `https://temp-email-worker.你的用户名.workers.dev` |
   | `cfworker_admin_token` | CF 邮箱的管理员密码 | 就是你在 `ADMIN_PASSWORDS` 里设的那个 |
   | `cfworker_domain` | 邮箱域名 | `你的域名.xyz` |

   **可选高级配置：**

   | 配置项 | 说明 |
   |--------|------|
   | `cfworker_domains` | 多域名列表（JSON 数组或逗号分隔） |
   | `cfworker_enabled_domains` | 启用的域名白名单 |
   | `cfworker_subdomain` | 子域名前缀 |
   | `cfworker_random_subdomain` | 是否随机子域名（`true`/`false`） |
   | `cfworker_custom_auth` | 私有站点密码（如果开了密码保护） |
   | `cfworker_fingerprint` | 指纹标识 |

5. 点击 `保存` ✅

### 方案二：其他邮箱方案

系统支持多种邮箱服务，根据你的情况选择：

| 邮箱方案 | 说明 | 需要的配置 |
|---------|------|-----------|
| `luckmail` | LuckMail 商业邮箱 API | `luckmail_base_url`、`luckmail_api_key`、`luckmail_domain` |
| `applemail` | 小苹果取件邮箱（本地池轮转） | `applemail_base_url`、邮箱池文件 |
| `maliapi` | MaliAPI 邮箱服务 | `maliapi_base_url`、`maliapi_api_key`、`maliapi_domain` |
| `gptmail` | GPTMail 邮箱服务 | `gptmail_base_url`、`gptmail_api_key` |
| `cloudmail` | CloudMail 邮箱服务 | `cloudmail_api_base`、`cloudmail_admin_email`、`cloudmail_admin_password` |
| `duckmail` | DuckMail 邮箱 | `duckmail_api_url`、`duckmail_api_key` |
| `freemail` | Freemail 邮箱 | `freemail_api_url`、`freemail_admin_token` |
| `moemail` | MoeMail 邮箱 | `moemail_api_url`、`moemail_api_key` |
| `skymail` | SkyMail 邮箱 | `skymail_api_base`、`skymail_token` |
| `opentrashmail` | OpenTrashMail 自建邮箱 | `opentrashmail_api_url`、`opentrashmail_domain` |
| `tempmail_lol` | TempMail.lol（无需配置、但不稳定） | 无 |
| `outlook` | Outlook IMAP 取件 | `outlook_imap_server`、`outlook_imap_port` |

在 `设置` 页面 → `邮箱方案` 下拉选择对应方案，填写相关配置即可。

---

## 🌐 代理配置

> ⚠️ 注册平台账号**强烈建议配置代理**，否则 IP 容易被风控。推荐使用**住宅代理**。

### 支持的代理格式

在面板 `代理` 页面，可以批量导入代理 IP，支持以下格式：

```
# 标准 URL 格式
http://用户名:密码@主机:端口
socks5://用户名:密码@主机:端口

# 简写格式（默认 HTTP）
主机:端口:用户名:密码
```

### 测试代理是否可用

```bash
# 测试 HTTP 代理能否访问 OpenAI
curl --proxy http://主机:端口 \
  --proxy-user '用户名:密码' \
  https://auth.openai.com/create-account/password -I
```

看到 `HTTP/1.1 200 Connection established` 就说明代理可用。

### 说明

- `主机:端口:用户名:密码` 格式默认按 HTTP 代理处理
- SOCKS5 请明确写 `socks5://用户名:密码@主机:端口`
- HTTP 代理需要支持 HTTPS CONNECT（隧道代理）

---

## 📤 CPA / 第三方同步

注册账号后可以自动上传到以下平台：

### CLIProxyAPI Plus

在 `设置` → `ChatGPT` → `CPA 面板` 中配置：

```
API URL: http://cliproxyapiplus:8317     （Docker 容器名，或你的实际地址）
API Key: CLIProxyAPI Plus 的 secret-key
```

### Sub2API

在 `设置` 中配置 `sub2api_api_url` 和 `sub2api_api_key`。

### CodexProxy

在 `设置` 中配置 `codex_proxy_url` 和 `codex_proxy_key`。

### 测试连接

```bash
# 测试 CLIProxyAPI 连通性（Docker 环境下）
docker exec zxainexforge python -c \
  "import requests; r=requests.get('http://cliproxyapiplus:8317/v0/management/auth-files', \
   headers={'Authorization':'Bearer 你的secret-key'}, timeout=10); \
   print(r.status_code); print(r.text[:300])"
```

返回 `200` 表示连接正常。

---

## 🔒 Nginx 反向代理

Docker 默认只暴露到 `127.0.0.1:8000`，如果需要通过域名访问，可以配置 Nginx 反代：

```nginx
server {
    listen 80;
    server_name your-domain.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.example.com;

    ssl_certificate /etc/nginx/ssl/origin.pem;
    ssl_certificate_key /etc/nginx/ssl/origin.key;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（实时日志需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

```bash
nginx -t          # 检查配置
systemctl reload nginx  # 重载
```

---

## 🚢 GitHub Actions 自动部署

仓库内置了 CI/CD 部署工作流，可以 push 代码后自动部署到 VPS。

### 配置 Secrets

在 GitHub 仓库 `Settings` → `Secrets and variables` → `Actions` → `Secrets` 中添加：

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | VPS IP 地址 |
| `DEPLOY_PORT` | SSH 端口（默认 22） |
| `DEPLOY_USER` | SSH 用户名 |
| `DEPLOY_SSH_KEY` | SSH 私钥全文 |

### 可选 Variables

| Variable | 默认值 | 说明 |
|----------|--------|------|
| `DEPLOY_PATH` | `/opt/registerforchatgpt` | VPS 上的部署目录 |

> ⚠️ 线上 `.env` 文件在 VPS 上手动维护，**不要提交到 GitHub**。

---

## ❓ 常见问题

### Q1：项目启动报错 `playwright` 相关

```bash
# 确保安装了浏览器
.venv/bin/python -m playwright install chromium
```

### Q2：邮箱收不到验证码

- 检查邮箱服务是否正常运行
- 检查 `设置` 页面的邮箱配置是否正确
- CF Worker 邮箱：检查 Email Routing 是否启用、Catch-all 规则是否配置
- 查看任务日志中的具体报错信息

### Q3：注册时提示需要手机验证

- 换更好的代理 IP（推荐专属住宅代理）
- 避免同 IP 短时间内注册过多账号
- 某些地区的 IP 更容易触发手机验证

### Q4：Docker 构建很慢

首次构建需要下载 Chromium 浏览器（约 200MB），请耐心等待。后续重建会使用缓存，速度会快很多。

### Q5：忘记了管理员密码

修改 `.env` 中的 `ZXAI_ADMIN_KEY`，然后重启服务：

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml restart app
```

### Q6：Turnstile Solver 无法启动

- 确保 `APP_ENABLE_SOLVER=1`
- 检查 Chromium 浏览器是否已安装
- 查看日志中 Solver 的具体报错

---

## 📁 目录结构说明

```
zxaiNexForge/
├── api/                    # FastAPI 路由层（HTTP 接口）
│   ├── accounts.py         #   账号 CRUD
│   ├── tasks.py            #   注册任务管理
│   ├── proxies.py          #   代理池管理
│   ├── config.py           #   全局配置
│   ├── auth.py             #   登录认证
│   ├── actions.py          #   平台操作（探测、刷新、上传等）
│   └── integrations.py     #   CPA / 第三方集成
│
├── core/                   # 核心业务逻辑
│   ├── base_platform.py    #   平台插件基类
│   ├── base_mailbox.py     #   邮箱服务基类（14+ 种邮箱实现）
│   ├── registry.py         #   平台插件注册中心
│   ├── task_runtime.py     #   任务运行时（停止/跳过/进度）
│   ├── proxy_pool.py       #   代理池
│   ├── proxy_utils.py      #   代理格式解析
│   ├── config_store.py     #   持久化配置存储
│   └── db.py               #   SQLite 数据库
│
├── platforms/              # 平台插件（每个平台一个目录）
│   ├── chatgpt/            #   ChatGPT 注册流程
│   ├── cursor/             #   Cursor 注册流程
│   ├── grok/               #   Grok 注册流程
│   ├── kiro/               #   Kiro 注册流程
│   ├── trae/               #   Trae 注册流程
│   ├── tavily/             #   Tavily 注册流程
│   └── openblocklabs/      #   OpenBlockLabs 注册流程
│
├── services/               # 后台服务
│   ├── solver_manager.py   #   Turnstile 验证码解决器
│   ├── cpa_manager.py      #   CPA 上传管理
│   └── cliproxyapi_sync.py #   CLIProxyAPI 状态同步
│
├── frontend/               # React 前端源码
│   └── src/
│       ├── App.tsx          #   主应用
│       ├── pages/           #   页面组件
│       └── components/      #   UI 组件
│
├── static/                 # 前端构建产物（自动生成）
├── docker/                 # Docker 入口脚本
├── scripts/                # 工具脚本
├── main.py                 # FastAPI 应用入口
├── requirements.txt        # Python 依赖
├── Dockerfile              # Docker 构建文件
├── docker-compose.yml      # Docker Compose 配置
├── docker-compose.deploy.yml  # 部署覆盖配置
└── .env.example            # 环境变量示例
```

---

## 🛠 开发命令

```bash
# 前端开发（热更新）
cd frontend && npm run dev

# 前端构建
cd frontend && npm run build

# Python 语法检查
.venv/bin/python -m py_compile api/tasks.py core/task_runtime.py main.py

# 运行测试
.venv/bin/python -m unittest discover tests

# 查看 Solver 状态
curl http://127.0.0.1:8000/api/solver/status

# 重启 Solver
curl -X POST http://127.0.0.1:8000/api/solver/restart
```

---

## 📜 Web 管理面板功能速览

| 页面 | 功能 |
|------|------|
| **总览** | 服务器状态、账号统计、实时任务进度、CPA 热力图 |
| **账号** | 账号列表、新建注册任务、状态同步、CPA 补传、批量导入导出 |
| **历史** | 所有任务的历史记录和日志 |
| **代理** | 代理 IP 导入、批量检测、删除 |
| **设置** | 邮箱服务、CPA 配置、CLIProxyAPI、验证码解决器、访问控制 |

---

> 💬 **遇到问题？** 查看任务实时日志通常能找到原因。大部分问题出在代理质量或邮箱配置上。
> QQ 交流群：1059083871
