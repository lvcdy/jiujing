export default {
  app: {
    title: '酒精浓度计算器',
    subtitle: '基于温度校正的标准浓度计算'
  },
  tab: {
    forward: '正向计算',
    reverse: '反向计算',
    density: '密度互查',
    chart: '浓度图表'
  },
  input: {
    alcohol: '酒精计读数',
    temperature: '当前温度',
    targetVol: '目标标准浓度',
    targetMass: '目标标准质量分数',
    density: '相对密度',
    volPercent: '体积分数',
    placeholder: {
      alcohol: '0.0',
      temperature: '20',
      targetVol: '40.00',
      density: '0.9500'
    }
  },
  button: {
    calculate: '开始计算 (Enter)',
    clear: '清空',
    loading: '加载中...',
    convert: '转换',
    lookup: '查询'
  },
  result: {
    standard: '校正后20℃标准浓度 (质量分数)',
    mass: '校正后20℃标准浓度 (质量分数)',
    volFraction: '体积分数',
    alcoholReading: '推算酒精计读数',
    density: '相对密度 (20℃)',
    volPercent: '体积分数',
    massPercent: '质量分数',
    unit: {
      vol: '% vol',
      mass: '% m',
      density: ' g/cm³'
    }
  },
  uncertainty: {
    title: '不确定度估算',
    alcoholPrecision: '酒精计分度值',
    tempPrecision: '温度计分度值',
    volResult: '体积分数扩展不确定度',
    massResult: '质量分数扩展不确定度',
    hint: '基于误差传播的扩展不确定度 (k=2)'
  },
  chart: {
    tempRange: '温度范围',
    alcoholFixed: '固定酒精计读数',
    xAxis: '温度 (℃)',
    yAxis: '校正后标准浓度 (% vol)',
    title: '温度对校正浓度的影响'
  },
  unit: {
    celsius: '℃',
    fahrenheit: '°F'
  },
  error: {
    required: '请输入完整数据',
    failed: '计算失败',
    loadFailed: '数据加载失败',
    outOfRange: '输入值超出数据范围'
  },
  keyboard: {
    hints: 'Enter 计算 · Esc 清空 · Ctrl+A 全选 · Ctrl+1~4 切换功能'
  },
  process: {
    title: '计算过程',
    inputParams: '输入参数',
    tempConvert: '温度单位转换',
    bilinearInterpolate: '双线性插值查表',
    lookupTable: '查表',
    massLookup: '质量分数查表',
    densityLookup: '相对密度查表',
    uncertainty: '不确定度估算',
    reverseInterpolate: '反向插值查表',
    massToVol: '质量分数转体积分数',
    searchInTable: '在酒精计-温度-标准浓度表中搜索'
  },
  language: {
    zh: '中文',
    en: 'English'
  }
};
