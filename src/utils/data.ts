import Big from 'big.js'

// 设置big.js的舍入模式为传统四舍五入
Big.RM = 1 // roundHalfUp

// ──── 类型定义 ────

/** 不确定度估算结果 */
export interface UncertaintyResult {
  vol: string
  mass: string | null
}

/** JSON 数据源的缓存结构 */
interface ExcelCache {
  colCoords: number[]
  rowCoords: number[]
  data: Map<string, number>
  volMassData: [number, number][]
  volDensityData: [number, number][]  // [体积分数, 相对密度]
}

// ──── 内部工具 ────

const cache = new Map<string, ExcelCache>()

const cache_get = (key: string): ExcelCache | null => cache.get(key) || null

const round2 = (num: number): string => {
  if (!isFinite(num) || isNaN(num)) return '0.00'
  return new Big(num).toFixed(2)
}

/** 在有序数据对 [x, y][] 中，按 x 列二分查找并线性插值 y */
const interpolateFromPairs = (
  pairs: [number, number][],
  keyVal: number,
  keyIndex: 0 | 1 = 0,
  valueIndex: 0 | 1 = 1
): string | null => {
  if (pairs.length === 0) return null
  const keyBig = new Big(keyVal)

  // 二分查找
  let low = 0, high = pairs.length - 1
  while (low < high - 1) {
    const mid = (low + high) >> 1
    const midVal = new Big(pairs[mid][keyIndex])
    if (midVal.eq(keyBig)) return round2(pairs[mid][valueIndex])
    if (midVal.lt(keyBig)) low = mid; else high = mid
  }

  if (low === high) return round2(pairs[low][valueIndex])

  // 线性插值
  const denom = new Big(pairs[high][keyIndex]).minus(pairs[low][keyIndex])
  if (denom.eq(0)) return round2(pairs[low][valueIndex])
  const t = keyBig.minus(pairs[low][keyIndex]).div(denom)
  return new Big(pairs[low][valueIndex])
    .plus(new Big(pairs[high][valueIndex]).minus(pairs[low][valueIndex]).times(t))
    .toFixed(2)
}

// ──── 数据加载 ────

/** 延迟加载并解析 JSON 数据到缓存 */
export const loadExcelData = async (url: string, key: string): Promise<ExcelCache | null> => {
  if (cache.has(key)) return cache.get(key)!

  try {
    const response = await fetch(url)
    const json = await response.json()

    const colCoords: number[] = json.colCoords || []
    const rowCoords: number[] = json.rowCoords || []

    const data = new Map<string, number>()
    if (json.data) {
      for (const [k, v] of Object.entries(json.data)) {
        data.set(k, v as number)
      }
    }

    // 过滤含 null 的无效条目和超出合理范围的离群值
    const cleanPairs = (arr: unknown, opts?: { maxVal?: number }): [number, number][] =>
      Array.isArray(arr)
        ? arr.filter(
            (d): d is [number, number] =>
              Array.isArray(d) && d.length === 2 &&
              typeof d[0] === 'number' && typeof d[1] === 'number' &&
              isFinite(d[0]) && isFinite(d[1]) &&
              d[0] >= 0 && d[1] >= 0 &&
              (opts?.maxVal == null || (d[0] <= opts.maxVal && d[1] <= opts.maxVal))
          )
        : []

    const result: ExcelCache = {
      colCoords,
      rowCoords,
      data,
      volMassData: cleanPairs(json.volMassData, { maxVal: 100 }),
      // volDensityData 按密度降序排序（二分查找依赖此顺序）
      volDensityData: cleanPairs(json.volDensityData, { maxVal: 2 })
        .sort((a, b) => b[1] - a[1]),
    }
    cache.set(key, result)
    return result
  } catch (error) {
    console.error('加载JSON数据失败:', error)
    return null
  }
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

export const bilinearInterpolate = (
  rowVal: number,
  colVal: number
): string | null => {
  if (!isFinite(rowVal) || !isFinite(colVal)) return null;

  const excelCache = cache_get('jiujing')
  if (!excelCache) return null;

  // colCoords = 酒精计读数 (ascending [0, 0.5, 1, ..., 100])
  // rowCoords = 温度 (descending [40, 39.5, ..., 0])
  // data.get(r, c) where r=tempIdx, c=alcIdx
  const { colCoords, rowCoords, data } = excelCache
  if (colCoords.length === 0 || rowCoords.length === 0) return null;

  const cIdx = findNearestIndex(colCoords, colVal)  // 酒精计读数索引
  const rIdx = findNearestIndex(rowCoords, rowVal)   // 温度索引

  const colIsDesc = colCoords[0] > colCoords[colCoords.length - 1]
  const rowIsDesc = rowCoords[0] > rowCoords[rowCoords.length - 1]

  const cLow = colIsDesc
    ? Math.max(0, cIdx - (colVal > colCoords[cIdx] ? 1 : 0))
    : Math.max(0, cIdx - (colVal < colCoords[cIdx] ? 1 : 0))
  const cHigh = Math.min(colCoords.length - 1, cLow + 1)

  const rLow = rowIsDesc
    ? Math.max(0, rIdx - (rowVal > rowCoords[rIdx] ? 1 : 0))
    : Math.max(0, rIdx - (rowVal < rowCoords[rIdx] ? 1 : 0))
  const rHigh = Math.min(rowCoords.length - 1, rLow + 1)

  const v11 = data.get(`${rLow},${cLow}`)
  if (v11 === undefined) return null;

  if (cLow === cHigh && rLow === rHigh) return new Big(v11).toFixed(2);

  const cMin = colCoords[cLow], cMax = colCoords[cHigh]
  const rMin = rowCoords[rLow], rMax = rowCoords[rHigh]

  const cT = cLow === cHigh ? new Big(0) : new Big(colVal).minus(cMin).div(new Big(cMax).minus(cMin))
  const rT = rLow === rHigh ? new Big(0) : new Big(rowVal).minus(rMin).div(new Big(rMax).minus(rMin))

  if (cLow === cHigh) {
    const v21 = data.get(`${rHigh},${cLow}`)
    if (v21 === undefined) return null;
    return new Big(v11).plus(new Big(v21).minus(v11).times(rT)).toFixed(2);
  }

  if (rLow === rHigh) {
    const v12 = data.get(`${rLow},${cHigh}`)
    if (v12 === undefined) return null;
    return new Big(v11).plus(new Big(v12).minus(v11).times(cT)).toFixed(2);
  }

  const v12 = data.get(`${rLow},${cHigh}`)
  const v21 = data.get(`${rHigh},${cLow}`)
  const v22 = data.get(`${rHigh},${cHigh}`)

  if (v12 === undefined || v21 === undefined || v22 === undefined) return null;

  const top = new Big(v11).times(new Big(1).minus(cT)).plus(new Big(v12).times(cT))
  const bottom = new Big(v21).times(new Big(1).minus(cT)).plus(new Big(v22).times(cT))
  const result = top.times(new Big(1).minus(rT)).plus(bottom.times(rT))

  return result.toFixed(2);
}

/** 体积分数 → 质量分数 (查表插值) */
export const getMassFromVolume = (volPct: string): string | null => {
  if (!volPct || isNaN(Number(volPct))) return null
  const cache = cache_get('wendu')
  return cache ? interpolateFromPairs(cache.volMassData, Number(volPct)) : null
}

/** 体积分数 → 相对密度 (查表插值) */
export const getDensityFromVolume = (volPct: string): string | null => {
  if (!volPct || isNaN(Number(volPct))) return null
  const cache = cache_get('wendu')
  return cache ? interpolateFromPairs(cache.volDensityData, Number(volPct)) : null
}

/** 相对密度 → 体积分数 (反向查表插值) */
export const getVolumeFromDensity = (density: number): string | null => {
  if (!isFinite(density)) return null
  const cache = cache_get('wendu')
  return cache ? interpolateFromPairs(cache.volDensityData, density, 1, 0) : null
}

// 反向计算：已知标准浓度(20℃)和当前温度 → 推算酒精计读数
// 数据结构: colCoords=[酒精读数...], rowCoords=[温度...](降序), data.get(`${tempIdx},${alcIdx}`)
export const reverseInterpolate = (
  targetVol: number,
  temperature: number
): string | null => {
  const cache = cache_get('jiujing')
  if (!cache) return null

  // colCoords = 酒精计读数 (ascending [0, 0.5, 1, ..., 100])
  // rowCoords = 温度 (descending [40, 39.5, ..., 0])
  // data.get(r, c) = 标准浓度, where r=tempIdx, c=alcIdx
  const { colCoords, rowCoords, data } = cache
  if (colCoords.length === 0 || rowCoords.length === 0) return null

  // 找到温度在 rowCoords 中的索引
  const rIdx = findNearestIndex(rowCoords, temperature)
  const rowIsDesc = rowCoords[0] > rowCoords[rowCoords.length - 1]
  const rLow = rowIsDesc
    ? Math.max(0, rIdx - (temperature > rowCoords[rIdx] ? 1 : 0))
    : Math.max(0, rIdx - (temperature < rowCoords[rIdx] ? 1 : 0))
  const rHigh = Math.min(rowCoords.length - 1, rLow + 1)

  // 在指定温度行中，遍历酒精读数列，查找哪个酒精读数对应目标标准浓度
  // 只使用整数酒精读数列（半步长列的数据格式在不同范围不一致：高范围是delta，低范围是完整值）
  // 整数列始终存储完整标准浓度值
  const findInRow = (tempRowIdx: number): number | null => {
    const values: { alcohol: number; vol: number }[] = []
    for (let c = 0; c < colCoords.length; c++) {
      // 跳过半步长列（x.5），只使用整数酒精读数列
      if (colCoords[c] % 1 !== 0) continue
      const v = data.get(`${tempRowIdx},${c}`)
      if (v !== undefined) values.push({ alcohol: colCoords[c], vol: v })
    }
    if (values.length === 0) return null

    // 查找目标标准浓度值所在的区间并线性插值
    // values 按酒精读数升序排列，标准浓度也应单调递增
    for (let i = 0; i < values.length - 1; i++) {
      const curr = values[i]
      const next = values[i + 1]
      // 目标值在 curr.vol 和 next.vol 之间
      if (targetVol >= curr.vol && targetVol <= next.vol) {
        const range = next.vol - curr.vol
        if (range === 0) return curr.alcohol
        const t = (targetVol - curr.vol) / range
        return curr.alcohol + (next.alcohol - curr.alcohol) * t
      }
    }

    // 如果目标值超出范围，返回最接近的端点
    if (targetVol <= values[0].vol) return values[0].alcohol
    if (targetVol >= values[values.length - 1].vol) return values[values.length - 1].alcohol

    return null
  }

  const result1 = findInRow(rLow)
  if (rLow === rHigh) return result1 !== null ? new Big(result1).toFixed(2) : null

  const result2 = findInRow(rHigh)
  if (result1 === null || result2 === null) {
    return result1 !== null ? new Big(result1).toFixed(2) : (result2 !== null ? new Big(result2).toFixed(2) : null)
  }

  // 在两个温度行之间插值
  const tVal = new Big(temperature).minus(rowCoords[rLow]).div(new Big(rowCoords[rHigh]).minus(rowCoords[rLow]))
  return new Big(result1).plus(new Big(result2).minus(result1).times(tVal)).toFixed(2)
}

// 不确定度估算（基于测量仪器精度的误差传播）
export const estimateUncertainty = (
  alcohol: number,
  temperature: number,
  deltaAlcohol: number = 0.1,
  deltaTemp: number = 0.1
): UncertaintyResult | null => {
  const base = bilinearInterpolate(temperature, alcohol)
  if (!base) return null

  // 偏导数（有限差分法）
  const volUp = bilinearInterpolate(temperature, alcohol + deltaAlcohol)
  const volDown = bilinearInterpolate(temperature, alcohol - deltaAlcohol)
  const tempUp = bilinearInterpolate(temperature + deltaTemp, alcohol)
  const tempDown = bilinearInterpolate(temperature - deltaTemp, alcohol)

  if (!volUp || !volDown || !tempUp || !tempDown) return null

  const dVol_dAlcohol = new Big(volUp).minus(volDown).div(2 * deltaAlcohol)
  const dVol_dTemp = new Big(tempUp).minus(tempDown).div(2 * deltaTemp)

  const uncertaintyVol = dVol_dAlcohol.times(deltaAlcohol).pow(2)
    .plus(dVol_dTemp.times(deltaTemp).pow(2))
    .sqrt()

  const volUncStr = uncertaintyVol.toFixed(2)

  // 质量分数不确定度（通过体积分数传播）
  const baseMass = getMassFromVolume(base)
  if (!baseMass) return { vol: volUncStr, mass: null }

  const massUp = getMassFromVolume(new Big(base).plus(uncertaintyVol).toFixed(2))
  const massDown = getMassFromVolume(new Big(base).minus(uncertaintyVol).toFixed(2))
  if (!massUp || !massDown) return { vol: volUncStr, mass: null }

  const massUnc = new Big(massUp).minus(massDown).abs().div(2).toFixed(2)
  return { vol: volUncStr, mass: massUnc }
}
