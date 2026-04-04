# GitHub Actions 部署到 VPS

这套仓库已经提供了基于 Docker 的 VPS 自动部署链路：

- Workflow: `.github/workflows/deploy-vps.yml`
- 远端部署脚本: `scripts/deploy_remote.sh`
- 线上专用 Compose 覆盖: `docker-compose.deploy.yml`
- 环境变量模板: `.env.example`

## 适用场景

- 代码推到 GitHub 私有仓库
- 每次推送 `main` 后，GitHub Actions 自动 SSH 到 Debian VPS
- 同步代码，复用 VPS 上已经手动准备好的 `.env`，然后执行 `docker compose up -d --build`

## 1. VPS 一次性准备

在 Debian 12 VPS 上先装 Docker：

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker "$USER"
```

重新登录一次 shell 后确认：

```bash
docker version
docker compose version
```

再创建部署目录：

```bash
sudo mkdir -p /opt/registerforchatgpt
sudo chown -R "$USER":"$USER" /opt/registerforchatgpt
```

## 2. GitHub 仓库 Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 里新增这些 `Secrets`：

- `DEPLOY_HOST`
  你的 VPS IP，例如 `172.245.71.159`
- `DEPLOY_PORT`
  SSH 端口，默认 `22`
- `DEPLOY_USER`
  SSH 用户名，例如 `root` 或你自己的部署用户
- `DEPLOY_SSH_KEY`
  用于登录 VPS 的私钥全文

## 3. GitHub 仓库 Variables

新增一个 `Repository variable`：

- `DEPLOY_PATH`
  建议值：`/opt/registerforchatgpt`

## 4. 在线上手动准备 `.env`

先在 VPS 的部署目录准备 `.env`：

```bash
cd /opt/registerforchatgpt
nano .env
```

可以直接参考仓库里的 `.env.example`。至少建议改掉：

- `APP_JWT_SECRET`
- `SMSTOME_COOKIE`（如果你会用）

对小内存 VPS，默认建议保持：

- `SOLVER_BROWSER_TYPE=chromium`
- `INSTALL_CAMOUFOX=0`

这会显著减小镜像体积并缩短首次构建时间。

## 5. 触发部署

推送到 `main` 就会自动部署：

```bash
git push origin main
```

也可以在 GitHub Actions 页面手动点 `Deploy To VPS` 的 `Run workflow`。

## 6. VPS 上的运行方式

部署脚本实际执行的是：

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --build --remove-orphans
```

服务会长期运行。`docker-compose.yml` 已经带了：

```yaml
restart: unless-stopped
```

所以 Docker 和 VPS 重启后，容器会自动恢复。

## 7. 常用排查命令

在 VPS 上查看状态：

```bash
cd /opt/registerforchatgpt
docker compose -f docker-compose.yml -f docker-compose.deploy.yml ps
docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f app
```

查看资源：

```bash
free -h
df -h
```

## 8. 建议

- 你的 3.5 GB 内存 VPS 适合长期挂着跑，但并发建议从 `1` 开始
- 代理、平台、邮箱等业务配置，优先通过 Web UI 写入数据库，不要全塞进 `.env`
- `.env` 更适合放部署层设置和少量必须的密钥
