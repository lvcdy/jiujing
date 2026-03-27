<script setup lang="ts">
import { computed } from 'vue'
import type { ResultItem } from '../types'

const props = defineProps<{
  result: string | null
  massResult: string | null
}>()

const resultItems = computed<ResultItem[]>(() => {
  const items: ResultItem[] = []
  
  if (props.result) {
    items.push({
      label: '校正后20℃标准浓度',
      value: '%vol',
      number: props.result
    })
  }
  
  if (props.massResult) {
    items.push({
      label: '校正后20℃标准浓度',
      value: '%m',
      number: props.massResult
    })
  }
  
  return items
})
</script>

<template>
  <div class="result-panel" v-if="result !== null">
    <div class="result-item" v-for="(item, index) in resultItems" :key="index">
      <span class="result-label">{{ item.label }}</span>
      <span class="result-value">{{ item.value }}</span>
      <span class="result-number">{{ item.number }}</span>
    </div>
  </div>
</template>

<style scoped>
.result-panel {
  margin-top: 30px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  overflow: hidden;
}

.result-item {
  padding: 20px;
  border-bottom: 1px solid #2a2a2a;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.result-item:last-child {
  border-bottom: none;
}

.result-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.result-value {
  font-size: 14px;
  color: #888;
}

.result-number {
  font-size: 28px;
  font-weight: 700;
  color: #4ade80;
  font-family: 'Courier New', monospace;
  margin-left: auto;
}
</style>
