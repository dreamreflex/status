// This is a simplified example config file for quickstart
// Some not frequently used features are omitted/commented out here
// For a full-featured example, please refer to `uptime.config.full.ts`

// Don't edit this line
import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  // Title for your status page
  title: "云梦镜像状态",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://dreamreflex.com', label: '官网' },
    { link: 'mailto:status@dreamreflex.com', label: '报告问题', highlight: true },
  ],
}

const workerConfig: WorkerConfig = {
  // Define all your monitors here
  monitors: [
    // Example HTTP Monitor
    {
      // `id` should be unique, history will be kept if the `id` remains constant
      id: 'dreamreflex_owa',
      // `name` is used at status page and callback message
      name: '官方网站',
      // `method` should be a valid HTTP Method
      method: 'GET',
      // `target` is a valid URL
      target: 'https://dreamreflex.com',
      // [OPTIONAL] `tooltip` is ONLY used at status page to show a tooltip
      tooltip: '官方网站的运行状态',
      // [OPTIONAL] `statusPageLink` is ONLY used for clickable link at status page
      statusPageLink: 'https://dreamreflex.com',
      // [OPTIONAL] `expectedCodes` is an array of acceptable HTTP response codes, if not specified, default to 2xx
      expectedCodes: [200],
      // [OPTIONAL] `timeout` in millisecond, if not specified, default to 10000
      timeout: 10000,
      // [OPTIONAL] headers to be sent
      headers: {
        'User-Agent': 'Uptimeflare',
      },
      // [OPTIONAL] body to be sent (require POST/PUT/PATCH method)
      // body: 'Hello, world!',
      // [OPTIONAL] if specified, the response must contains the keyword to be considered as operational.
      // responseKeyword: 'success',
      // [OPTIONAL] if specified, the response must NOT contains the keyword to be considered as operational.
      // responseForbiddenKeyword: 'bad gateway',
      // [OPTIONAL] if specified, will call the check proxy to check the monitor, mainly for geo-specific checks
      // refer to docs https://github.com/lyc8503/UptimeFlare/wiki/Check-proxy-setup before setting this value
      // currently supports `worker://`, `globalping://` and `http(s)://` proxies
      // checkProxy: 'worker://weur',
      // [OPTIONAL] if true, the check will fallback to local if the specified proxy is down
      // checkProxyFallback: true,
    },
    {
      id: 'dreamreflex_csa',
      name: 'CSA客户服务应用',
      method: 'GET',
      target: 'https://platform.dreamreflex.com',
      tooltip: 'CSA客户服务应用网站的运行状态',
      statusPageLink: 'https://platform.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'dreamreflex_api',
      name: 'OpenAPI网关',
      method: 'GET',
      target: 'https://api.dreamreflex.com/docs',
      tooltip: 'OpenAPI网关服务的运行状态',
      statusPageLink: 'https://api.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'dreamreflex_doc',
      name: '官方文档',
      method: 'GET',
      target: 'https://doc.dreamreflex.com',
      tooltip: '官方文档的运行状态',
      statusPageLink: 'https://doc.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    }
  ]
}

// You can define multiple maintenances here
// During maintenance, an alert will be shown at status page
// Also, related downtime notifications will be skipped (if any)
// Of course, you can leave it empty if you don't need this feature

// const maintenances: MaintenanceConfig[] = []

const maintenances: MaintenanceConfig[] = [
    {
    // [Optional] Monitor IDs to be affected by this maintenance
    monitors: ['dreamreflex_doc'],
    // [Optional] default to "Scheduled Maintenance" if not specified
    title: '站点缓存维护-降级',
    // Description of the maintenance, will be shown at status page
    body: '文档站点因缓存维护降级',
    // Start time of the maintenance, in UNIX timestamp or ISO 8601 format
    start: '2025-11-07T00:20:00+08:00',
    // [Optional] end time of the maintenance, in UNIX timestamp or ISO 8601 format
    // if not specified, the maintenance will be considered as on-going
    end: '2025-11-07T00:22:00+08:00',
    // [Optional] color of the maintenance alert at status page, default to "yellow"
    color: 'blue',
  },
]

// Don't edit this line
export { maintenances, pageConfig, workerConfig }
