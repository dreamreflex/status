import type { MaintenanceConfig } from '@/types/config'

const DEFAULT_OWNER = process.env.NEXT_PUBLIC_MAINTENANCE_REPO_OWNER || 'dreamreflex'
const DEFAULT_REPO = process.env.NEXT_PUBLIC_MAINTENANCE_REPO_NAME || 'status'
const DEFAULT_BRANCH = process.env.NEXT_PUBLIC_MAINTENANCE_REPO_BRANCH || 'main'
const DEFAULT_INDEX =
  process.env.NEXT_PUBLIC_MAINTENANCE_INDEX || 'maintenance/index.md'
const DEFAULT_REF = `refs/heads/${DEFAULT_BRANCH}`

const RAW_BASE = 'https://raw.githubusercontent.com'

function parseFrontMatter(
  raw: string
): { meta: Record<string, string | string[]>; body: string } {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('---')) {
    return { meta: {}, body: trimmed }
  }

  const lines = trimmed.split(/\r?\n/)
  if (lines[0].trim() !== '---') {
    return { meta: {}, body: trimmed }
  }

  const metaLines: string[] = []
  let i = 1
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '---') {
      i++
      break
    }
    metaLines.push(line)
  }
  const body = lines.slice(i).join('\n').trim()

  const meta: Record<string, string | string[]> = {}

  const unquote = (value: string) => {
    const v = value.trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      return v.slice(1, -1)
    }
    return v
  }

  for (const line of metaLines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    const idx = trimmedLine.indexOf(':')
    if (idx === -1) continue
    const key = trimmedLine.slice(0, idx).trim()
    let value = trimmedLine.slice(idx + 1).trim()

    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim()
      const arr =
        inner.length === 0
          ? []
          : inner
              .split(',')
              .map((v) => unquote(v))
              .filter((v) => v.length > 0)
      meta[key] = arr
    } else {
      meta[key] = unquote(value)
    }
  }

  return { meta, body }
}

function parseMaintenanceMarkdown(
  content: string,
  fileName: string
): MaintenanceConfig | null {
  const { meta, body } = parseFrontMatter(content)

  const monitorsRaw = meta.monitors
  let monitors: string[] | undefined
  if (Array.isArray(monitorsRaw)) {
    monitors = monitorsRaw
  } else if (typeof monitorsRaw === 'string' && monitorsRaw.trim().length > 0) {
    monitors = monitorsRaw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
  }

  const start =
    (meta.start as string | undefined) ||
    (meta.begin as string | undefined) ||
    (meta.from as string | undefined)

  if (!start) {
    // 没有开始时间的记录忽略
    return null
  }

  const end =
    (meta.end as string | undefined) ||
    (meta.to as string | undefined) ||
    (meta.until as string | undefined)

  const title =
    (meta.title as string | undefined) ||
    fileName.replace(/\.md$/i, '') ||
    'Scheduled Maintenance'

  const color = meta.color as string | undefined
  const status = meta.status as string | undefined
  const type = meta.type as string | undefined
  const id = meta.id as string | undefined

  const finalBody =
    (meta.body as string | undefined && String(meta.body).trim().length > 0
      ? String(meta.body)
      : body) || ''

  const maintenance: MaintenanceConfig = {
    monitors,
    title,
    body: finalBody,
    start,
    end,
    color,
    status,
    type,
    id,
  }

  return maintenance
}

async function fetchMaintenancesFromGithubOnce(): Promise<MaintenanceConfig[]> {
  const owner = DEFAULT_OWNER
  const repo = DEFAULT_REPO
  const ref = DEFAULT_REF
  const indexPath = DEFAULT_INDEX
  const indexDir =
    indexPath.lastIndexOf('/') >= 0
      ? indexPath.slice(0, indexPath.lastIndexOf('/'))
      : ''

  const indexUrl = `${RAW_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/${encodeURIComponent(ref)}/${indexPath}`

  let indexContent = ''
  try {
    const resp = await fetch(indexUrl, {
      headers: {
        'User-Agent': 'UptimeFlare-Maintenance',
      },
    })
    if (!resp.ok) {
      console.error('Failed to load maintenance index from GitHub raw:', resp.status, indexUrl)
      return []
    }
    indexContent = await resp.text()
  } catch (err) {
    console.error('Error fetching maintenance index from GitHub raw:', err)
    return []
  }

  const filePaths: string[] = []
  for (const lineRaw of indexContent.split(/\r?\n/)) {
    let line = lineRaw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('- ') || line.startsWith('* ')) {
      line = line.slice(2).trim()
    }
    if (!line) continue
    if (!line.toLowerCase().endsWith('.md')) continue

    // 相对路径：基于 index 所在目录
    const fullPath =
      indexDir && !line.includes('/') ? `${indexDir}/${line}` : line
    filePaths.push(fullPath)
  }

  const maintenances: MaintenanceConfig[] = []

  for (const path of filePaths) {
    const url = `${RAW_BASE}/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/${encodeURIComponent(ref)}/${path}`
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'UptimeFlare-Maintenance' },
      })
      if (!resp.ok) continue
      const text = await resp.text()
      const fileName = path.split('/').slice(-1)[0]
      const parsed = parseMaintenanceMarkdown(text, fileName)
      if (parsed) {
        maintenances.push(parsed)
      }
    } catch (err) {
      console.error('Error fetching maintenance markdown from GitHub:', err)
      continue
    }
  }

  // 按开始时间倒序排序（新的在前）
  maintenances.sort((a, b) => {
    const ta = new Date(a.start).getTime()
    const tb = new Date(b.start).getTime()
    return tb - ta
  })

  return maintenances
}

let cache: MaintenanceConfig[] | null = null
let cacheTime = 0
const CACHE_TTL_MS = 60 * 1000

export async function getMaintenancesFromGithub(): Promise<MaintenanceConfig[]> {
  const now = Date.now()
  if (cache && now - cacheTime < CACHE_TTL_MS) {
    return cache
  }
  const data = await fetchMaintenancesFromGithubOnce()
  cache = data
  cacheTime = now
  return data
}
