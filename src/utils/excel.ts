import * as XLSX from 'xlsx'
import Big from 'big.js'

export interface Workbook {
  Sheets: Record<string, XLSX.WorkSheet>
  SheetNames: string[]
}

// 缓存结构
interface ExcelCache {
  colCoords: number[]
  rowCoords: number[]
  data: Map<string, number>
  volMassData: [number, number][]
}

const cache = new Map<string, ExcelCache>()

const round2 = (num: number): string => {
  if (!isFinite(num) || isNaN(num)) return '0.00'
  return new Big(num).toFixed(2)
}

export const readExcelFile = async (url: string): Promise<Workbook | null> => {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return XLSX.read(arrayBuffer, { type: 'array' })
  } catch (error) {
    console.error('读取 Excel 文件失败:', error)
    return null
  }
}

// 预解析Excel数据到缓存
export const parseExcelCache = (workbook: Workbook, key: string): ExcelCache | null => {
  if (cache.has(key)) return cache.get(key)!
  
  const ws = workbook.Sheets[workbook.SheetNames[0]]
  
  // 读取列坐标（温度）
  const colCoords: number[] = []
  for (let c = 1; ; c++) {
    const val = ws[XLSX.utils.encode_cell({ r: 0, c })]?.v
    if (val === undefined) break
    const num = Number(val)
    if (!isNaN(num)) colCoords.push(num)
  }
  
  // 读取行坐标（酒精计读数）
  const rowCoords: number[] = []
  for (let r = 1; ; r++) {
    const val = ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v
    if (val === undefined) break
    const num = Number(val)
    if (!isNaN(num)) rowCoords.push(num)
  }
  
  // 读取数据到Map
  const data = new Map<string, number>()
  for (let r = 0; r < rowCoords.length; r++) {
    for (let c = 0; c < colCoords.length; c++) {
      const val = ws[XLSX.utils.encode_cell({ r: r + 1, c: c + 1 })]?.v
      if (val !== undefined) {
        data.set(`${r},${c}`, Number(val))
      }
    }
  }
  
  // 读取体积-质量数据
  const volMassData: [number, number][] = []
  for (let r = 1; ; r++) {
    const vol = ws[XLSX.utils.encode_cell({ r, c: 1 })]?.v
    const mass = ws[XLSX.utils.encode_cell({ r, c: 3 })]?.v
    if (vol === undefined) break
    if (vol !== null && mass !== null) {
      volMassData.push([Number(vol), Number(mass)])
    }
  }
  
  const result = { colCoords, rowCoords, data, volMassData }
  cache.set(key, result)
  return result
}

// 二分查找最近的索引
const findNearestIndex = (arr: number[], target: number): number => {
  if (arr.length === 0) return 0
  
  const isDesc = arr[0] > arr[arr.length - 1]
  
  // 边界检查
  if (isDesc ? target >= arr[0] : target <= arr[0]) return 0
  if (isDesc ? target <= arr[arr.length - 1] : target >= arr[arr.length - 1]) return arr.length - 1
  
  let low = 0, high = arr.length - 1
  while (low < high - 1) {
    const mid = (low + high) >> 1
    if (arr[mid] === target) return mid
    if (isDesc ? arr[mid] > target : arr[mid] < target) low = mid
    else high = mid
  }
  
  // 返回最近的索引
  return Math.abs(arr[low] - target) <= Math.abs(arr[high] - target) ? low : high
}

const lerp = (a: number, b: number, t: number): string => {
  if (!isFinite(a) || !isFinite(b) || !isFinite(t)) return '0.00'
  return new Big(a).plus(new Big(b - a).times(t)).toFixed(2)
}

export const bilinearInterpolate = (
  rowVal: number,
  colVal: number
): string | null => {
  if (!isFinite(rowVal) || !isFinite(colVal)) return null
  
  const excelCache = cache.get('jiujing')
  if (!excelCache) return null
  
  const { colCoords, rowCoords, data } = excelCache
  
  if (colCoords.length === 0 || rowCoords.length === 0) return null
  
  // 找到最近的索引
  const cIdx = findNearestIndex(colCoords, colVal)
  const rIdx = findNearestIndex(rowCoords, rowVal)
  
  // 确定四个点的索引
  const cLow = Math.max(0, cIdx - (colVal < colCoords[cIdx] ? 1 : 0))
  const cHigh = Math.min(colCoords.length - 1, cLow + 1)
  const rLow = Math.max(0, rIdx - (rowVal < rowCoords[rIdx] ? 1 : 0))
  const rHigh = Math.min(rowCoords.length - 1, rLow + 1)
  
  // 获取四个角的值
  const v11 = data.get(`${rLow},${cLow}`)
  if (v11 === undefined) return null
  
  // 如果正好在网格点上
  if (cLow === cHigh && rLow === rHigh) return round2(v11)
  
  const cMin = colCoords[cLow], cMax = colCoords[cHigh]
  const rMin = rowCoords[rLow], rMax = rowCoords[rHigh]
  
  const cT = cLow === cHigh ? 0 : (colVal - cMin) / (cMax - cMin)
  const rT = rLow === rHigh ? 0 : (rowVal - rMin) / (rMax - rMin)
  
  // 单边插值
  if (cLow === cHigh) {
    const v21 = data.get(`${rHigh},${cLow}`)
    if (v21 === undefined) return null
    return lerp(v11, v21, rT)
  }
  
  if (rLow === rHigh) {
    const v12 = data.get(`${rLow},${cHigh}`)
    if (v12 === undefined) return null
    return lerp(v11, v12, cT)
  }
  
  // 双线性插值
  const v12 = data.get(`${rLow},${cHigh}`)
  const v21 = data.get(`${rHigh},${cLow}`)
  const v22 = data.get(`${rHigh},${cHigh}`)
  
  if (v12 === undefined || v21 === undefined || v22 === undefined) return null
  
  const top = new Big(v11).times(1 - cT).plus(new Big(v12).times(cT))
  const bottom = new Big(v21).times(1 - cT).plus(new Big(v22).times(cT))
  return top.times(1 - rT).plus(bottom.times(rT)).toFixed(2)
}

export const getMassFromVolume = (volPct: number): string | null => {
  if (!isFinite(volPct)) return null
  
  const excelCache = cache.get('wendu')
  if (!excelCache) return null
  
  const { volMassData } = excelCache
  if (volMassData.length === 0) return null
  
  // 二分查找最近的体积值
  let low = 0, high = volMassData.length - 1
  while (low < high - 1) {
    const mid = (low + high) >> 1
    if (volMassData[mid][0] === volPct) return round2(volMassData[mid][1])
    if (volMassData[mid][0] < volPct) low = mid
    else high = mid
  }
  
  // 线性插值
  const volLow = volMassData[low][0]
  const volHigh = volMassData[high][0]
  const massLow = volMassData[low][1]
  const massHigh = volMassData[high][1]
  
  if (low === high) return round2(massLow)
  
  const t = (volPct - volLow) / (volHigh - volLow)
  return lerp(massLow, massHigh, t)
}

// 清除缓存（用于重新加载）
export const clearCache = () => cache.clear()
