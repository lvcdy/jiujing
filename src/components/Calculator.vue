<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ResultPanel from './ResultPanel.vue'
import { readExcelFile, bilinearInterpolate, getMassFromVolume } from '../utils/excel'
import type { Workbook } from '../utils/excel'
import jiujingExcel from '../assets/jiujing.xlsx?url'
import wenduExcel from '../assets/wendu.xlsx?url'

const rowInput = ref<number>(0)
const colInput = ref<number>(0)
const result = ref<string | null>(null)
const massResult = ref<string | null>(null)
const isLoading = ref<boolean>(false)
const error = ref<string | null>(null)

const excelWorkbook = ref<Workbook | null>(null)
const wenduWorkbook = ref<Workbook | null>(null)

const loadExcelFiles = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    excelWorkbook.value = await readExcelFile(jiujingExcel)
    wenduWorkbook.value = await readExcelFile(wenduExcel)
  } catch (err) {
    error.value = '加载Excel文件失败'
    console.error('加载Excel文件失败:', err)
  } finally {
    isLoading.value = false
  }
}

const calculate = () => {
  if (!excelWorkbook.value) {
    error.value = 'Excel文件未加载'
    return
  }
  
  error.value = null
  
  try {
    const volResultRaw = bilinearInterpolate(excelWorkbook.value, Number(colInput.value), Number(rowInput.value))
    result.value = volResultRaw
    
    if (wenduWorkbook.value && volResultRaw !== null) {
      massResult.value = getMassFromVolume(wenduWorkbook.value, volResultRaw)
    }
  } catch (err) {
    error.value = '计算失败'
    console.error('计算失败:', err)
  }
}

onMounted(() => {
  loadExcelFiles()
})
</script>

<template>
  <div class="industrial-container">
    <div class="industrial-panel">
      <div class="panel-header">
        <div class="indicator"></div>
        <h1>酒精浓度计算器</h1>
      </div>
      
      <div class="panel-body">
        <div class="input-group">
          <label>酒精计读数 (%)</label>
          <input 
            type="number" 
            v-model="rowInput" 
            step="0.1" 
            placeholder="请输入酒精计读数"
            :disabled="isLoading"
          />
        </div>

        <div class="input-group">
          <label>温度 (℃)</label>
          <input 
            type="number" 
            v-model="colInput" 
            step="0.1" 
            placeholder="请输入温度"
            :disabled="isLoading"
          />
        </div>
        
        <button 
          class="calculate-btn" 
          @click="calculate"
          :disabled="isLoading"
        >
          <span class="btn-text">{{ isLoading ? '加载中...' : '计算' }}</span>
          <span class="btn-line"></span>
        </button>
        
        <div class="error-message" v-if="error">
          {{ error }}
        </div>
        
        <ResultPanel 
          :result="result" 
          :mass-result="massResult" 
        />
      </div>
      
      <div class="panel-footer">
        <div class="scale"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.industrial-container {
  min-height: 100vh;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.industrial-panel {
  width: 100%;
  max-width: 500px;
  background: linear-gradient(145deg, #2a2a2a, #1f1f1f);
  border-radius: 8px;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid #3a3a3a;
  overflow: hidden;
}

.panel-header {
  background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
  padding: 20px 25px;
  display: flex;
  align-items: center;
  gap: 15px;
  border-bottom: 2px solid #4a4a4a;
}

.indicator {
  width: 12px;
  height: 12px;
  background: #4ade80;
  border-radius: 50%;
  box-shadow: 0 0 10px #4ade80;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.panel-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #e0e0e0;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.panel-body {
  padding: 30px 25px;
}

.input-group {
  margin-bottom: 25px;
}

.input-group label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-group input {
  width: 100%;
  padding: 15px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  color: #fff;
  font-size: 18px;
  font-family: 'Courier New', monospace;
  transition: all 0.3s;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);
}

.input-group input::placeholder {
  color: #555;
}

.input-group input:disabled {
  background: #2a2a2a;
  color: #666;
  cursor: not-allowed;
}

.calculate-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(180deg, #4a4a4a 0%, #3a3a3a 100%);
  border: 1px solid #5a5a5a;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 3px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}

.calculate-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, #5a5a5a 0%, #4a4a4a 100%);
  border-color: #4ade80;
}

.calculate-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.calculate-btn:disabled {
  background: #2a2a2a;
  color: #666;
  cursor: not-allowed;
  border-color: #3a3a3a;
}

.error-message {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 4px;
  color: #ff6b6b;
  font-size: 14px;
  text-align: center;
}

.panel-footer {
  padding: 15px 25px;
  background: #1a1a1a;
  border-top: 1px solid #3a3a3a;
}

.scale {
  height: 4px;
  background: linear-gradient(90deg, #3a3a3a 0%, #5a5a5a 50%, #3a3a3a 100%);
  border-radius: 2px;
}
</style>
