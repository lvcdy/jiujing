export default {
  app: {
    title: 'Alcohol Concentration Calculator',
    subtitle: 'Standard concentration calculation based on temperature correction'
  },
  tab: {
    forward: 'Forward',
    reverse: 'Reverse',
    density: 'Density',
    chart: 'Chart'
  },
  input: {
    alcohol: 'Alcohol Meter Reading',
    temperature: 'Current Temperature',
    targetVol: 'Target Standard Concentration',
    density: 'Relative Density',
    volPercent: 'Volume Percent',
    placeholder: {
      alcohol: '0.0',
      temperature: '20',
      targetVol: '40.00',
      density: '0.9500'
    }
  },
  button: {
    calculate: 'Start Calculation (Enter)',
    clear: 'Clear',
    loading: 'Loading...',
    convert: 'Convert',
    lookup: 'Lookup'
  },
  result: {
    standard: 'Corrected 20℃ Standard (Volume)',
    mass: 'Corrected 20℃ Standard (Mass)',
    alcoholReading: 'Estimated Alcohol Meter Reading',
    density: 'Relative Density (20℃)',
    volPercent: 'Volume Percent',
    massPercent: 'Mass Percent',
    unit: {
      vol: '% vol',
      mass: '% m',
      density: ' g/cm³'
    }
  },
  uncertainty: {
    title: 'Uncertainty Estimation',
    alcoholPrecision: 'Alcohol Meter Division',
    tempPrecision: 'Thermometer Division',
    volResult: 'Volume Uncertainty (Expanded)',
    massResult: 'Mass Uncertainty (Expanded)',
    hint: 'Expanded uncertainty based on error propagation (k=2)'
  },
  chart: {
    tempRange: 'Temperature Range',
    alcoholFixed: 'Fixed Alcohol Reading',
    xAxis: 'Temperature (℃)',
    yAxis: 'Corrected Standard (% vol)',
    title: 'Effect of Temperature on Corrected Concentration'
  },
  unit: {
    celsius: '℃',
    fahrenheit: '°F'
  },
  error: {
    required: 'Please enter complete data',
    failed: 'Calculation failed',
    loadFailed: 'Data loading failed',
    outOfRange: 'Value out of data range'
  },
  keyboard: {
    hints: 'Enter Calculate · Tab Switch · Esc Clear · Ctrl+A Select'
  },
  process: {
    title: 'Calculation Process',
    inputParams: 'Input Parameters',
    tempConvert: 'Temperature Unit Conversion',
    bilinearInterpolate: 'Bilinear Interpolation Lookup',
    lookupTable: 'Lookup',
    massLookup: 'Mass Fraction Lookup',
    densityLookup: 'Relative Density Lookup',
    uncertainty: 'Uncertainty Estimation',
    reverseInterpolate: 'Reverse Interpolation Lookup',
    searchInTable: 'Search in alcohol-temperature-standard concentration table'
  },
  language: {
    zh: '中文',
    en: 'English'
  }
};
