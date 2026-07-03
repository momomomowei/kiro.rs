# 本地 Fork Docker 构建与运行说明

这个仓库是 fork 后做过本地修改的版本。日常使用时要把“构建本地镜像”和“运行本地镜像”分开，避免每次启动都触发 Rust release 全量编译。

## 文件用途

### `docker-compose.local.yml`

用于从当前源码构建本地镜像：

```yaml
image: kiro-rs:local
build:
  context: .
  dockerfile: Dockerfile
```

适合在修改了 Rust / 前端代码后使用。

### `docker-compose.local-run.yml`

用于运行已经构建好的本地镜像：

```yaml
image: kiro-rs:local
container_name: kiro-admin
```

这个文件不包含 `build:`，所以启动时不会重新编译项目。

## 推荐流程

### 1. 修改代码后构建本地镜像

```powershell
docker compose -f docker-compose.local.yml build
```

这一步会生成或更新本地镜像：

```text
kiro-rs:local
```

### 2. 运行本地镜像

```powershell
docker compose -f docker-compose.local-run.yml up -d
```

如果服务器上已经有同名容器 `kiro-admin`，先强制删除旧容器：

```powershell
docker rm -f kiro-admin
docker compose -f docker-compose.local-run.yml up -d
```

或者强制重建容器：

```powershell
docker compose -f docker-compose.local-run.yml up -d --force-recreate
```

## 常用命令

查看日志：

```powershell
docker compose -f docker-compose.local-run.yml logs -f --tail=200
```

停止服务：

```powershell
docker compose -f docker-compose.local-run.yml down
```

查看当前运行容器：

```powershell
docker ps
```

查看本地镜像：

```powershell
docker images kiro-rs
```

## 不推荐的命令

不要用这个作为日常启动命令：

```powershell
docker compose -f docker-compose.local.yml up -d --build
```

原因是 `--build` 会走 `docker-compose.local.yml` 里的 `build:`，只要 Docker 缓存失效，就会重新执行：

```dockerfile
RUN cargo build --release --no-default-features
```

这一步可能非常慢，出现十几分钟构建时间是正常的。

## 线上同步运行方式

`docker-compose.local-run.yml` 按线上运行习惯配置：

- 容器名：`kiro-admin`
- 镜像：`kiro-rs:local`
- 端口：`127.0.0.1:8990:8990`
- 配置目录：`./data/:/app/config/`
- 内存限制：`512m`
- 外部网络：`sub2api-shared-network`

如果目标机器还没有外部网络，需要先创建：

```powershell
docker network create sub2api-shared-network
```
