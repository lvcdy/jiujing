<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import Big from 'big.js'
import jiujingExcel from '../assets/jiujing.xlsx?url'
import wenduExcel from '../assets/wendu.xlsx?url'

const round2 = (num: number): string => {
  return new Big(num).toFixed(2).toString()
}

const excelWorkbook = ref<any>(null)
const wenduWorkbook = ref<any>(null)
const rowInput = ref<number>(0)
const colInput = ref<number>(0)
const result = ref<string | null>(null)
const massResult = ref<string | null>(null)

const readExcelFile = async () => {
  try {
    const response = await fetch(jiujingExcel)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    excelWorkbook.value = workbook
    
    const response2 = await fetch(wenduExcel)
    const arrayBuffer2 = await response2.arrayBuffer()
    const workbook2 = XLSX.read(arrayBuffer2, { type: 'array' })
    wenduWorkbook.value = workbook2
  } catch (error) {
    console.error('读取 Excel 文件失败:', error)
  }
}

const getCellValue = (row: number, col: number) => {
  if (!excelWorkbook.value) return null
  const ws = excelWorkbook.value.Sheets[excelWorkbook.value.SheetNames[0]]
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  return ws[addr]?.v
}

const findClosestIndices = (arr: number[], target: string | number) => {
  const targetNum = Number(target)
  const isDescending = arr[0] > arr[arr.length - 1]
  
  if (isDescending) {
    if (targetNum >= arr[0]) return { low: 0, high: 0 }
    if (targetNum <= arr[arr.length - 1]) return { low: arr.length - 1, high: arr.length - 1 }
  } else {
    if (targetNum <= arr[0]) return { low: 0, high: 0 }
    if (targetNum >= arr[arr.length - 1]) return { low: arr.length - 1, high: arr.length - 1 }
  }
  
  let low = 0
  let high = arr.length - 1
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (arr[mid] === targetNum) {
      return { low: mid, high: mid }
    } else if (isDescending ? arr[mid] > targetNum : arr[mid] < targetNum) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  
  const lowIdx = Math.max(0, high)
  const highIdx = Math.min(arr.length - 1, low)
  
  return { low: lowIdx, high: highIdx }
}

const bilinearInterpolate = (rowVal: number, colVal: number): string | null => {
  if (!excelWorkbook.value) return null
  
  const colCoords: number[] = []
  for (let c = 1; ; c++) {
    const v = getCellValue(0, c)
    if (v === undefined) break
    if (v !== null && v !== '') {
      colCoords.push(Number(v))
    }
  }
  
  const rowCoords: number[] = []
  for (let r = 1; ; r++) {
    const v = getCellValue(r, 0)
    if (v === undefined) break
    if (v !== null && v !== '' && !isNaN(Number(v))) {
      rowCoords.push(Number(v))
    }
  }
  
  const { low: colLow, high: colHigh } = findClosestIndices(colCoords, colVal)
  const { low: rowLow, high: rowHigh } = findClosestIndices(rowCoords, rowVal)
  
  const colMin = colCoords[colLow]
  const colMax = colCoords[colHigh]
  const rowMin = rowCoords[rowLow]
  const rowMax = rowCoords[rowHigh]
  
  const v11 = getCellValue(rowLow + 1, colLow + 1)
  const v12 = getCellValue(rowLow + 1, colHigh + 1)
  const v21 = getCellValue(rowHigh + 1, colLow + 1)
  const v22 = getCellValue(rowHigh + 1, colHigh + 1)
  
  let result: Big
  
  if (colLow === colHigh && rowLow === rowHigh) {
    return new Big(v11).toFixed(2).toString()
  }
  
  if (colLow === colHigh) {
    const rowMinB = new Big(rowMin)
    const rowMaxB = new Big(rowMax)
    const v11b = new Big(v11)
    const v21b = new Big(v21)
    const t = new Big(rowVal).minus(rowMinB).div(rowMaxB.minus(rowMinB))
    result = v11b.plus(t.times(v21b.minus(v11b)))
    return result.toString()
  }
  
  if (rowLow === rowHigh) {
    const colMinB = new Big(colMin)
    const colMaxB = new Big(colMax)
    const v11b = new Big(v11)
    const v12b = new Big(v12)
    const t = new Big(colVal).minus(colMinB).div(colMaxB.minus(colMinB))
    result = v11b.plus(t.times(v12b.minus(v11b)))
    return result.toString()
  }
  
  const colMinB = new Big(colMin)
  const colMaxB = new Big(colMax)
  const rowMinB = new Big(rowMin)
  const rowMaxB = new Big(rowMax)
  const colT = new Big(colVal).minus(colMinB).div(colMaxB.minus(colMinB))
  const rowT = new Big(rowVal).minus(rowMinB).div(rowMaxB.minus(rowMinB))
  
  const one = new Big(1)
  const v11b = new Big(v11)
  const v12b = new Big(v12)
  const v21b = new Big(v21)
  const v22b = new Big(v22)
  const term1 = one.minus(colT).times(one.minus(rowT)).times(v11b)
  const term2 = colT.times(one.minus(rowT)).times(v12b)
  const term3 = one.minus(colT).times(rowT).times(v21b)
  const term4 = colT.times(rowT).times(v22b)
  
  result = term1.plus(term2).plus(term3).plus(term4)
  return result.toString()
}

const calculate = () => {
  const volResultRaw = bilinearInterpolate(Number(colInput.value), Number(rowInput.value))
  result.value = volResultRaw
  
  if (wenduWorkbook.value && volResultRaw !== null) {
    massResult.value = getMassFromVolume(volResultRaw)
  }
}

const getMassFromVolume = (volPct: string | number): string | null => {
  if (!wenduWorkbook.value) return null
  const ws = wenduWorkbook.value.Sheets[wenduWorkbook.value.SheetNames[0]]
  
  const vols: number[] = []
  const masses: number[] = []
  for (let r = 1; ; r++) {
    const vol = ws[XLSX.utils.encode_cell({ r: r, c: 1 })]?.v
    const mass = ws[XLSX.utils.encode_cell({ r: r, c: 3 })]?.v
    if (vol === undefined) break
    if (vol !== null && mass !== null && !isNaN(Number(vol)) && !isNaN(Number(mass))) {
      vols.push(Number(vol))
      masses.push(Number(mass))
    }
  }
  
  const { low, high } = findClosestIndices(vols, volPct)
  
  if (low === high) {
    return round2(new Big(masses[low]).toNumber())
  }
  
  const volMin = new Big(vols[low])
  const volMax = new Big(vols[high])
  const massMin = new Big(masses[low])
  const massMax = new Big(masses[high])
  
  const t = new Big(volPct).minus(volMin).div(volMax.minus(volMin))
  const mass = massMin.plus(t.times(massMax.minus(massMin)))
  
  return round2(mass.toNumber())
}

onMounted(() => {
  readExcelFile()
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
          <input type="number" v-model="rowInput" step="0.1" placeholder="请输入温度" />
        </div>

        <div class="input-group">
          <label>温度 (℃)</label>
          <input type="number" v-model="colInput" step="0.1" placeholder="请输入酒精度示值" />
        </div>
        
        <button class="calculate-btn" @click="calculate">
          <span class="btn-text">计算</span>
          <span class="btn-line"></span>
        </button>
        
        <div class="result-panel" v-if="result !== null">
          <div class="result-item">
            <span class="result-label">校正后20℃标准浓度</span>
            <span class="result-value">%vol</span>
            <span class="result-number">{{ result }}</span>
          </div>
          
          <div class="result-item" v-if="massResult !== null">
            <span class="result-label">校正后20℃标准浓度</span>
            <span class="result-value">%m</span>
            <span class="result-number">{{ massResult }}</span>
          </div>
        </div>
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

.calculate-btn:hover {
  background: linear-gradient(180deg, #5a5a5a 0%, #4a4a4a 100%);
  border-color: #4ade80;
}

.calculate-btn:active {
  transform: scale(0.98);
}

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
