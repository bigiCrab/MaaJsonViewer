<script setup lang="ts">
import {
  CropFreeOutlined,
  EditOutlined,
  SaveAltRound,
  SyncOutlined
} from '@vicons/material'
import { useClipboard } from '@vueuse/core'
import { Buffer } from 'buffer'
import { NButton, NCard, NIcon, NInput, NInputNumber, NModal } from 'naive-ui'
import { computed, nextTick, onActivated, onDeactivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { type FileContentRef, type PathKey, fs, path, pool } from '@/filesystem'
import type { Rect } from '@/types'

import NavigationButtons from '@/components/NavigationButtons.vue'
import ChooseDir from '@/components/filesystem/ChooseDir.vue'
import MonitorView from '@/components/framework/MonitorView.vue'

const alive = ref(false)

onActivated(() => {
  alive.value = true
})

onDeactivated(() => {
  alive.value = false
})

const router = useRouter()

const monitor = ref<InstanceType<typeof MonitorView> | null>(null)
const targetEl = ref<HTMLCanvasElement | null>(null)
const cropEl = ref<HTMLCanvasElement | null>(null)
const curPos = ref<[number, number]>([0, 0])
const oldPos = ref<[number, number] | null>(null)
const newPos = ref<[number, number] | null>(null)
const oldTimestamp = ref<number | null>(null)
const newTimestamp = ref<number | null>(null)

watch(targetEl, el => {
  if (el) {
    const fix = (x: number, s: number) => {
      x = Math.round(x)
      if (x < 0) {
        x = 0
      }
      if (x > s) {
        x = s
      }
      return x
    }
    const getTimestamp = () => {
      return new Date().getTime()
    }
    el.onpointermove = ev => {
      curPos.value = [fix(ev.offsetX, 1280), fix(ev.offsetY, 720)]
      render()
    }
    el.onpointerdown = ev => {
      el.setPointerCapture(ev.pointerId)
      oldPos.value = [...curPos.value]
      oldTimestamp.value = getTimestamp()
      newTimestamp.value = null
      newPos.value = null
      render()
    }
    el.onpointerup = ev => {
      if (!oldPos.value) {
        return
      }
      el.releasePointerCapture(ev.pointerId)
      if (
        curPos.value[0] === oldPos.value?.[0] &&
        curPos.value[1] === oldPos.value[1]
      ) {
        oldPos.value = null
        oldTimestamp.value = null
      } else {
        newPos.value = [...curPos.value]
        newTimestamp.value = getTimestamp()
      }
      render()
    }
  }
})

const imageURL = ref<string>('')
const image = ref<HTMLImageElement | null>(null)
const rect = computed<Rect | null>(() => {
  if (!oldPos.value) {
    return null
  }
  const np = newPos.value ? newPos.value : curPos.value
  const l = Math.min(oldPos.value[0], np[0])
  const r = Math.max(oldPos.value[0], np[0])
  const t = Math.min(oldPos.value[1], np[1])
  const b = Math.max(oldPos.value[1], np[1])
  return [l, t, r - l, b - t]
})
const suggestPadding = ref<number>(50)
const suggestRect = computed<Rect | null>(() => {
  if (!rect.value) {
    return null
  }
  const l = Math.max(rect.value[0] - suggestPadding.value, 0)
  const t = Math.max(rect.value[1] - suggestPadding.value, 0)
  const r = Math.min(rect.value[0] + rect.value[2] + suggestPadding.value, 1280)
  const b = Math.min(rect.value[1] + rect.value[3] + suggestPadding.value, 720)
  return [l, t, r - l, b - t]
})
const clickDuration = computed<number | null>(() => {
  if (!newTimestamp.value || !oldTimestamp.value) {
    return null
  }
  return newTimestamp.value - oldTimestamp.value
})

function render() {
  const cvs = targetEl.value
  if (!cvs) {
    return
  }
  const ctx = cvs.getContext('2d')!
  ctx.clearRect(0, 0, 1280, 720)
  if (image.value) {
    ctx.drawImage(image.value, 0, 0)
    if (oldPos.value) {
      const [l, t, w, h] = rect.value!
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillRect(l, t, w, h)

      nextTick(() => {
        const crop = cropEl.value
        if (!crop) {
          return
        }
        crop.width = w
        crop.height = h
        crop.setAttribute('style', `width:${w}px;height:${h}px`)
        const ctx = crop.getContext('2d')
        ctx?.drawImage(image.value!, l, t, w, h, 0, 0, w, h)
      })
    }
  }
}

function takeImage() {
  image.value = monitor.value?.imageEle?.cloneNode() as HTMLImageElement
  if (image) {
    // TODO remove URL part
    imageURL.value = image.value.src
    // imageURL.value = url
    // image.value = new Image()
    // image.value.src = imageURL.value
    image.value.onload = () => {
      const cvs = targetEl.value!
      cvs.width = 1280
      cvs.height = 720
      render()
    }
  }
}

const showSave = ref(false)
const targetDir = ref('/')
const targetFile = ref('test')
const isExists = computed(() => {
  return fs.tree.existsFile(
    path.joinkey(targetDir.value as PathKey, targetFile.value + '.png')
  )
})

function requireSave() {
  showSave.value = true
}

function doSave() {
  const data = Buffer.from(
    cropEl.value!.toDataURL().replace('data:image/png;base64,', ''),
    'base64'
  )
  fs.tree.writeFile(
    path.joinkey(targetDir.value as PathKey, targetFile.value + '.png'),
    pool.put(data.buffer)
  )
  showSave.value = false
}

const { copy } = useClipboard()
</script>

<template>
  <NModal v-model:show="showSave">
    <NCard
      style="width: 60vw"
      content-style="display:flex;flex-direction:column;gap:0.5rem"
    >
      <ChooseDir v-model:value="targetDir"></ChooseDir>
      <NInput v-model:value="targetFile">
        <template #suffix> .png </template>
      </NInput>
      <span v-if="isExists"> {{ targetDir }}{{ targetFile }}.png 已存在 </span>

      <template #action>
        <NButton @click="doSave"> 保存 </NButton>
      </template>
    </NCard>
  </NModal>

  <div class="flex flex-col gap-2">
    <div class="flex gap-2">
      <NavigationButtons></NavigationButtons>
      <NButton
        @click="takeImage"
        title="takeImage"
        :disabled="!monitor?.imageEle"
      >
        <template #icon>
          <NIcon>
            <CropFreeOutlined></CropFreeOutlined>
          </NIcon>
        </template>
      </NButton>
      <NButton
        @click="imageURL = ''"
        title="clearImage"
        :disabled="imageURL === ''"
      >
        <template #icon>
          <NIcon>
            <SyncOutlined></SyncOutlined>
          </NIcon>
        </template>
      </NButton>
      <NButton
        @click="requireSave"
        title="saveImage"
        :disabled="!imageURL || !rect"
      >
        <template #icon>
          <NIcon>
            <SaveAltRound></SaveAltRound>
          </NIcon>
        </template>
      </NButton>
    </div>
    <MonitorView
      v-if="alive"
      v-show="!imageURL"
      ref="monitor"
      :width="1280"
      :height="720"
    ></MonitorView>
    <!-- action log -->
    <div class="flex gap-2">
      <canvas
        v-if="imageURL"
        ref="targetEl"
        style="width: 1280px; height: 720px"
      ></canvas>
      <div class="flex flex-col gap-2">
        <!-- TODO make this prittier -->
        <span v-if="clickDuration" class="grid grid-cols-2 gap-2">
          clickDuration:
          <span
            class="text-emerald-900"
            @click="copy(clickDuration.toString())"
          >
            {{ clickDuration }} ms
          </span>
        </span>
        <span v-if="rect" class="grid grid-cols-2 gap-2">
          rect:
          <span class="text-emerald-900" @click="copy(rect.join(','))">
            {{ rect.join(',') }}
          </span>
        </span>
        <span v-if="suggestRect" class="grid grid-cols-2 gap-2">
          padding offset:
          <span class="text-emerald-900 flex items-center">
            <NInputNumber v-model:value="suggestPadding" /> px
          </span>
          suggestRect:
          <span class="text-emerald-900" @click="copy(suggestRect.join(','))">
            {{ suggestRect.join(',') }}
          </span>
        </span>
        <canvas v-if="rect" ref="cropEl"></canvas>
      </div>
    </div>
  </div>
</template>
