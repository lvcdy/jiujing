export default {
  app: {
    title: '酒精浓度计算器',
    subtitle: '基于温度校正的标准浓度计算'
  },
  input: {
    alcohol: '酒精计读数',
    temperature: '当前温度',
    placeholder: {
      alcohol: '0.0',
      temperature: '20'
    }
  },
  button: {
    calculate: '开始计算 (Enter)',
    clear: '清空',
    loading: '加载中...'
  },
  result: {
    standard: '校正后20℃标准浓度',
    mass: '校正后20℃标准浓度',
    unit: {
      vol: '% vol',
      mass: '% m'
    }
  },
  error: {
    required: '请输入完整数据',
    failed: '计算失败',
    loadFailed: '数据加载失败'
  },
  keyboard: {
    hints: '快捷键: Enter 计算/跳转 | Tab 切换输入 | Esc 清空 | Ctrl+A 全选'
  },
  language: {
    zh: '中文',
    en: 'English'
  }
};
