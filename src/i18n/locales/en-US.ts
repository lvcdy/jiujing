export default {
  app: {
    title: 'Alcohol Concentration Calculator',
    subtitle: 'Standard concentration calculation based on temperature correction'
  },
  tab: {
    forward: 'Forward',
    reverse: 'Reverse',
    density: 'Density',
    yield: 'Yield',
    chart: 'Chart'
  },
  input: {
    alcohol: 'Alcohol Meter Reading',
    temperature: 'Current Temperature',
    targetVol: 'Target Standard Concentration',
    targetMass: 'Target Standard Mass Fraction',
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
    standard: 'Corrected 20℃ Standard (Mass Fraction)',
    mass: 'Corrected 20℃ Standard (Mass)',
    volFraction: 'Volume Fraction',
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
    hints: 'Enter Calculate · Esc Clear · Ctrl+A Select · Ctrl+1~5 Switch Tab'
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
    massToVol: 'Mass Fraction to Volume Fraction',
    searchInTable: 'Search in alcohol-temperature-standard concentration table',
    yieldRawActive: 'Raw Active Ingredient',
    yieldProdActive: 'Product Active Ingredient',
    yieldResult: 'Yield Calculation'
  },
  language: {
    zh: '中文',
    en: 'English'
  },
  theme: {
    auto: 'Auto (follow system)',
    light: 'Light mode',
    dark: 'Dark mode'
  },
  yield: {
    title: 'Yield Calculation',
    rawMass: 'Raw Material Mass',
    rawConc: 'Raw Material Concentration',
    productMass: 'Product Mass',
    productConc: 'Product Concentration',
    rawActive: 'Raw Active Ingredient',
    prodActive: 'Product Active Ingredient',
    rawInput: 'Raw Input',
    prodInput: 'Product Output',
    resultLabel: 'Calculated Yield',
    emptyTitle: 'Calculate Yield',
    emptyHint: 'Enter mass and concentration of raw material and product to calculate active ingredient yield'
  },
  ui: {
    cardTitle: {
      inputParams: 'Input Parameters',
      densityLookup: 'Density → Alcohol Lookup',
      chartSettings: 'Chart Settings'
    },
    badge: {
      calcDone: '✓ Calculation Done',
      lookupDone: '✓ Lookup Done'
    },
    secLabel: {
      targetMass: 'Target Mass Fraction',
      refTemp: 'Reference Temperature',
      volFraction: 'Volume Fraction',
      exactDensity: 'Exact Density'
    }
  },
  emptyState: {
    forward: {
      title: 'Enter Parameters to Calculate',
      hint: 'Enter alcohol meter reading and temperature, click calculate to get standard alcohol concentration'
    },
    reverse: {
      title: 'Enter Target Mass Fraction',
      hint: 'Enter desired standard mass fraction and current temperature to get the required alcohol meter reading'
    },
    density: {
      title: 'Density Lookup',
      hint: 'Enter solution density or alcohol concentration to look up corresponding values'
    },
    chart: {
      title: 'Concentration Curve',
      hint: 'Enter alcohol concentration to automatically generate the temperature-concentration curve'
    }
  }
};
