# zxai

一个只保留 ChatGPT 工作流的账号控制台。

它适合已经具备以下条件的人使用：

- 有可用邮箱方案。
- 有可用代理，最好先确认代理能访问 `https://auth.openai.com`。
- 需要在本地 Mac 或 Linux VPS 上长期运行。
- 需要管理注册结果、状态、CPA 上传和实时任务日志。

它不适合完全没有代理、邮箱、服务器基础的人直接盲跑。项目能把流程串起来，但成功率仍然取决于邮箱、代理、目标站点风控和 CPA 服务可用性。

## 功能概览

- ChatGPT 账号注册与管理。
- 管理员密钥登录，避免后台公开暴露。
- 本地或 VPS Docker 部署。
- iPhone / 移动端网页访问。
- 实时任务控制台，支持跨设备查看同一个运行任务。
- 注册进度、线程进度和 CPA 热力图。
- 代理管理、批量导入、检测和批量删除。
- ChatGPT 状态同步、CPA 远端状态同步和 auth-file 补传。
- CLIProxyAPI Plus / CPA 面板对接。
- 中英文切换和明暗主题切换。

## 快速路径

如果你只是想先跑起来，按这个顺序做：

1. 安装依赖并构建前端。
2. 启动后端。
3. 打开页面并输入管理员密钥。
4. 在设置页配置 CPA 面板。
5. 导入代理。
6. 去账号页创建注册任务。
7. 回到总览页看实时任务和热力图。

## 本地运行

以下命令以 macOS 为例。

### 1. 进入项目

```bash
cd /Users/zhaozhixiang/any-auto-register
```

### 2. 安装 Python 依赖

如果你已经有 `.venv`，直接用它：

```bash
.venv/bin/python -m pip install -r requirements.txt
```

如果没有 `.venv`：

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -U pip
.venv/bin/python -m pip install -r requirements.txt
```

### 3. 安装浏览器依赖

```bash
.venv/bin/python -m playwright install chromium
```

### 4. 构建前端

```bash
cd frontend
npm install
npm run build
cd ..
```

### 5. 启动后端

```bash
.venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

打开：

```text
http://127.0.0.1:8000
```

## 管理员密钥

生产环境一定要设置管理员密钥，否则别人拿到域名就可能进入后台。

支持两种环境变量，优先使用 `ZXAI_ADMIN_KEY`：

```env
ZXAI_ADMIN_KEY=换成你自己的长密钥
APP_JWT_SECRET=换成你自己的随机长串
```

设置后，访问页面会先进入登录页，输入管理员密钥才能进入后台。

## VPS Docker 部署

推荐 VPS 规格：

- 最低：`2 vCPU / 4 GB RAM / 40 GB 磁盘`
- 更稳：`4 vCPU / 8 GB RAM`

### 1. 准备目录

```bash
mkdir -p /opt/registerforchatgpt
mkdir -p /opt/registerforchatgpt/data
mkdir -p /opt/registerforchatgpt/_ext_targets
mkdir -p /opt/registerforchatgpt/external_logs
```

### 2. 创建 `.env`

文件路径：

```text
/opt/registerforchatgpt/.env
```

推荐内容：

```env
HOST=0.0.0.0
PORT=8000
APP_RELOAD=0
APP_CONDA_ENV=docker
APP_RUNTIME_DIR=/runtime

ZXAI_ADMIN_KEY=change-this-admin-key
APP_JWT_SECRET=change-this-jwt-secret

APP_ENABLE_SOLVER=1
SOLVER_PORT=8889
SOLVER_BIND_HOST=0.0.0.0
LOCAL_SOLVER_URL=http://127.0.0.1:8889
SOLVER_BROWSER_TYPE=chromium
INSTALL_CAMOUFOX=0
PLAYWRIGHT_HEADLESS=1

APP_RUNTIME_BIND=./data
APP_EXT_TARGETS_BIND=./_ext_targets
APP_EXTERNAL_LOGS_BIND=./external_logs

APP_SHARED_DOCKER_NETWORK=zxx_net

SMSTOME_COOKIE=
```

### 3. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 4. 启动

在项目目录中执行：

```bash
cd /opt/registerforchatgpt
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build
```

查看状态：

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f app
```

停止：

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml down
```

## Nginx 域名访问

如果你希望只允许域名访问，不让公网 IP 直接访问 `8000`，当前 Docker 配置已经把应用绑定到：

```text
127.0.0.1:8000
```

Nginx 反代示例：

```nginx
server {
    listen 80;
    server_name monitorcx.zxgate.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monitorcx.zxgate.com;

    ssl_certificate /etc/nginx/ssl/zxgate-origin.pem;
    ssl_certificate_key /etc/nginx/ssl/zxgate-origin.key;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

## GitHub Actions 部署到 VPS

仓库已经包含部署 workflow：

```text
.github/workflows/deploy-vps.yml
```

需要在 GitHub 仓库中配置：

`Settings -> Secrets and variables -> Actions -> Secrets`

| Secret | 示例 | 说明 |
| --- | --- | --- |
| `DEPLOY_HOST` | `172.245.71.159` | VPS IP |
| `DEPLOY_PORT` | `22` | SSH 端口 |
| `DEPLOY_USER` | `root` | SSH 用户 |
| `DEPLOY_SSH_KEY` | 私钥全文 | 用于登录 VPS 的私钥 |

可选变量：

`Settings -> Secrets and variables -> Actions -> Variables`

| Variable | 默认值 | 说明 |
| --- | --- | --- |
| `DEPLOY_PATH` | `/opt/registerforchatgpt` | 线上部署目录 |

注意：

- `.env` 默认由你在线上手动维护。
- Actions 只同步代码并重启 Docker。
- 不需要把 `.env` 放进 GitHub。

## CLIProxyAPI Plus / CPA 对接

如果 CLIProxyAPI Plus 和 zxai 在同一台 VPS 上，推荐让两个容器加入同一个 Docker 网络，然后使用容器名访问。

### 1. CLIProxyAPI Plus 示例

```yaml
services:
  cliproxyapiplus:
    image: eceasy/cli-proxy-api-plus:v6.9.2-0
    container_name: cliproxyapiplus
    restart: unless-stopped
    ports:
      - "127.0.0.1:8318:8317"
    volumes:
      - /opt/cliproxyapiplus/config.yaml:/CLIProxyAPI/config.yaml
      - /opt/cliproxyapiplus/auth:/root/.cli-proxy-api
    networks:
      - default

networks:
  default:
    external: true
    name: zxx_net
```

zxai 的 `docker-compose.deploy.yml` 默认会加入：

```text
zxx_net
```

### 2. 后台设置

进入：

```text
设置 -> ChatGPT -> CPA 面板
```

填写：

```text
API URL: http://cliproxyapiplus:8317
API Key: cliproxyapiplus config.yaml 里的 secret-key
```

进入：

```text
设置 -> CLIProxyAPI -> 管理面板
```

填写：

```text
API URL: http://cliproxyapiplus:8317
管理口令: 同一个 secret-key
```

如果不用 Docker 网络，也可以走宿主机映射：

```text
http://127.0.0.1:8318
```

但从 zxai 容器内访问时，容器名方式更稳定。

### 3. 快速测试

在 VPS 上执行：

```bash
docker exec any-auto-register python -c "import requests; r=requests.get('http://cliproxyapiplus:8317/v0/management/auth-files', headers={'Authorization':'Bearer 你的secret-key'}, timeout=10); print(r.status_code); print(r.text[:300])"
```

返回 `200` 说明容器网络和管理口令都正确。

## 代理配置

进入：

```text
代理 -> 添加代理
```

支持以下格式：

```text
http://user:pass@host:port
socks5://user:pass@host:port
host:port:user:pass
```

说明：

- `host:port:user:pass` 默认按 HTTP 代理处理。
- SOCKS5 请明确写 `socks5://user:pass@host:port`。
- HTTP 代理必须支持 `CONNECT auth.openai.com:443`，否则 ChatGPT 注册链路无法使用。
- 导入后建议先点“检测全部”。

### 1024Proxy 使用建议

如果使用 1024Proxy：

- 动态住宅流量的 HTTP 线路可能只能访问普通 HTTP，不一定支持 OpenAI 的 HTTPS CONNECT。
- SOCKS5 线路通常要写成标准格式：`socks5://user:pass@host:port`。
- 长效静态 ISP 可以先测 `auth.openai.com`，不要一条 IP 连续跑大量注册。

手动测试 HTTP CONNECT：

```bash
curl --proxy http://host:port \
  --proxy-user 'user:pass' \
  https://auth.openai.com/create-account/password -I
```

看到：

```text
HTTP/1.1 200 Connection established
```

说明代理至少能建立 HTTPS 隧道。

## 日常使用流程

### 1. 登录

打开域名或本地地址，输入管理员密钥进入后台。

### 2. 配置 CPA

进入设置页，填好：

- CPA 面板 API URL。
- CPA 面板 API Key。
- CLIProxyAPI 管理面板 URL。
- CLIProxyAPI 管理口令。

### 3. 配置代理

进入代理页：

- 批量粘贴代理。
- 填地区标签。
- 导入。
- 检测。

### 4. 注册账号

进入账号页，点击注册：

- 注册数量：建议先 `1`。
- 并发数：建议先 `1`。
- 延迟：建议 `20` 秒以上。
- Token 方案：默认使用有 RT。

跑通后再逐步增加数量。

### 5. 看实时任务

进入总览页：

- 可以看到当前任务。
- 可以看到线程进度。
- 可以看到 CPA 热力图。
- 手机启动任务后，Mac 打开同一个后台也能看到当前活跃任务。

### 6. 状态同步和补传

账号页支持：

- 状态同步。
- 补传远端未发现。
- 删除账号。
- 导入导出。

补传会逐个账号检查和上传，不是一次性秒传。账号多时会比较慢。

## 移动端使用

支持 iPhone Safari / Chrome 打开后台。

建议：

- 用域名访问，不要直接用 IP。
- 如果页面显示旧样式，先刷新缓存。
- 注册任务可以在手机端启动，Mac 端总览页会自动发现活跃任务。
- 小屏主要适合查看状态、启动小批量任务、看日志，不建议在手机上做大量表格维护。

## 常见问题

### 1. 页面要求登录

说明服务器设置了 `ZXAI_ADMIN_KEY` 或 `APP_ADMIN_KEY`。输入对应密钥即可。

### 2. 手机启动任务，Mac 看不到

请确认已经部署最新版本。最新版本会通过 `/api/tasks/active` 从服务端发现活跃任务。

### 3. CPA 上传失败

先测容器网络：

```bash
docker exec any-auto-register python -c "import requests; r=requests.get('http://cliproxyapiplus:8317/v0/management/auth-files', headers={'Authorization':'Bearer 你的secret-key'}, timeout=10); print(r.status_code); print(r.text[:300])"
```

常见原因：

- API URL 填错。
- API Key 不是 CLIProxyAPI Plus 的 `secret-key`。
- zxai 容器没有加入 `zxx_net`。
- CLIProxyAPI Plus 容器没有运行。

### 4. HTTP 代理检测失败

如果错误类似：

```text
CONNECT tunnel failed
```

说明代理不能访问 HTTPS 目标站点。请换支持 HTTPS CONNECT 的 HTTP 代理，或使用 SOCKS5。

### 5. Playwright 不支持 SOCKS5 认证

Chromium 对带账号密码的 SOCKS5 支持有限。项目会在部分 Sentinel 场景跳过浏览器方式并回退到 HTTP PoW。若仍失败，优先尝试支持 HTTPS CONNECT 的 HTTP 代理。

### 6. VPS 内存偏高

小 VPS 建议：

- 并发数先设 `1`。
- `SOLVER_BROWSER_TYPE=chromium`。
- `INSTALL_CAMOUFOX=0`。
- 不要一次性跑大量账号。

查看资源：

```bash
free -h
df -h
docker system df
```

### 7. Docker 端口占用

查看容器：

```bash
docker ps -a
```

查看日志：

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f app
```

## 目录结构

```text
any-auto-register/
├── api/                    # FastAPI 接口
├── core/                   # 数据库、代理、任务运行时
├── frontend/               # React 前端
├── platforms/chatgpt/      # ChatGPT 注册、刷新、上传逻辑
├── services/               # Solver 和外部服务
├── static/                 # 前端构建产物
├── tests/                  # 测试
├── Dockerfile
├── docker-compose.yml
├── docker-compose.deploy.yml
├── main.py
└── requirements.txt
```

## 开发命令

前端构建：

```bash
cd frontend
npm run build
```

后端语法检查：

```bash
.venv/bin/python -m py_compile api/tasks.py core/task_runtime.py main.py
```

常用测试：

```bash
.venv/bin/python -m unittest discover tests
```

## 是否适合交给别人用

可以，但建议满足这几个条件再交付：

- 已经配置好管理员密钥。
- 已经配置好 CPA API URL 和 API Key。
- 已经导入并检测过代理。
- 已经至少跑通过 `1` 个账号。
- 使用者知道入口是“总览、账号、历史、代理、设置”这五个页面。

如果是完全小白，建议先让他只做三件事：

1. 去账号页点注册。
2. 去总览页看进度。
3. 遇到失败只看热力图和日志，不要乱改设置。

## License

MIT License。请自行确认使用场景、账号来源、代理来源和外部服务配置的合规性。
