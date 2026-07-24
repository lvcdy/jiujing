import * as XLSX from 'xlsx'
import Big from 'big.js'

// 设置big.js的舍入模式为传统四舍五入
Big.RM = 1 // roundHalfUp

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

// 延迟加载并解析Excel数据到缓存
export const loadExcelData = async (url: string, key: string): Promise<ExcelCache | null> => {
  // 检查缓存
  if (cache.has(key)) {
    return cache.get(key)!
  }

  try {
    // 加载Excel文件
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    const ws = workbook.Sheets[workbook.SheetNames[0]]
    if (!ws) {
      console.error('Excel文件中没有工作表')
      return null
    }

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
  } catch (error) {
    console.error('加载Excel数据失败:', error)
    return null
  }
}

// 获取缓存数据
export const getExcelCache = (key: string): ExcelCache | null => {
  return cache.get(key) || null
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

const lerp = (a: number, b: number, t: Big): string => {
  if (!isFinite(a) || !isFinite(b)) return '0.00'
  return new Big(a).plus(new Big(b).minus(a).times(t)).toFixed(2)
}

export const bilinearInterpolate = (
  rowVal: number,
  colVal: number
): string | null => {
  console.log('\n' + '='.repeat(50))
  console.log('📊 双线性插值计算开始')
  console.log('='.repeat(50))
  console.log('📥 输入参数:')
  console.log('   - 温度:', rowVal, '℃')
  console.log('   - 酒精计读数:', colVal)

  if (!isFinite(rowVal) || !isFinite(colVal)) {
    console.error('❌ 输入值无效')
    return null;
  }

  const excelCache = getExcelCache('jiujing')
  if (!excelCache) {
    console.error('❌ Excel 缓存未找到')
    return null;
  }

  const { colCoords, rowCoords, data } = excelCache

  if (colCoords.length === 0 || rowCoords.length === 0) {
    console.error('❌ 坐标数据为空')
    return null;
  }

  console.log('\n📋 数据表信息:')
  console.log('   - 温度范围:', colCoords[0], '~', colCoords[colCoords.length - 1], '℃')
  console.log('   - 酒精计读数范围:', rowCoords[0], '~', rowCoords[rowCoords.length - 1])

  // 找到最近的索引
  const cIdx = findNearestIndex(colCoords, colVal)
  const rIdx = findNearestIndex(rowCoords, rowVal)

  // 确定数组排序方向
  const colIsDesc = colCoords[0] > colCoords[colCoords.length - 1]
  const rowIsDesc = rowCoords[0] > rowCoords[rowCoords.length - 1]

  console.log('\n🔍 查找最近索引:')
  console.log('   - 温度索引:', cIdx, '(值:', colCoords[cIdx], ')')
  console.log('   - 酒精计读数索引:', rIdx, '(值:', rowCoords[rIdx], ')')

  // 确定四个点的索引
  const cLow = colIsDesc
    ? Math.max(0, cIdx - (colVal > colCoords[cIdx] ? 1 : 0))
    : Math.max(0, cIdx - (colVal < colCoords[cIdx] ? 1 : 0))
  const cHigh = Math.min(colCoords.length - 1, cLow + 1)

  const rLow = rowIsDesc
    ? Math.max(0, rIdx - (rowVal > rowCoords[rIdx] ? 1 : 0))
    : Math.max(0, rIdx - (rowVal < rowCoords[rIdx] ? 1 : 0))
  const rHigh = Math.min(rowCoords.length - 1, rLow + 1)

  console.log('\n📐 插值网格点:')
  console.log('   - 温度索引范围: [', cLow, ',', cHigh, ']')
  console.log('   - 酒精计读数索引范围: [', rLow, ',', rHigh, ']')

  // 获取四个角的值
  const v11 = data.get(`${rLow},${cLow}`)
  if (v11 === undefined) {
    console.error('❌ 无法获取网格点数据')
    return null;
  }

  // 如果正好在网格点上
  if (cLow === cHigh && rLow === rHigh) {
    console.log('\n✅ 正好在网格点上，直接返回值:', v11)
    console.log('='.repeat(50) + '\n')
    return new Big(v11).toFixed(2);
  }

  const cMin = colCoords[cLow], cMax = colCoords[cHigh]
  const rMin = rowCoords[rLow], rMax = rowCoords[rHigh]

  console.log('\n📊 四个网格点的值:')
  console.log('   - v11 (温度=' + cMin + ', 酒精=' + rMin + '):', v11)

  const cT = cLow === cHigh ? new Big(0) : new Big(colVal).minus(cMin).div(new Big(cMax).minus(cMin))
  const rT = rLow === rHigh ? new Big(0) : new Big(rowVal).minus(rMin).div(new Big(rMax).minus(rMin))

  console.log('\n🔢 插值参数:')
  console.log('   - 温度插值参数 cT:', cT.toFixed(6))
  console.log('   - 酒精插值参数 rT:', rT.toFixed(6))

  // 单边插值
  if (cLow === cHigh) {
    const v21 = data.get(`${rHigh},${cLow}`)
    if (v21 === undefined) {
      console.error('❌ 无法获取网格点数据')
      return null;
    }
    console.log('   - v21 (温度=' + cMin + ', 酒精=' + rMax + '):', v21)
    console.log('\n📝 行插值计算:')
    console.log('   公式: result = v11 + (v21 - v11) × rT')
    console.log('   代入: result = ' + v11 + ' + (' + v21 + ' - ' + v11 + ') × ' + rT.toFixed(6))
    const result = new Big(v11).plus(new Big(v21).minus(v11).times(rT));
    console.log('   结果:', result.toFixed(2))
    console.log('='.repeat(50) + '\n')
    return result.toFixed(2);
  }

  if (rLow === rHigh) {
    const v12 = data.get(`${rLow},${cHigh}`)
    if (v12 === undefined) {
      console.error('❌ 无法获取网格点数据')
      return null;
    }
    console.log('   - v12 (温度=' + cMax + ', 酒精=' + rMin + '):', v12)
    console.log('\n📝 列插值计算:')
    console.log('   公式: result = v11 + (v12 - v11) × cT')
    console.log('   代入: result = ' + v11 + ' + (' + v12 + ' - ' + v11 + ') × ' + cT.toFixed(6))
    const result = new Big(v11).plus(new Big(v12).minus(v11).times(cT));
    console.log('   结果:', result.toFixed(2))
    console.log('='.repeat(50) + '\n')
    return result.toFixed(2);
  }

  // 双线性插值
  const v12 = data.get(`${rLow},${cHigh}`)
  const v21 = data.get(`${rHigh},${cLow}`)
  const v22 = data.get(`${rHigh},${cHigh}`)

  if (v12 === undefined || v21 === undefined || v22 === undefined) {
    console.error('❌ 无法获取网格点数据')
    return null;
  }

  console.log('   - v12 (温度=' + cMax + ', 酒精=' + rMin + '):', v12)
  console.log('   - v21 (温度=' + cMin + ', 酒精=' + rMax + '):', v21)
  console.log('   - v22 (温度=' + cMax + ', 酒精=' + rMax + '):', v22)

  console.log('\n📝 双线性插值计算:')
  console.log('   公式: result = v11×(1-cT)×(1-rT) + v12×cT×(1-rT) + v21×(1-cT)×rT + v22×cT×rT')

  const top = new Big(v11).times(new Big(1).minus(cT)).plus(new Big(v12).times(cT))
  const bottom = new Big(v21).times(new Big(1).minus(cT)).plus(new Big(v22).times(cT))
  const result = top.times(new Big(1).minus(rT)).plus(bottom.times(rT))

  console.log('   中间计算:')
  console.log('     - top = v11×(1-cT) + v12×cT = ' + v11 + '×' + new Big(1).minus(cT).toFixed(6) + ' + ' + v12 + '×' + cT.toFixed(6) + ' = ' + top.toFixed(4))
  console.log('     - bottom = v21×(1-cT) + v22×cT = ' + v21 + '×' + new Big(1).minus(cT).toFixed(6) + ' + ' + v22 + '×' + cT.toFixed(6) + ' = ' + bottom.toFixed(4))
  console.log('     - result = top×(1-rT) + bottom×rT = ' + top.toFixed(4) + '×' + new Big(1).minus(rT).toFixed(6) + ' + ' + bottom.toFixed(4) + '×' + rT.toFixed(6))
  console.log('   最终结果:', result.toFixed(2))
  console.log('='.repeat(50) + '\n')
  return result.toFixed(2);
}

export const getMassFromVolume = (volPct: string): string | null => {
  console.log('\n' + '='.repeat(50))
  console.log('⚖️ 体积分数转质量分数')
  console.log('='.repeat(50))
  console.log('📥 输入参数:')
  console.log('   - 体积分数:', volPct, '% vol')

  if (!volPct || isNaN(Number(volPct))) {
    console.error('❌ 输入值无效')
    return null;
  }

  const volBig = new Big(volPct);

  const excelCache = getExcelCache('wendu')
  if (!excelCache) {
    console.error('❌ Excel 缓存未找到')
    return null;
  }

  const { volMassData } = excelCache
  if (volMassData.length === 0) {
    console.error('❌ 体积-质量数据为空')
    return null;
  }

  console.log('\n📋 数据表信息:')
  console.log('   - 体积分数范围:', volMassData[0][0], '~', volMassData[volMassData.length - 1][0], '% vol')

  // 二分查找最近的体积值
  let low = 0, high = volMassData.length - 1

  while (low < high - 1) {
    const mid = (low + high) >> 1

    if (new Big(volMassData[mid][0]).eq(volBig)) {
      console.log('\n✅ 找到精确匹配值')
      console.log('   - 体积分数:', volMassData[mid][0], '% vol')
      console.log('   - 质量分数:', volMassData[mid][1], '% m')
      console.log('='.repeat(50) + '\n')
      return round2(volMassData[mid][1]);
    }

    if (new Big(volMassData[mid][0]).lt(volBig)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  // 线性插值
  const volLow = volMassData[low][0]
  const volHigh = volMassData[high][0]
  const massLow = volMassData[low][1]
  const massHigh = volMassData[high][1]

  console.log('\n🔍 查找插值区间:')
  console.log('   - 体积分数范围: [', volLow, ',', volHigh, ']')
  console.log('   - 对应质量分数: [', massLow, ',', massHigh, ']')

  if (low === high) {
    console.log('\n✅ 单点匹配')
    console.log('   - 质量分数:', massLow, '% m')
    console.log('='.repeat(50) + '\n')
    return round2(massLow);
  }

  const t = volBig.minus(volLow).div(new Big(volHigh).minus(volLow))

  console.log('\n📝 线性插值计算:')
  console.log('   公式: mass = massLow + (massHigh - massLow) × t')
  console.log('   其中: t = (volPct - volLow) / (volHigh - volLow)')
  console.log('   代入: t = (' + volPct + ' - ' + volLow + ') / (' + volHigh + ' - ' + volLow + ') = ' + t.toFixed(6))
  console.log('   代入: mass = ' + massLow + ' + (' + massHigh + ' - ' + massLow + ') × ' + t.toFixed(6))

  const result = lerp(massLow, massHigh, t);
  console.log('   结果:', result, '% m')
  console.log('='.repeat(50) + '\n')
  return result;
}

// 清除缓存（用于重新加载）
export const clearCache = () => cache.clear()
