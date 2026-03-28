export default {
  app: {
    title: 'Alcohol Concentration Calculator',
    subtitle: 'Standard concentration calculation based on temperature correction'
  },
  input: {
    alcohol: 'Alcohol Meter Reading',
    temperature: 'Current Temperature',
    placeholder: {
      alcohol: '0.0',
      temperature: '20'
    }
  },
  button: {
    calculate: 'Start Calculation (Enter)',
    clear: 'Clear',
    loading: 'Loading...'
  },
  result: {
    standard: 'Corrected 20℃ Standard Concentration',
    mass: 'Corrected 20℃ Standard Concentration',
    unit: {
      vol: '% vol',
      mass: '% m'
    }
  },
  error: {
    required: 'Please enter complete data',
    failed: 'Calculation failed',
    loadFailed: 'Data loading failed'
  },
  keyboard: {
    hints: 'Keyboard shortcuts: Enter Calculate/Next | Tab Switch Input | Esc Clear | Ctrl+A Select All'
  },
  language: {
    zh: '中文',
    en: 'English'
  }
};
