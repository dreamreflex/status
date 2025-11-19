import type { MaintenanceConfig } from '@/types/config'

type GitHubContentItem = {
  name: string
  path: string
  type: string
  download_url?: string
}

const DEFAULT_OWNER = process.env.NEXT_PUBLIC_MAINTENANCE_REPO_OWNER || 'dreamreflex'
const DEFAULT_REPO = process.env.NEXT_PUBLIC_MAINTENANCE_REPO_NAME || 'status'
const DEFAULT_BRANCH = process.env.NEXT_PUBLIC_MAINTENANCE_REPO_BRANCH || 'main'
const DEFAULT_DIR = process.env.NEXT_PUBLIC_MAINTENANCE_DIR || 'maintenance'

const API_BASE = 'https://api.github.com'

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

async function fetchGitHubMaintenanceFiles(): Promise<GitHubContentItem[]> {
  const owner = DEFAULT_OWNER
  const repo = DEFAULT_REPO
  const branch = DEFAULT_BRANCH
  const dir = DEFAULT_DIR

  const url = `${API_BASE}/repos/${encodeURIComponent(
    owner
  )}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(
    dir
  )}?ref=${encodeURIComponent(branch)}`

  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'UptimeFlare-Maintenance',
      },
    })
    if (!resp.ok) {
      console.error('Failed to load maintenance list from GitHub:', resp.status, url)
      return []
    }
    const data = (await resp.json()) as GitHubContentItem[] | any
    if (!Array.isArray(data)) return []
    return data.filter(
      (item) =>
        item.type === 'file' &&
        typeof item.name === 'string' &&
        item.name.toLowerCase().endsWith('.md')
    )
  } catch (err) {
    console.error('Error fetching maintenance list from GitHub:', err)
    return []
  }
}

async function fetchMaintenancesFromGithubOnce(): Promise<MaintenanceConfig[]> {
  const files = await fetchGitHubMaintenanceFiles()
  const maintenances: MaintenanceConfig[] = []

  for (const file of files) {
    if (!file.download_url) continue
    try {
      const resp = await fetch(file.download_url, {
        headers: { 'User-Agent': 'UptimeFlare-Maintenance' },
      })
      if (!resp.ok) continue
      const text = await resp.text()
      const parsed = parseMaintenanceMarkdown(text, file.name)
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
