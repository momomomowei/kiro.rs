import { useEffect, useState } from 'react'
import { Download, RefreshCw, Save, UploadCloud } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  applyImageUpdate,
  getUpdateConfig,
  pullUpdateImage,
  setUpdateConfig,
} from '@/api/credentials'
import { extractErrorMessage } from '@/lib/utils'

interface ImageUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageUpdateDialog({ open, onOpenChange }: ImageUpdateDialogProps) {
  const queryClient = useQueryClient()
  const [image, setImage] = useState('')
  const [composeFile, setComposeFile] = useState('')
  const [service, setService] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [lastOutput, setLastOutput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['update-config'],
    queryFn: getUpdateConfig,
    enabled: open,
  })

  useEffect(() => {
    if (!data) return
    setImage(data.image || '')
    setComposeFile(data.composeFile || '')
    setService(data.service || '')
    setGithubToken('')
  }, [data])

  const saveMutation = useMutation({
    mutationFn: () =>
      setUpdateConfig({
        image: image.trim(),
        composeFile: composeFile.trim(),
        service: service.trim(),
        githubToken: githubToken.trim(),
      }),
    onSuccess: () => {
      toast.success('更新配置已保存')
      setGithubToken('')
      queryClient.invalidateQueries({ queryKey: ['update-config'] })
    },
    onError: (err) => toast.error(`保存失败: ${extractErrorMessage(err)}`),
  })

  const pullMutation = useMutation({
    mutationFn: pullUpdateImage,
    onSuccess: (res) => {
      setLastOutput(res.output || res.message)
      toast.success(res.message)
    },
    onError: (err) => toast.error(`拉取失败: ${extractErrorMessage(err)}`),
  })

  const applyMutation = useMutation({
    mutationFn: applyImageUpdate,
    onSuccess: (res) => {
      setLastOutput(res.output || res.message)
      toast.success(res.message)
    },
    onError: (err) => toast.error(`更新失败: ${extractErrorMessage(err)}`),
  })

  const busy = isLoading || saveMutation.isPending || pullMutation.isPending || applyMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            镜像在线更新
          </DialogTitle>
          <DialogDescription>
            从 GitHub Container Registry 拉取镜像；配置 compose 文件后可在线重建服务。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">GitHub / GHCR</div>
                <div className="text-xs text-muted-foreground">
                  Token 不会回显；留空保存时会保留现有 Token。
                </div>
              </div>
              <Badge variant={data?.githubTokenConfigured ? 'success' : 'secondary'}>
                {data?.githubTokenConfigured ? 'Token 已配置' : 'Token 未配置'}
              </Badge>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">镜像</span>
                <Input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="ghcr.io/owner/kiro-rs:latest"
                  disabled={busy}
                  className="font-mono text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">GitHub Token</span>
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder={data?.githubTokenConfigured ? '已配置，留空则保留当前 Token' : '可选：ghp_...'}
                  disabled={busy}
                  className="font-mono text-sm"
                />
              </label>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div>
              <div className="text-sm font-medium">Docker Compose 应用更新</div>
              <div className="text-xs text-muted-foreground">
                容器内使用时需要挂载 Docker socket 和 compose 文件；不配置 compose 文件时只能拉取镜像。
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Compose 文件路径</span>
                <Input
                  value={composeFile}
                  onChange={(e) => setComposeFile(e.target.value)}
                  placeholder="/app/config/docker-compose.yml"
                  disabled={busy}
                  className="font-mono text-sm"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Service</span>
                <Input
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="kiro-rs"
                  disabled={busy}
                  className="font-mono text-sm"
                />
              </label>
            </div>
          </div>

          {lastOutput && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">最近输出</div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
                {lastOutput}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !image.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存配置
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => pullMutation.mutate()}
            >
              {pullMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              拉取镜像
            </Button>
          </div>
          <Button
            type="button"
            disabled={busy || !composeFile.trim() || !service.trim()}
            onClick={() => applyMutation.mutate()}
          >
            {applyMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4 mr-2" />
            )}
            更新并应用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
