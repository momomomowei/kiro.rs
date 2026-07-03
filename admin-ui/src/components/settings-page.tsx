import { useEffect, useState } from 'react'
import { Boxes, Plus, Power, Sparkles, Timer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  useKvCacheConfig,
  useModelsConfig,
  useRestartService,
  useSetKvCacheConfig,
  useSetModelsConfig,
} from '@/hooks/use-credentials'
import { extractErrorMessage } from '@/lib/utils'
import type { ModelEntry } from '@/types/api'

function KvCachePanel() {
  const { data: cfg, isLoading } = useKvCacheConfig()
  const saveConfig = useSetKvCacheConfig()
  const [efficiency, setEfficiency] = useState(90)
  const [ttl, setTtl] = useState(1800)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!cfg) return
    setEfficiency(Math.round(cfg.cacheReadEfficiency * 100))
    setTtl(cfg.kvCacheTtlSecs)
    setDirty(false)
  }, [cfg])

  const save = () => {
    saveConfig.mutate(
      {
        cacheReadEfficiency: efficiency / 100,
        kvCacheTtlSecs: Math.max(60, ttl),
      },
      {
        onSuccess: () => {
          toast.success('KV Cache 配置已保存')
          setDirty(false)
        },
        onError: (err) => toast.error('保存失败: ' + extractErrorMessage(err)),
      },
    )
  }

  const ttlReadable =
    ttl >= 3600
      ? `${Math.floor(ttl / 3600)} 小时 ${Math.round((ttl % 3600) / 60)} 分钟`
      : `${Math.round(ttl / 60)} 分钟`

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">KV Cache 配置</h2>
            <p className="text-[12px] text-muted-foreground">控制本地缓存读取效率与状态过期时间</p>
          </div>
        </div>
        <Button size="sm" onClick={save} disabled={!dirty || isLoading || saveConfig.isPending}>
          {saveConfig.isPending ? '保存中…' : '保存配置'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <div>
              <h3 className="text-sm font-semibold">缓存效率系数</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                控制模拟缓存命中率。例如 90% 表示将前缀匹配折算为约 90% 的实际缓存率
              </p>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={efficiency}
              onChange={(e) => {
                setEfficiency(Number(e.target.value))
                setDirty(true)
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>50%</span>
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {efficiency}%
              </span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-3.5 w-3.5" />
                缓存 TTL
              </h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                历史 prompt 在内存中的存活时间，超时后不再参与前缀匹配
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={60}
                max={86400}
                step={60}
                value={ttl}
                onChange={(e) => {
                  setTtl(Number(e.target.value) || 1800)
                  setDirty(true)
                }}
                className="tabular-nums"
              />
              <span className="whitespace-nowrap text-sm text-muted-foreground">秒</span>
            </div>
            <p className="text-[11px] text-muted-foreground">= {ttlReadable}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

const emptyModel = (): ModelEntry => ({
  id: '',
  displayName: '',
  kiroModelId: '',
  contextWindow: 200000,
  maxTokens: 64000,
  matchKeywords: [],
  created: Math.floor(Date.now() / 1000),
})

function ModelsPanel() {
  const { data, isLoading } = useModelsConfig()
  const saveModels = useSetModelsConfig()
  const restart = useRestartService()
  const [models, setModels] = useState<ModelEntry[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!data) return
    setModels(data.models)
    setDirty(false)
  }, [data])

  const update = (index: number, patch: Partial<ModelEntry>) => {
    setModels((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))
    setDirty(true)
  }

  const save = () => {
    for (const m of models) {
      if (!m.id.trim() || !m.kiroModelId.trim()) {
        toast.error('模型 ID 和 Kiro 模型 ID 不能为空')
        return
      }
    }
    saveModels.mutate(models, {
      onSuccess: () => {
        toast.success('模型配置已保存并热更新生效')
        setDirty(false)
      },
      onError: (err) => toast.error('保存失败: ' + extractErrorMessage(err)),
    })
  }

  const handleRestart = () => {
    if (!confirm('确定要重启服务吗？服务将短暂中断，由容器或服务管理器自动拉起。')) return
    restart.mutate(undefined, {
      onSuccess: (res) => toast.success(res.message),
      onError: (err) => toast.error('重启失败: ' + extractErrorMessage(err)),
    })
  }

  return (
    <section>
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Boxes className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">模型配置</h3>
                <p className="text-[12px] text-muted-foreground">
                  新增/编辑模型映射，保存即热更新生效
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={restart.isPending}
              title="让外部守护进程拉起服务"
            >
              <Power className="h-3.5 w-3.5" />
              {restart.isPending ? '重启中…' : '重启服务'}
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <div className="space-y-3">
              {models.map((m, i) => (
                <div key={i} className="space-y-2.5 rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-muted-foreground">模型 #{i + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        setModels((prev) => prev.filter((_, idx) => idx !== i))
                        setDirty(true)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <LabeledInput label="对外模型 ID" value={m.id} placeholder="claude-sonnet-5" onChange={(v) => update(i, { id: v })} />
                    <LabeledInput label="展示名" value={m.displayName} placeholder="Claude Sonnet 5" onChange={(v) => update(i, { displayName: v })} />
                    <LabeledInput label="Kiro 上游模型 ID" value={m.kiroModelId} placeholder="claude-sonnet-5" onChange={(v) => update(i, { kiroModelId: v })} />
                    <LabeledInput
                      label="匹配关键词（逗号分隔）"
                      value={m.matchKeywords.join(', ')}
                      placeholder="sonnet-5, sonnet5"
                      onChange={(v) =>
                        update(i, {
                          matchKeywords: v.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                    <LabeledInput label="上下文窗口" value={String(m.contextWindow)} placeholder="200000" onChange={(v) => update(i, { contextWindow: Number(v) || 0 })} />
                    <LabeledInput label="最大输出 Token" value={String(m.maxTokens)} placeholder="64000" onChange={(v) => update(i, { maxTokens: Number(v) || 0 })} />
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-dashed"
                onClick={() => {
                  setModels((prev) => [...prev, emptyModel()])
                  setDirty(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                新增模型
              </Button>

              <div className="flex justify-end">
                <Button size="sm" onClick={save} disabled={!dirty || saveModels.isPending}>
                  {saveModels.isPending ? '保存中…' : '保存并生效'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function LabeledInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="animate-fade-in space-y-8">
      <KvCachePanel />
      <ModelsPanel />
    </div>
  )
}
