import * as api from '@/api'
import { config } from '@/data'
import { fs } from '@/filesystem'
import { useNotification } from 'naive-ui'

export async function loadFS() {
  const zip = await api.load()
  await fs.loadZip(zip)
}

export async function saveFS() {
  const zip = await fs.saveZip()
  await api.save(zip)
}

export async function loadCfg() {
  config.value = await api.loadConfig()
}

export async function saveCfg() {
  if (config.value) {
    await api.saveConfig(config.value)
  }
}

export function useLoader() {
  const notification = useNotification()
  return {
    async saveFS() {
      await saveFS();
      notification.create({
        title: 'Save Success',
        duration: 5000,
        closable: false
      })
    },
    async loadFS() {
      await loadFS();
      notification.create({
        title: 'Load Success',
        duration: 5000,
        closable: false
      })
    }
  }
}
