import * as XLSX from 'xlsx'
import Big from 'big.js'

export interface Workbook {
  Sheets: Record<string, XLSX.WorkSheet>
  SheetNames: string[]
}

export interface InterpolationResult {
  low: number
  high: number
}

export const round2 = (num: number): string => {
  return new Big(num).toFixed(2).toString()
}

export const readExcelFile = async (url: string): Promise<Workbook | null> => {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    return workbook
  } catch (error) {
    console.error('读取 Excel 文件失败:', error)
    return null
  }
}

export const getCellValue = (workbook: Workbook, row: number, col: number): any => {
  const ws = workbook.Sheets[workbook.SheetNames[0]]
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  return ws[addr]?.v
}

export const findClosestIndices = (arr: number[], target: string | number): InterpolationResult => {
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

export const bilinearInterpolate = (workbook: Workbook, rowVal: number, colVal: number): string | null => {
  if (!workbook) return null
  
  const colCoords: number[] = []
  for (let c = 1; ; c++) {
    const v = getCellValue(workbook, 0, c)
    if (v === undefined) break
    if (v !== null && v !== '') {
      colCoords.push(Number(v))
    }
  }
  
  const rowCoords: number[] = []
  for (let r = 1; ; r++) {
    const v = getCellValue(workbook, r, 0)
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
  
  const v11 = getCellValue(workbook, rowLow + 1, colLow + 1)
  const v12 = getCellValue(workbook, rowLow + 1, colHigh + 1)
  const v21 = getCellValue(workbook, rowHigh + 1, colLow + 1)
  const v22 = getCellValue(workbook, rowHigh + 1, colHigh + 1)
  
  if (colLow === colHigh && rowLow === rowHigh) {
    return new Big(v11).toFixed(2).toString()
  }
  
  if (colLow === colHigh) {
    const rowMinB = new Big(rowMin)
    const rowMaxB = new Big(rowMax)
    const v11b = new Big(v11)
    const v21b = new Big(v21)
    const t = new Big(rowVal).minus(rowMinB).div(rowMaxB.minus(rowMinB))
    const result = v11b.plus(t.times(v21b.minus(v11b)))
    return result.toString()
  }
  
  if (rowLow === rowHigh) {
    const colMinB = new Big(colMin)
    const colMaxB = new Big(colMax)
    const v11b = new Big(v11)
    const v12b = new Big(v12)
    const t = new Big(colVal).minus(colMinB).div(colMaxB.minus(colMinB))
    const result = v11b.plus(t.times(v12b.minus(v11b)))
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
  
  const result = term1.plus(term2).plus(term3).plus(term4)
  return result.toString()
}

export const getMassFromVolume = (workbook: Workbook, volPct: string | number): string | null => {
  if (!workbook) return null
  const ws = workbook.Sheets[workbook.SheetNames[0]]
  
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
