import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MaintenanceConfig, MonitorState, MonitorTarget } from '@/types/config'
import { KVNamespace } from '@cloudflare/workers-types'
import { pageConfig, workerConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'
import Footer from '@/components/Footer'
import { useEffect, useState } from 'react'
import { getMaintenancesFromGithub } from '@/util/maintenance'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

export default function Home({
  state: stateStr,
  monitors,
}: {
  state: string
  monitors: MonitorTarget[]
  tooltip?: string
  statusPageLink?: string
}) {
  let state
  if (stateStr !== undefined) {
    state = JSON.parse(stateStr) as MonitorState
  }

  const [maintenances, setMaintenances] = useState<MaintenanceConfig[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getMaintenancesFromGithub()
        if (!cancelled) {
          setMaintenances(data)
        }
      } catch (e) {
        console.error('Failed to load maintenances from GitHub', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  const monitorId =
    typeof window !== 'undefined' ? window.location.hash.substring(1) : ''
  if (monitorId) {
    const monitor = monitors.find((monitor) => monitor.id === monitorId)
    if (!monitor || !state) {
      return <Text fw={700}>Monitor with id {monitorId} not found!</Text>
    }
    return (
      <div style={{ maxWidth: '810px' }}>
        <MonitorDetail monitor={monitor} state={state} maintenances={maintenances} />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>

      <main className={inter.className}>
        <Header />

        {state == undefined ? (
          <Center>
            <Text fw={700}>
              Monitor State is not defined now, please check your worker&apos;s status and KV
              binding!
            </Text>
          </Center>
        ) : (
          <div>
            <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
            <MonitorList monitors={monitors} state={state} maintenances={maintenances} />
          </div>
        )}

        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  // Read state as string from KV, to avoid hitting server-side cpu time limit
  const state = (await UPTIMEFLARE_STATE?.get('state')) as unknown as MonitorState

  // Only present these values to client
  const monitors = workerConfig.monitors.map((monitor) => {
    const base: any = {
      id: monitor.id,
      name: monitor.name,
    }

    // 仅在有值时再添加可选字段，避免 undefined 进入 JSON
    if (monitor.tooltip) {
      // @ts-ignore
      base.tooltip = monitor.tooltip
    }
    if (monitor.statusPageLink) {
      // @ts-ignore
      base.statusPageLink = monitor.statusPageLink
    }
    if (typeof monitor.hideLatencyChart === 'boolean') {
      // @ts-ignore
      base.hideLatencyChart = monitor.hideLatencyChart
    }

    return base
  })

  return { props: { state, monitors } }
}
