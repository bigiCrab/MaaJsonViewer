<script setup lang="ts">
import { Buffer } from 'buffer'
import { onMounted, onUnmounted, ref } from 'vue'

import * as api from '@/api'

const props = defineProps<{
  width: number
  height: number
}>()

const imageURL = ref<string | null>(null)
const imageEle = ref<HTMLImageElement | null>(null)

const canvasEl = ref<HTMLCanvasElement | null>(null)

// TODO make this configurable
const deviceWidth = 1280
const deviceHeight = 720

const controllerStatus = ref<string>('none')

defineExpose({
  imageURL,
  imageEle
})

let socket: WebSocket | null

async function tryConnect() {
  let url: string | null = null
  let frame = 0
  let drewFrame = 0
  const ctx = canvasEl.value?.getContext('2d')
  if (!ctx) {
    return
  }
  controllerStatus.value = 'connecting'
  socket = await api.controller()
  controllerStatus.value = 'get controller'
  // console.log('get controller socket', socket)
  socket.onclose = () => {
    controllerStatus.value = 'close'
    console.log('close!')
    socket = null
    setTimeout(() => {
      tryConnect()
    }, 100)
  }
  socket.onmessage = async ev => {
    frame += 1
    const curFrame = frame
    // console.log('got image', frame)
    controllerStatus.value = `get frame: ${curFrame}`

    if (url) {
      URL.revokeObjectURL(url)
    }
    url = URL.createObjectURL(ev.data as Blob)
    const image = new Image(deviceWidth, deviceHeight)
    image.onload = () => {
      if (curFrame < drewFrame) {
        // console.log('skip image', { cur: curFrame, preFrame: drewFrame })
        return
      }
      drewFrame = curFrame
      imageEle.value = image
      // console.log('draw image', { cur: curFrame, preFrame: drewFrame })
      ctx.drawImage(image, 0, 0, deviceWidth, deviceHeight, 0, 0, props.width, props.height)
      controllerStatus.value = `rendered frame: ${curFrame}`
    }
    image.src = url
  }
}

onMounted(async () => {
  await tryConnect()
})

onUnmounted(() => {
  if (socket) {
    socket.close()
  }
})

function send(obj: unknown) {
  if (!socket) {
    tryConnect()
  } else {
    socket.send(JSON.stringify(obj))
  }
}

function sendClick(x: number, y: number) {
  send({
    action: 'click',
    x,
    y
  })
}

function sendSwipe(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dur: number
) {
  send({
    action: 'swipe',
    x1,
    y1,
    x2,
    y2,
    dur
  })
}

const pointerDownTrack = ref<[number, number] | null>(null)

function handlePointerDown(ev: PointerEvent) {
  console.log(ev)
  if (ev.pointerId !== 1) {
    return
  }
  pointerDownTrack.value = [ev.offsetX, ev.offsetY]
}

function handlePointerUp(ev: PointerEvent) {
  console.log(ev)
  if (ev.pointerId !== 1) {
    return
  }
  if (pointerDownTrack.value) {
    const [ox, oy] = pointerDownTrack.value
    if (Math.abs(ox - ev.offsetX) + Math.abs(oy - ev.offsetY) > 5) {
      sendSwipe(ox, oy, ev.offsetX, ev.offsetY, 100)
    } else {
      sendClick(ev.offsetX, ev.offsetY)
    }
  }
}
</script>

<template>
  <div>
    <canvas
      id="monitor"
      ref="canvasEl"
      :width="width"
      :height="height"
      @pointerdown="handlePointerDown"
      @pointerup="handlePointerUp"
    ></canvas>
    <div>status: {{ controllerStatus }}</div>
  </div>
</template>

<style scoped>
#monitor {
  max-width: inherit;
}
</style>
