<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
  import {
    loadExcelData, bilinearInterpolate, getMassFromVolume,
    getDensityFromVolume, getVolumeFromDensity, getVolumeFromMass,
    reverseInterpolate, estimateUncertainty,
  } from '../utils/data'
  import jiujingJson from '../assets/jiujing.json?url'
  import wenduJson from '../assets/wendu.json?url'
  import i18n from '../i18n'
  import ProcessSteps from './ProcessSteps.svelte'
  import type { ProcessStep } from './ProcessSteps.svelte'
  import ResultCard from './ResultCard.svelte'
  import './Calculator.css'

  Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

  type Tab = 'forward' | 'reverse' | 'density' | 'chart' | 'yield'

  // i18n
  let lang = $state(i18n.language || 'zh-CN')
  i18n.on('languageChanged', (lng: string) => { lang = lng })
  // t 必须依赖 lang 才能在语言切换时触发响应式更新
  const t = $derived.by(() => {
    void lang
    return (key: string) => i18n.t(key)
  })

  // 全局状态
  let activeTab = $state<Tab>('forward')
  let loading = $state(true)
  let error = $state('')
  let tempUnit = $state<'℃' | '°F'>(
    (localStorage.getItem('tempUnit') as '℃' | '°F') || '℃'
  )
  let langDropdownOpen = $state(false)
  type ThemeMode = 'auto' | 'light' | 'dark'
  let themeMode = $state<ThemeMode>(
    (localStorage.getItem('themeMode') as ThemeMode) || 'auto'
  )
  let systemDark = $state(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const isDark = $derived(
    themeMode === 'auto' ? systemDark : themeMode === 'dark'
  )

  // 正向计算
  let alcohol = $state('')
  let temperature = $state('')
  let forwardVol = $state('')
  let forwardMass = $state('')
  let forwardDensity = $state('')
  let forwardUncVol = $state('')
  let forwardUncMass = $state('')
  let forwardProcess = $state<ProcessStep[]>([])

  // 反向计算
  let targetVol = $state('')
  let reverseTemp = $state('')
  let reverseResult = $state('')
  let reverseProcess = $state<ProcessStep[]>([])

  // 密度互查
  let densityInput = $state('')
  let volInput = $state('')

  let densityVol = $state('')
  let densityMass = $state('')
  let densityDensity = $state('')

  // 产率计算
  let yieldRawMass = $state('')
  let yieldRawConc = $state('')
  let yieldProductMass = $state('')
  let yieldProductConc = $state('')
  let yieldResult = $state('')
  let yieldProcess = $state<ProcessStep[]>([])

  // 图表
  let chartAlcohol = $state('')

  // Refs
  let alcoholInputEl: HTMLInputElement | undefined = $state()
  let temperatureInputEl: HTMLInputElement | undefined = $state()
  let targetVolEl: HTMLInputElement | undefined = $state()
  let reverseTempEl: HTMLInputElement | undefined = $state()
  let densityInputEl: HTMLInputElement | undefined = $state()
  let volInputEl: HTMLInputElement | undefined = $state()
  let yieldRawMassEl: HTMLInputElement | undefined = $state()
  let yieldRawConcEl: HTMLInputElement | undefined = $state()
  let yieldProductMassEl: HTMLInputElement | undefined = $state()
  let yieldProductConcEl: HTMLInputElement | undefined = $state()

  let chartAlcoholEl: HTMLInputElement | undefined = $state()
  let canvasEl: HTMLCanvasElement | undefined = $state()

  // Chart.js 实例
  let chartInstance: Chart | null = null

  // 图表数据（响应式）
  const chartData = $derived.by(() => {
    if (!chartAlcohol) return null
    const alc = Number(chartAlcohol)
    if (isNaN(alc)) return null
    const temps: number[] = []
    for (let i = -10; i <= 40; i += 2) temps.push(i)
    const labels = temps.map(i => {
      const d = fromCelsius(i)
      return tempUnit === '°F' ? d.toFixed(0) : i.toString()
    })
    const values = temps.map(i => {
      const v = bilinearInterpolate(i, alc)
      return v ? Number(Number(v).toFixed(2)) : null
    })
    return { labels, values }
  })

  // 同步 <meta name="color-scheme"> 到文档
  function applyColorScheme() {
    const meta = document.querySelector('meta[name="color-scheme"]') || (() => {
      const m = document.createElement('meta')
      m.name = 'color-scheme'
      document.head.appendChild(m)
      return m
    })()
    meta.content = isDark ? 'dark' : 'light'
  }

  function cycleTheme() {
    const cycle: ThemeMode[] = ['auto', 'light', 'dark']
    themeMode = cycle[(cycle.indexOf(themeMode) + 1) % 3]
    localStorage.setItem('themeMode', themeMode)
    applyColorScheme()
  }

  const themeIcon = $derived(
    themeMode === 'auto' ? '🌓' : isDark ? '🌙' : '☀'
  )
  const themeLabel = $derived(
    themeMode === 'auto' ? t('theme.auto') : isDark ? t('theme.dark') : t('theme.light')
  )

  // 点击外部关闭语言下拉
  function handleDocumentClick(e: MouseEvent) {
    if (langDropdownOpen) {
      const target = e.target as HTMLElement
      if (!target.closest('.language-dropdown')) {
        langDropdownOpen = false
      }
    }
  }

  // 加载数据 & 全局事件
  onMount(() => {
    Promise.all([loadExcelData(jiujingJson, 'jiujing'), loadExcelData(wenduJson, 'wendu')])
      .then(() => {
        loading = false
        setTimeout(() => alcoholInputEl?.focus(), 100)
      })
      .catch(() => {
        error = t('error.loadFailed')
        loading = false
      })

    window.addEventListener('keydown', handleGlobalKeyDown)
    document.addEventListener('click', handleDocumentClick)

    // 监听系统主题偏好变化
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemTheme = (e: MediaQueryListEvent) => { systemDark = e.matches }
    mql.addEventListener('change', handleSystemTheme)

    // 同步 <meta color-scheme>
    applyColorScheme()

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      document.removeEventListener('click', handleDocumentClick)
      mql.removeEventListener('change', handleSystemTheme)
    }
  })

  // 图表效果
  $effect(() => {
    void canvasEl; void chartData; void tempUnit

    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    if (!canvasEl || !chartData) return

    const isLight = !isDark
    const tickColor = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)'
    const labelColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
    const tooltipBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(20, 20, 40, 0.9)'
    const tooltipText = isLight ? '#1c1c22' : '#fff'

    chartInstance = new Chart(canvasEl, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: `${chartAlcohol}%`,
          data: chartData.values,
          borderColor: '#3b82f6',
          backgroundColor: isLight ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.12)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: isLight ? '#fff' : '#fff',
          pointBorderWidth: 1.5,
          fill: true,
          tension: 0.3,
          spanGaps: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipText, bodyColor: tooltipText,
            borderColor: isLight ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)', borderWidth: 1,
            cornerRadius: 8, padding: 10,
          }
        },
        scales: {
          x: {
            title: { display: true, text: t('chart.xAxis'), color: labelColor, font: { size: 11 } },
            ticks: { color: tickColor, font: { size: 10 }, maxTicksLimit: 12 },
            grid: { color: gridColor },
          },
          y: {
            title: { display: true, text: t('chart.yAxis'), color: labelColor, font: { size: 11 } },
            ticks: { color: tickColor, font: { size: 10 } },
            grid: { color: gridColor },
          }
        }
      }
    })
  })

  onDestroy(() => {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
  })

  // 辅助函数
  const celsiusToFahrenheit = (c: number): number => c * 9 / 5 + 32
  const fahrenheitToCelsius = (f: number): number => (f - 32) * 5 / 9

  function toCelsius(val: string): number {
    const num = Number(val)
    if (isNaN(num)) return NaN
    return tempUnit === '°F' ? fahrenheitToCelsius(num) : num
  }

  function fromCelsius(celsius: number): number {
    return tempUnit === '°F' ? celsiusToFahrenheit(celsius) : celsius
  }

  function handleInput(value: string, setter: (v: string) => void) {
    setter(value.replace(/。/g, '.').replace(/[^0-9.-]/g, '').replace(/\.{2,}/g, '.').replace(/^(-?\d+\.\d+).*$/, '$1'))
  }

  // 计算
  function calculate() {
    if (!alcohol || !temperature) { error = t('error.required'); return }
    error = ''
    const steps: ProcessStep[] = []
    let stepNum = 1

    // Step 1: 输入参数
    const tempC = toCelsius(temperature)
    steps.push({
      step: stepNum++,
      label: t('process.inputParams'),
      detail: `${t('input.alcohol')}: ${alcohol}% | ${t('input.temperature')}: ${temperature}${tempUnit}`,
      formula: `A = ${alcohol}%, T = ${temperature}${tempUnit}`
    })

    // Step 2: 温度转换（如果使用°F）
    if (tempUnit === '°F') {
      steps.push({
        step: stepNum++,
        label: t('process.tempConvert'),
        detail: `${temperature}°F → ${tempC.toFixed(2)}℃`,
        formula: `T_℃ = (${temperature} - 32) × 5/9 = ${tempC.toFixed(2)}℃`
      })
    }

    // Step 3: 双线性插值
    const volRaw = bilinearInterpolate(tempC, Number(alcohol))
    if (!volRaw) { error = t('error.failed'); return }
    steps.push({
      step: stepNum++,
      label: t('process.bilinearInterpolate'),
      detail: `${t('process.lookupTable')} jiujing → ${t('result.standard')}: ${Number(volRaw).toFixed(2)}% vol`,
      formula: `V(20℃) = bilinear(T=${tempC.toFixed(1)}℃, A=${alcohol}%) = ${Number(volRaw).toFixed(2)}`
    })

    forwardVol = Number(volRaw).toFixed(2)

    // Step 4: 查找质量分数
    forwardMass = getMassFromVolume(volRaw) ?? ''
    if (forwardMass) {
      steps.push({
        step: stepNum++,
        label: t('process.massLookup'),
        detail: `${forwardVol}% vol → ${forwardMass}% m`,
        formula: `m = lookup(vol=${forwardVol}) = ${forwardMass}`
      })
    }

    // Step 5: 查找相对密度
    forwardDensity = getDensityFromVolume(forwardVol) ?? ''
    if (forwardDensity) {
      steps.push({
        step: stepNum++,
        label: t('process.densityLookup'),
        detail: `${forwardVol}% vol → ${forwardDensity} g/cm³`,
        formula: `ρ = lookup(vol=${forwardVol}) = ${forwardDensity}`
      })
    }

    // Step 6: 不确定度估算
    const unc = estimateUncertainty(Number(alcohol), tempC)
    forwardUncVol = unc?.vol ?? ''
    forwardUncMass = unc?.mass ?? ''
    if (unc) {
      steps.push({
        step: stepNum++,
        label: t('process.uncertainty'),
        detail: `±${unc.vol}% vol${unc.mass ? ` | ±${unc.mass}% m` : ''}`,
        formula: `U = √((∂V/∂A · δA)² + (∂V/∂T · δT)²)`
      })
    }

    forwardProcess = steps
  }

  function doReverse() {
    if (!targetVol || !reverseTemp) { error = t('error.required'); return }
    error = ''
    const steps: ProcessStep[] = []
    let stepNum = 1

    // Step 1: 输入参数
    const tempC = toCelsius(reverseTemp)
    steps.push({
      step: stepNum++,
      label: t('process.inputParams'),
      detail: `${t('input.targetVol')}: ${targetVol}% vol | ${t('input.temperature')}: ${reverseTemp}${tempUnit}`,
      formula: `V_target = ${targetVol}%, T = ${reverseTemp}${tempUnit}`
    })

    // Step 2: 温度转换（如果使用°F）
    if (tempUnit === '°F') {
      steps.push({
        step: stepNum++,
        label: t('process.tempConvert'),
        detail: `${reverseTemp}°F → ${tempC.toFixed(2)}℃`,
        formula: `T_℃ = (${reverseTemp} - 32) × 5/9 = ${tempC.toFixed(2)}℃`
      })
    }

    // Step 2.5: 质量分数 → 体积分数转换
    const volFromMass = getVolumeFromMass(targetVol)
    if (!volFromMass) { error = t('error.failed'); return }
    steps.push({
      step: stepNum++,
      label: t('process.massToVol'),
      detail: `质量分数 ${targetVol}% m → 体积分数 ${volFromMass}% vol`,
      formula: `V = mass_to_vol(m=${targetVol}%) = ${volFromMass}% vol`
    })

    // Step 3: 反向插值
    const r = reverseInterpolate(Number(volFromMass), tempC)
    if (r === null) { error = t('error.failed'); return }
    steps.push({
      step: stepNum++,
      label: t('process.reverseInterpolate'),
      detail: `${t('process.searchInTable')} → ${t('result.alcoholReading')}: ${r}%`,
      formula: `A = reverse_lookup(V=${volFromMass}%, T=${tempC.toFixed(1)}℃) = ${r}`
    })

    reverseResult = r
    reverseProcess = steps
  }

  function doDensityLookup() {
    error = ''
    // 先清空上一次的结果，确保每次查询都能触发响应式更新
    densityVol = ''
    densityMass = ''
    densityDensity = ''
    if (densityInput) {
      const numVal = Number(densityInput)
      if (isNaN(numVal) || !isFinite(numVal)) { error = t('error.failed'); return }
      const vol = getVolumeFromDensity(numVal)
      if (!vol) { error = t('error.failed'); return }
      densityVol = vol
      densityMass = getMassFromVolume(vol) ?? ''
      densityDensity = densityInput
    } else if (volInput) {
      const numVal = Number(volInput)
      if (isNaN(numVal) || !isFinite(numVal)) { error = t('error.failed'); return }
      const density = getDensityFromVolume(volInput)
      if (!density) { error = t('error.failed'); return }
      densityVol = volInput
      densityMass = getMassFromVolume(volInput) ?? ''
      densityDensity = density
    } else {
      error = t('error.required')
    }
  }

  function doYieldCalc() {
    error = ''
    yieldResult = ''
    yieldProcess = []
    if (!yieldRawMass || !yieldRawConc || !yieldProductMass || !yieldProductConc) {
      error = t('error.required'); return
    }
    const rawMass = Number(yieldRawMass)
    const rawConc = Number(yieldRawConc)
    const prodMass = Number(yieldProductMass)
    const prodConc = Number(yieldProductConc)
    if (isNaN(rawMass) || isNaN(rawConc) || isNaN(prodMass) || isNaN(prodConc)) {
      error = t('error.failed'); return
    }
    if (rawMass <= 0 || rawConc <= 0 || prodMass <= 0 || prodConc <= 0) {
      error = t('error.failed'); return
    }

    const rawActive = rawMass * rawConc / 100
    const prodActive = prodMass * prodConc / 100
    const yieldVal = (prodActive / rawActive) * 100

    yieldResult = yieldVal.toFixed(2)

    yieldProcess = [
      { label: t('process.inputParams'), detail: `原料 ${rawMass}kg × ${rawConc}%`, formula: `m₀=${rawMass}kg, C₀=${rawConc}%` },
      { label: t('process.inputParams'), detail: `产品 ${prodMass}kg × ${prodConc}%`, formula: `m₁=${prodMass}kg, C₁=${prodConc}%` },
      { label: t('process.yieldRawActive'), detail: `原料活性成分: ${rawActive.toFixed(4)}kg`, formula: `A₀ = ${rawMass} × ${rawConc}/100 = ${rawActive.toFixed(4)}` },
      { label: t('process.yieldProdActive'), detail: `产品活性成分: ${prodActive.toFixed(4)}kg`, formula: `A₁ = ${prodMass} × ${prodConc}/100 = ${prodActive.toFixed(4)}` },
      { label: t('process.yieldResult'), detail: `产率 = ${yieldVal.toFixed(2)}%`, formula: `η = ${prodActive.toFixed(4)} / ${rawActive.toFixed(4)} × 100 = ${yieldVal.toFixed(2)}%` },
    ]
  }

  function clearAll() {
    alcohol = ''; temperature = ''; forwardVol = ''; forwardMass = ''; forwardDensity = ''
    forwardUncVol = ''; forwardUncMass = ''; forwardProcess = []
    targetVol = ''; reverseTemp = ''; reverseResult = ''; reverseProcess = []
    densityInput = ''; volInput = ''; densityVol = ''; densityMass = ''; densityDensity = ''
    yieldRawMass = ''; yieldRawConc = ''; yieldProductMass = ''; yieldProductConc = ''; yieldResult = ''; yieldProcess = []
    chartAlcohol = ''; error = ''
  }

  function toggleTempUnit() {
    const newUnit = tempUnit === '℃' ? '°F' : '℃'
    tempUnit = newUnit
    localStorage.setItem('tempUnit', newUnit)
    const convert = (val: string): string => {
      if (!val) return val
      const num = Number(val)
      if (isNaN(num)) return val
      return (newUnit === '°F' ? celsiusToFahrenheit(num) : fahrenheitToCelsius(num)).toFixed(1)
    }
    temperature = convert(temperature)
    reverseTemp = convert(reverseTemp)
  }

  function changeLanguage(lng: string) {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
    langDropdownOpen = false
  }

  function handleKeyDown(e: KeyboardEvent, field: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (activeTab === 'forward') {
        if (alcohol && temperature) calculate()
        else if (field === 'alcohol') temperatureInputEl?.focus()
        else error = t('error.required')
      } else if (activeTab === 'reverse') {
        if (targetVol && reverseTemp) doReverse()
        else if (field === 'targetVol') reverseTempEl?.focus()
        else error = t('error.required')
      } else if (activeTab === 'density') {
        doDensityLookup()
      } else if (activeTab === 'yield') {
        doYieldCalc()
      } else if (activeTab === 'chart') {
        if (!chartAlcohol) error = t('error.required')
      }
    }
    if (e.key === 'Escape') {
      const setters: Record<string, (v: string) => void> = {
        alcohol: v => alcohol = v, temperature: v => temperature = v,
        targetVol: v => targetVol = v, reverseTemp: v => reverseTemp = v,
        densityInput: v => densityInput = v, volInput: v => volInput = v,
        yieldRawMass: v => yieldRawMass = v, yieldRawConc: v => yieldRawConc = v,
        yieldProductMass: v => yieldProductMass = v, yieldProductConc: v => yieldProductConc = v,
        chartAlcohol: v => chartAlcohol = v,
      }
      setters[field]?.('')
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      const refs: Record<string, HTMLInputElement | undefined> = {
        alcohol: alcoholInputEl, temperature: temperatureInputEl,
        targetVol: targetVolEl, reverseTemp: reverseTempEl,
        densityInput: densityInputEl, volInput: volInputEl,
        yieldRawMass: yieldRawMassEl, yieldRawConc: yieldRawConcEl,
        yieldProductMass: yieldProductMassEl, yieldProductConc: yieldProductConcEl,
        chartAlcohol: chartAlcoholEl,
      }
      refs[field]?.select()
    }
  }

  // 全局键盘快捷键：Ctrl+1/2/3/4 切换 Tab
  function handleGlobalKeyDown(e: KeyboardEvent) {
    // 关闭语言下拉
    if (langDropdownOpen && e.key === 'Escape') {
      langDropdownOpen = false
      return
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const tabMap: Record<string, Tab> = { '1': 'forward', '2': 'reverse', '3': 'density', '4': 'yield', '5': 'chart' }
      if (tabMap[e.key]) {
        e.preventDefault()
        activeTab = tabMap[e.key]
        error = ''
        // 自动 focus 到对应 Tab 的第一个输入框
        setTimeout(() => {
          if (activeTab === 'forward') alcoholInputEl?.focus()
          else if (activeTab === 'reverse') targetVolEl?.focus()
          else if (activeTab === 'density') densityInputEl?.focus()
          else if (activeTab === 'yield') yieldRawMassEl?.focus()
          else if (activeTab === 'chart') chartAlcoholEl?.focus()
        }, 50)
      }
    }
  }

  const tempLabel = $derived(tempUnit === '℃' ? t('unit.celsius') : t('unit.fahrenheit'))
</script>

<div class="calculator" class:light={!isDark}>
  {#if loading}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>{t('button.loading')}</span>
    </div>
  {:else}
  <div class="app-shell">

    <!-- ═══ Top Bar ═══ -->
    <div class="top-bar">
      <div class="top-bar-brand">
        <span class="brand-icon">🧪</span>
        <h1>{t('app.title')}</h1>
      </div>
      <div class="top-bar-controls">
        <button class="ctrl-btn temp-unit" onclick={toggleTempUnit} title="切换单位">{tempUnit}</button>
        <div class="language-dropdown" class:open={langDropdownOpen}>
          <button class="ctrl-btn" onclick={() => langDropdownOpen = !langDropdownOpen}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); langDropdownOpen = !langDropdownOpen } }}
            aria-expanded={langDropdownOpen} aria-haspopup="true">
            {lang === 'zh-CN' ? '中文' : 'English'}
            <span class="dropdown-arrow">▾</span>
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item" class:active={lang === 'zh-CN'}
              onclick={() => changeLanguage('zh-CN')}
              onkeydown={(e) => { if (e.key === 'Enter') changeLanguage('zh-CN') }}>中文</button>
            <button class="dropdown-item" class:active={lang === 'en-US'}
              onclick={() => changeLanguage('en-US')}
              onkeydown={(e) => { if (e.key === 'Enter') changeLanguage('en-US') }}>English</button>
          </div>
        </div>
        <button class="ctrl-btn icon-btn" onclick={cycleTheme} title={themeLabel}>
          {themeIcon}
        </button>
      </div>
    </div>

    <!-- ═══ Segmented Control ═══ -->
    <div class="seg-control-wrap">
      <div class="seg-control">
        {#each [
          { id: 'forward', icon: '📊', label: t('tab.forward') },
          { id: 'reverse', icon: '🔄', label: t('tab.reverse') },
          { id: 'density', icon: '📐', label: t('tab.density') },
          { id: 'yield',   icon: '⚖️', label: t('tab.yield') },
          { id: 'chart',   icon: '📈', label: t('tab.chart') },
        ] as tab}
          <button class="seg-tab" class:active={activeTab === tab.id}
            onclick={() => { activeTab = tab.id as Tab; error = '' }}>
            <span class="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- ═══ Content Area ═══ -->
    <div class="content-area">

      <!-- ─── Left Panel: Input ─── -->
      <div class="panel">
        {#if activeTab === 'forward'}
          <div class="card">
            <h2 class="card-title">输入参数</h2>
            <div class="input-field">
              <label for="alcohol-input">{t('input.alcohol')}</label>
              <div class="input-box" class:has-error={!!error}>
                <input id="alcohol-input" bind:this={alcoholInputEl} type="text" inputmode="decimal" value={alcohol}
                  oninput={(e) => handleInput(e.currentTarget.value, v => alcohol = v)}
                  onkeydown={(e) => handleKeyDown(e, 'alcohol')}
                  placeholder="输入读数…" disabled={loading} />
                <span class="input-unit">%</span>
              </div>
            </div>
            <div class="input-field">
              <label for="temperature-input">{t('input.temperature')}</label>
              <div class="input-box">
                <input id="temperature-input" bind:this={temperatureInputEl} type="text" inputmode="decimal" value={temperature}
                  oninput={(e) => handleInput(e.currentTarget.value, v => temperature = v)}
                  onkeydown={(e) => handleKeyDown(e, 'temperature')}
                  placeholder="输入温度…" disabled={loading} />
                <span class="input-unit">{tempLabel}</span>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick={calculate} disabled={loading || !alcohol || !temperature}>{t('button.calculate')}</button>
              <button class="btn-secondary" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
            </div>
            {#if error}
              <div class="error-toast"><span>⚠️</span>{error}</div>
            {/if}
          </div>

        {:else if activeTab === 'reverse'}
          <div class="card">
            <h2 class="card-title">输入参数</h2>
            <div class="input-field">
              <label for="target-vol-input">{t('input.targetMass')}</label>
              <div class="input-box">
                <input id="target-vol-input" bind:this={targetVolEl} type="text" inputmode="decimal" value={targetVol}
                  oninput={(e) => handleInput(e.currentTarget.value, v => targetVol = v)}
                  onkeydown={(e) => handleKeyDown(e, 'targetVol')}
                  placeholder={t('input.placeholder.targetVol')} disabled={loading} />
                <span class="input-unit">% m</span>
              </div>
            </div>
            <div class="input-field">
              <label for="reverse-temp-input">{t('input.temperature')}</label>
              <div class="input-box">
                <input id="reverse-temp-input" bind:this={reverseTempEl} type="text" inputmode="decimal" value={reverseTemp}
                  oninput={(e) => handleInput(e.currentTarget.value, v => reverseTemp = v)}
                  onkeydown={(e) => handleKeyDown(e, 'reverseTemp')}
                  placeholder={t('input.placeholder.temperature')} disabled={loading} />
                <span class="input-unit">{tempLabel}</span>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick={doReverse} disabled={loading || !targetVol || !reverseTemp}>{t('button.calculate')}</button>
              <button class="btn-secondary" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
            </div>
            {#if error}
              <div class="error-toast"><span>⚠️</span>{error}</div>
            {/if}
          </div>

        {:else if activeTab === 'density'}
          <div class="card">
            <h2 class="card-title">密度 → 酒精度查表</h2>
            <div class="input-field">
              <label for="density-input">{t('input.density')}</label>
              <div class="input-box">
                <input id="density-input" bind:this={densityInputEl} type="text" inputmode="decimal" value={densityInput}
                  oninput={(e) => handleInput(e.currentTarget.value, v => densityInput = v)}
                  onkeydown={(e) => handleKeyDown(e, 'densityInput')}
                  placeholder="输入密度…" disabled={loading} />
                <span class="input-unit">g/cm³</span>
              </div>
            </div>
            <div class="divider-text">—— OR ——</div>
            <div class="input-field">
              <label for="vol-input">{t('input.volPercent')}</label>
              <div class="input-box">
                <input id="vol-input" bind:this={volInputEl} type="text" inputmode="decimal" value={volInput}
                  oninput={(e) => handleInput(e.currentTarget.value, v => volInput = v)}
                  onkeydown={(e) => handleKeyDown(e, 'volInput')}
                  placeholder={t('input.placeholder.alcohol')} disabled={loading} />
                <span class="input-unit">% vol</span>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick={doDensityLookup} disabled={loading || (!densityInput && !volInput)}>{t('button.lookup')}</button>
              <button class="btn-secondary" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
            </div>
            {#if error}
              <div class="error-toast"><span>⚠️</span>{error}</div>
            {/if}
          </div>

        {:else if activeTab === 'yield'}
          <div class="card">
            <h2 class="card-title">{t('yield.title')}</h2>
            <div class="input-field">
              <label for="yield-raw-mass">{t('yield.rawMass')}</label>
              <div class="input-box">
                <input id="yield-raw-mass" bind:this={yieldRawMassEl} type="text" inputmode="decimal" value={yieldRawMass}
                  oninput={(e) => handleInput(e.currentTarget.value, v => yieldRawMass = v)}
                  onkeydown={(e) => handleKeyDown(e, 'yieldRawMass')}
                  placeholder="0.0" disabled={loading} />
                <span class="input-unit">kg</span>
              </div>
            </div>
            <div class="input-field">
              <label for="yield-raw-conc">{t('yield.rawConc')}</label>
              <div class="input-box">
                <input id="yield-raw-conc" bind:this={yieldRawConcEl} type="text" inputmode="decimal" value={yieldRawConc}
                  oninput={(e) => handleInput(e.currentTarget.value, v => yieldRawConc = v)}
                  onkeydown={(e) => handleKeyDown(e, 'yieldRawConc')}
                  placeholder="0.0" disabled={loading} />
                <span class="input-unit">%</span>
              </div>
            </div>
            <div class="divider-text">—— → ——</div>
            <div class="input-field">
              <label for="yield-product-mass">{t('yield.productMass')}</label>
              <div class="input-box">
                <input id="yield-product-mass" bind:this={yieldProductMassEl} type="text" inputmode="decimal" value={yieldProductMass}
                  oninput={(e) => handleInput(e.currentTarget.value, v => yieldProductMass = v)}
                  onkeydown={(e) => handleKeyDown(e, 'yieldProductMass')}
                  placeholder="0.0" disabled={loading} />
                <span class="input-unit">kg</span>
              </div>
            </div>
            <div class="input-field">
              <label for="yield-product-conc">{t('yield.productConc')}</label>
              <div class="input-box">
                <input id="yield-product-conc" bind:this={yieldProductConcEl} type="text" inputmode="decimal" value={yieldProductConc}
                  oninput={(e) => handleInput(e.currentTarget.value, v => yieldProductConc = v)}
                  onkeydown={(e) => handleKeyDown(e, 'yieldProductConc')}
                  placeholder="0.0" disabled={loading} />
                <span class="input-unit">%</span>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn-primary" onclick={doYieldCalc} disabled={loading || !yieldRawMass || !yieldRawConc || !yieldProductMass || !yieldProductConc}>{t('button.calculate')}</button>
              <button class="btn-secondary" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
            </div>
            {#if error}
              <div class="error-toast"><span>⚠️</span>{error}</div>
            {/if}
          </div>

        {:else if activeTab === 'chart'}
          <div class="card">
            <h2 class="card-title">图表设置</h2>
            <div class="input-field">
              <label for="chart-alcohol-input">{t('chart.alcoholFixed')}</label>
              <div class="input-box">
                <input id="chart-alcohol-input" bind:this={chartAlcoholEl} type="text" inputmode="decimal" value={chartAlcohol}
                  oninput={(e) => handleInput(e.currentTarget.value, v => chartAlcohol = v)}
                  onkeydown={(e) => handleKeyDown(e, 'chartAlcohol')}
                  placeholder={t('input.placeholder.alcohol')} disabled={loading} />
                <span class="input-unit">%</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- ─── Right Panel: Result ─── -->
      <div class="panel">

        {#if activeTab === 'forward'}
          {#if forwardVol}
            <div class="card">
              <div class="result-meta">
                <span class="meta-label">{t('result.standard')}</span>
                <span class="meta-badge">✓ 计算完成</span>
              </div>
              <div class="result-hero">
                <span class="hero-number">{forwardMass}</span>
                <span class="hero-unit">{t('result.unit.mass')}</span>
              </div>
              <div class="card-divider"></div>
              <div class="secondary-results">
                <div class="sec-row">
                  <span class="sec-label">{t('result.volFraction')}</span>
                  <span class="sec-value">{forwardVol}{t('result.unit.vol')}</span>
                </div>
                {#if forwardDensity}
                  <div class="sec-row">
                    <span class="sec-label">{t('result.density')}</span>
                    <span class="sec-value">{forwardDensity}{t('result.unit.density')}</span>
                  </div>
                {/if}
                {#if forwardUncMass}
                  <div class="sec-row">
                    <span class="sec-label">{t('uncertainty.massResult')}</span>
                    <span class="sec-value">±{forwardUncMass}{t('result.unit.mass')}</span>
                  </div>
                {/if}
                {#if forwardUncVol}
                  <div class="sec-row">
                    <span class="sec-label">{t('uncertainty.volResult')}</span>
                    <span class="sec-value">±{forwardUncVol}{t('result.unit.vol')}</span>
                  </div>
                {/if}
              </div>
            </div>
          {:else}
            <div class="card">
              <div class="empty-state">
                <div class="empty-icon">🧪</div>
                <div class="empty-title">输入参数开始计算</div>
                <div class="empty-hint">输入酒精计读数和温度，点击计算按钮获取标准酒精度</div>
              </div>
            </div>
          {/if}
          <ProcessSteps steps={forwardProcess} />
          <div class="keyboard-hints">{t('keyboard.hints')}</div>

        {:else if activeTab === 'reverse'}
          {#if reverseResult}
            <div class="card">
              <div class="result-meta">
                <span class="meta-label">{t('result.alcoholReading')}</span>
                <span class="meta-badge">✓ 计算完成</span>
              </div>
              <div class="result-hero">
                <span class="hero-number">{reverseResult}</span>
                <span class="hero-unit">%</span>
              </div>
              <div class="card-divider"></div>
              <div class="secondary-results">
                <div class="sec-row">
                  <span class="sec-label">目标质量分数</span>
                  <span class="sec-value">{targetVol}% m</span>
                </div>
                <div class="sec-row">
                  <span class="sec-label">参考温度</span>
                  <span class="sec-value">{reverseTemp}{tempUnit}</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="card">
              <div class="empty-state">
                <div class="empty-icon">🔄</div>
                <div class="empty-title">输入目标质量分数</div>
                <div class="empty-hint">输入需要的标准质量分数和当前温度，获取酒精计应有读数</div>
              </div>
            </div>
          {/if}
          <ProcessSteps steps={reverseProcess} />
          <div class="keyboard-hints">{t('keyboard.hints')}</div>

        {:else if activeTab === 'density'}
          {#if densityVol}
            <div class="card">
              <div class="result-meta">
                <span class="meta-label">{t('result.massPercent')}</span>
                <span class="meta-badge">✓ 查表完成</span>
              </div>
              <div class="result-hero">
                <span class="hero-number">{densityMass}</span>
                <span class="hero-unit">%</span>
              </div>
              <div class="card-divider"></div>
              <div class="secondary-results">
                <div class="sec-row">
                  <span class="sec-label">体积分数</span>
                  <span class="sec-value">{densityVol}% vol</span>
                </div>
                {#if densityDensity}
                  <div class="sec-row">
                    <span class="sec-label">精确密度值</span>
                    <span class="sec-value">{densityDensity} g/cm³</span>
                  </div>
                {/if}
                <div class="sec-row">
                  <span class="sec-label">参考温度</span>
                  <span class="sec-value">20℃</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="card">
              <div class="empty-state">
                <div class="empty-icon">📐</div>
                <div class="empty-title">密度查表</div>
                <div class="empty-hint">输入溶液密度或酒精度，查表获取对应数值</div>
              </div>
            </div>
          {/if}
          <div class="keyboard-hints">{t('keyboard.hints')}</div>

        {:else if activeTab === 'yield'}
          {#if yieldResult}
            <div class="card">
              <div class="result-meta">
                <span class="meta-label">{t('yield.resultLabel')}</span>
                <span class="meta-badge">✓ 计算完成</span>
              </div>
              <div class="result-hero">
                <span class="hero-number">{yieldResult}</span>
                <span class="hero-unit">%</span>
              </div>
              <div class="card-divider"></div>
              <div class="secondary-results">
                <div class="sec-row">
                  <span class="sec-label">{t('yield.rawActive')}</span>
                  <span class="sec-value">{(Number(yieldRawMass) * Number(yieldRawConc) / 100).toFixed(4)} kg</span>
                </div>
                <div class="sec-row">
                  <span class="sec-label">{t('yield.prodActive')}</span>
                  <span class="sec-value">{(Number(yieldProductMass) * Number(yieldProductConc) / 100).toFixed(4)} kg</span>
                </div>
                <div class="sec-row">
                  <span class="sec-label">{t('yield.rawInput')}</span>
                  <span class="sec-value">{yieldRawMass}kg × {yieldRawConc}%</span>
                </div>
                <div class="sec-row">
                  <span class="sec-label">{t('yield.prodInput')}</span>
                  <span class="sec-value">{yieldProductMass}kg × {yieldProductConc}%</span>
                </div>
              </div>
            </div>
          {:else}
            <div class="card">
              <div class="empty-state">
                <div class="empty-icon">⚖️</div>
                <div class="empty-title">{t('yield.emptyTitle')}</div>
                <div class="empty-hint">{t('yield.emptyHint')}</div>
              </div>
            </div>
          {/if}
          <ProcessSteps steps={yieldProcess} />
          <div class="keyboard-hints">{t('keyboard.hints')}</div>

        {:else if activeTab === 'chart'}
          <div class="card">
            {#if chartData}
              <div class="chart-container">
                <canvas bind:this={canvasEl}></canvas>
              </div>
            {:else}
              <div class="empty-state">
                <div class="empty-icon">📈</div>
                <div class="empty-title">浓度曲线图</div>
                <div class="empty-hint">输入酒精度后自动生成温度-浓度关系曲线</div>
              </div>
            {/if}
          </div>
          <div class="keyboard-hints">{t('keyboard.hints')}</div>

        {/if}
      </div>
    </div>
  </div>
  {/if}
</div>
