import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

const pageConfig: PageConfig = {
  title: '云梦镜像状态',
  links: [
    { link: 'https://dreamreflex.com', label: '官网' },
    {
      link: '/gen.html',
      label: '生成维护',
    },
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
      target: 'https://pki.dreamreflex.com/api/v1/ca',
      tooltip: '公钥基础设施在线服务的运行状态',
      statusPageLink: 'https://pki.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'dreamreflex_git',
      name: '代码托管平台',
      method: 'GET',
      target: 'https://git.dreamreflex.com',
      tooltip: '代码托管平台',
      statusPageLink: 'https://git.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'dreamreflex_api',
      name: 'OpenAPI网关',
      method: 'GET',
      target: 'https://api.dreamreflex.com/openapi.json',
      tooltip: 'OpenAPI网关服务的运行状态',
      statusPageLink: 'https://api.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'dreamreflex_contract',
      name: '数字合约平台核心API',
      method: 'GET',
      target: 'https://contract-api.dreamreflex.com/',
      tooltip: 'OpenAPI网关服务的运行状态',
      statusPageLink: 'https://contract.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    },
    {
      id: 'dreamreflex_blog',
      name: '云梦镜像博客',
      method: 'GET',
      target: 'https://blog.dreamreflex.com/',
      tooltip: 'OpenAPI网关服务的运行状态',
      statusPageLink: 'https://blog.dreamreflex.com',
      expectedCodes: [200],
      timeout: 10000,
    }
  ],
}

// 维护事件改为由 /maintenance 目录中的 Markdown 驱动
// 这里保留空数组仅用于类型和 Worker 回退逻辑
const maintenances: MaintenanceConfig[] = []

export { maintenances, pageConfig, workerConfig }

