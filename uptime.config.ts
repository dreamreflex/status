import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'
const pageConfig: PageConfig = {
  title: "云梦镜像状态",
  links: [
    { link: 'https://dreamreflex.com', label: '官网' },
    { link: 'https://github.com/dreamreflex/status/wiki/History-Maintenance-Event', label: '历史维护'},
    { link: 'mailto:status@dreamreflex.com', label: '报告问题', highlight: true },
  ],
}
const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'dreamreflex_owa',
      name: '官方网站',
      method: 'GET',
      target: 'https://dreamreflex.com',
      tooltip: '官方网站的运行状态',
      statusPageLink: 'https://dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
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
    },
    {
      id: 'dreamreflex_pki',
      name: '公钥基础设施在线服务',
      method: 'GET',
      target: 'https://api.dreamreflex.com/api/pki/status',
      tooltip: 'CSA客户服务应用网站的运行状态',
      statusPageLink: 'https://platform.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    }
  ]
}
const maintenances: MaintenanceConfig[] = [
    {
    monitors: ['dreamreflex_doc'],
    title: '站点缓存维护-降级',
    body: '文档站点因缓存维护降级',
    start: '2025-11-07T00:20:00+08:00',
    end: '2025-11-07T00:22:00+08:00',
    color: 'blue',
  },
  {
    monitors: ['dreamreflex_api'],
    title: 'API安全升级',
    body: '处理了披露出来的CVE安全告警，将会对项目进行安全升级',
    start: '2025-11-08T15:00:00+08:00',
    end:   '2025-11-08T17:00:00+08:00',
    color: 'blue',
  },
    {
    monitors: ['dreamreflex_api'],
    title: 'API功能升级',
    body: '升级API能力与CSA服务适配，将会在迁移过程中出现不可用的情况',
    start: '2025-11-09T14:00:00+08:00',
    end:   '2025-11-09T14:15:00+08:00',
    color: 'blue',
  },
]
export { maintenances, pageConfig, workerConfig }
