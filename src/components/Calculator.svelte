<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
  import {
    loadExcelData, bilinearInterpolate, getMassFromVolume,
    getDensityFromVolume, getVolumeFromDensity,
    reverseInterpolate, estimateUncertainty,
  } from '../utils/excel'
  import jiujingExcel from '../assets/jiujing.xlsx?url'
  import wenduExcel from '../assets/wendu.xlsx?url'
  import i18n from '../i18n'
  import './Calculator.css'

  Chart.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

  type Tab = 'forward' | 'reverse' | 'density' | 'chart'

  // i18n
  let lang = $state(i18n.language || 'zh-CN')
  i18n.on('languageChanged', (lng: string) => { lang = lng })
  const t = $derived.by(() => (key: string) => i18n.t(key))

  // 全局状态
  let activeTab = $state<Tab>('forward')
  let loading = $state(true)
  let error = $state('')
  let tempUnit = $state<'℃' | '°F'>(
    (localStorage.getItem('tempUnit') as '℃' | '°F') || '℃'
  )

  // 正向计算
  let alcohol = $state('')
  let temperature = $state('')
  let forwardVol = $state('')
  let forwardMass = $state('')
  let forwardDensity = $state('')
  let forwardUncVol = $state('')
  let forwardUncMass = $state('')

  // 反向计算
  let targetVol = $state('')
  let reverseTemp = $state('')
  let reverseResult = $state('')

  // 密度互查
  let densityInput = $state('')
  let volInput = $state('')
  let densityVol = $state('')
  let densityMass = $state('')
  let densityDensity = $state('')

  // 图表
  let chartAlcohol = $state('')

  // Refs
  let alcoholInputEl: HTMLInputElement | undefined = $state()
  let temperatureInputEl: HTMLInputElement | undefined = $state()
  let targetVolEl: HTMLInputElement | undefined = $state()
  let reverseTempEl: HTMLInputElement | undefined = $state()
  let densityInputEl: HTMLInputElement | undefined = $state()
  let volInputEl: HTMLInputElement | undefined = $state()
  let chartAlcoholEl: HTMLInputElement | undefined = $state()
  let canvasEl: HTMLCanvasElement | undefined = $state()

  // Chart.js 实例
  let chartInstance: any = null

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

  // 加载数据
  onMount(() => {
    Promise.all([loadExcelData(jiujingExcel, 'jiujing'), loadExcelData(wenduExcel, 'wendu')])
      .then(() => {
        loading = false
        setTimeout(() => alcoholInputEl?.focus(), 100)
      })
      .catch(() => {
        error = t('error.loadFailed')
        loading = false
      })

  })

  // 图表效果
  $effect(() => {
    // 当画布元素或图表数据变化时触发
    void canvasEl
    void chartData
    void tempUnit

    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    if (!canvasEl || !chartData) return

    chartInstance = new Chart(canvasEl, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: `${chartAlcohol}%`,
          data: chartData.values,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
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
            backgroundColor: 'rgba(20, 20, 40, 0.9)',
            titleColor: '#fff', bodyColor: '#fff',
            borderColor: 'rgba(102, 126, 234, 0.3)', borderWidth: 1,
            cornerRadius: 8, padding: 10,
          }
        },
        scales: {
          x: {
            title: { display: true, text: t('chart.xAxis'), color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 }, maxTicksLimit: 12 },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            title: { display: true, text: t('chart.yAxis'), color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
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
    const tempC = toCelsius(temperature)
    const volRaw = bilinearInterpolate(tempC, Number(alcohol))
    if (!volRaw) { error = t('error.failed'); return }
    forwardVol = Number(volRaw).toFixed(2)
    forwardMass = getMassFromVolume(volRaw) ?? ''
    forwardDensity = getDensityFromVolume(forwardVol) ?? ''
    const unc = estimateUncertainty(Number(alcohol), tempC)
    forwardUncVol = unc?.vol ?? ''
    forwardUncMass = unc?.mass ?? ''
  }

  function doReverse() {
    if (!targetVol || !reverseTemp) { error = t('error.required'); return }
    error = ''
    const r = reverseInterpolate(Number(targetVol), toCelsius(reverseTemp))
    if (r === null) { error = t('error.failed'); return }
    reverseResult = r
  }

  function doDensityLookup() {
    error = ''
    if (densityInput) {
      const vol = getVolumeFromDensity(Number(densityInput))
      if (!vol) { error = t('error.failed'); return }
      densityVol = vol
      densityMass = getMassFromVolume(vol) ?? ''
      densityDensity = densityInput
    } else if (volInput) {
      const density = getDensityFromVolume(volInput)
      if (!density) { error = t('error.failed'); return }
      densityVol = volInput
      densityMass = getMassFromVolume(volInput) ?? ''
      densityDensity = density
    } else {
      error = t('error.required')
    }
  }

  function clearAll() {
    alcohol = ''; temperature = ''; forwardVol = ''; forwardMass = ''; forwardDensity = ''
    forwardUncVol = ''; forwardUncMass = ''
    targetVol = ''; reverseTemp = ''; reverseResult = ''
    densityInput = ''; volInput = ''; densityVol = ''; densityMass = ''; densityDensity = ''
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
      }
    }
    if (e.key === 'Escape') {
      const setters: Record<string, (v: string) => void> = {
        alcohol: v => alcohol = v, temperature: v => temperature = v,
        targetVol: v => targetVol = v, reverseTemp: v => reverseTemp = v,
        densityInput: v => densityInput = v, volInput: v => volInput = v,
        chartAlcohol: v => chartAlcohol = v,
      }
      setters[field]?.('')
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      const refs: Record<string, HTMLInputElement | undefined> = {
        alcohol: alcoholInputEl, temperature: temperatureInputEl,
        targetVol: targetVolEl, reverseTemp: reverseTempEl,
        densityInput: densityInputEl, volInput: volInputEl, chartAlcohol: chartAlcoholEl,
      }
      refs[field]?.select()
    }
  }

  const tempLabel = $derived(tempUnit === '℃' ? t('unit.celsius') : t('unit.fahrenheit'))
</script>

<div class="calculator">
  <div class="glass-card">
    {#if loading}
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <span class="loading-text">{t('button.loading')}</span>
      </div>
    {/if}

    <header class="card-header">
      <div class="header-content">
        <div class="logo">
          <span class="icon">🧪</span>
          <h1>{t('app.title')}</h1>
        </div>
        <div class="header-controls">
          <button class="temp-unit-btn" onclick={toggleTempUnit} title="切换单位">{tempUnit}</button>
          <div class="language-dropdown">
            <button class="language-btn">
              {lang === 'zh-CN' ? '中文' : 'English'}
              <span class="dropdown-arrow">▼</span>
            </button>
            <div class="dropdown-menu">
              <button class="dropdown-item" class:active={lang === 'zh-CN'}
                onclick={() => { i18n.changeLanguage('zh-CN'); localStorage.setItem('language', 'zh-CN') }}>中文</button>
              <button class="dropdown-item" class:active={lang === 'en-US'}
                onclick={() => { i18n.changeLanguage('en-US'); localStorage.setItem('language', 'en-US') }}>English</button>
            </div>
          </div>
        </div>
      </div>
      <p class="subtitle">{t('app.subtitle')}</p>
    </header>

    <nav class="tab-nav">
      {#each ['forward', 'reverse', 'density', 'chart'] as tab}
        <button class="tab-btn" class:active={activeTab === tab}
          onclick={() => { activeTab = tab as Tab; error = '' }}>{t(`tab.${tab}`)}</button>
      {/each}
    </nav>

    <div class="card-body">
      <!-- 正向计算 -->
      {#if activeTab === 'forward'}
        <div class="input-grid">
          <div class="input-field">
            <label for="alcohol-input">{t('input.alcohol')}</label>
            <div class="input-wrapper">
              <input id="alcohol-input" bind:this={alcoholInputEl} type="text" inputmode="decimal" value={alcohol}
                oninput={(e) => handleInput(e.currentTarget.value, v => alcohol = v)}
                onkeydown={(e) => handleKeyDown(e, 'alcohol')}
                placeholder={t('input.placeholder.alcohol')} disabled={loading} />
              <span class="unit">%</span>
            </div>
          </div>
          <div class="input-field">
            <label for="temperature-input">{t('input.temperature')}</label>
            <div class="input-wrapper">
              <input id="temperature-input" bind:this={temperatureInputEl} type="text" inputmode="decimal" value={temperature}
                oninput={(e) => handleInput(e.currentTarget.value, v => temperature = v)}
                onkeydown={(e) => handleKeyDown(e, 'temperature')}
                placeholder={t('input.placeholder.temperature')} disabled={loading} />
              <span class="unit">{tempLabel}</span>
            </div>
          </div>
        </div>
        <div class="button-group">
          <button class="calculate-btn" onclick={calculate} disabled={loading || !alcohol || !temperature}>{t('button.calculate')}</button>
          <button class="clear-btn" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
        </div>
        {#if error}
          <div class="error-toast"><span>⚠️</span>{error}</div>
        {/if}
        {#if forwardVol}
          <div class="results">
            <div class="result-item primary">
              <span class="result-label">{t('result.standard')}</span>
              <span class="result-value">{forwardVol}{t('result.unit.vol')}</span>
            </div>
            {#if forwardMass}
              <div class="result-item secondary">
                <span class="result-label">{t('result.mass')}</span>
                <span class="result-value">{forwardMass}{t('result.unit.mass')}</span>
              </div>
            {/if}
            {#if forwardDensity}
              <div class="result-item secondary">
                <span class="result-label">{t('result.density')}</span>
                <span class="result-value">{forwardDensity}{t('result.unit.density')}</span>
              </div>
            {/if}
            {#if forwardUncVol}
              <div class="uncertainty-section">
                <div class="uncertainty-title">{t('uncertainty.title')}</div>
                <div class="result-item secondary">
                  <span class="result-label">{t('uncertainty.volResult')}</span>
                  <span class="result-value">±{forwardUncVol}{t('result.unit.vol')}</span>
                </div>
                {#if forwardUncMass}
                  <div class="result-item secondary">
                    <span class="result-label">{t('uncertainty.massResult')}</span>
                    <span class="result-value">±{forwardUncMass}{t('result.unit.mass')}</span>
                  </div>
                {/if}
                <div class="uncertainty-hint">{t('uncertainty.hint')}</div>
              </div>
            {/if}
          </div>
        {/if}
        <div class="keyboard-hints">{t('keyboard.hints')}</div>
      {/if}

      <!-- 反向计算 -->
      {#if activeTab === 'reverse'}
        <div class="input-grid">
          <div class="input-field">
            <label for="target-vol-input">{t('input.targetVol')}</label>
            <div class="input-wrapper">
              <input id="target-vol-input" bind:this={targetVolEl} type="text" inputmode="decimal" value={targetVol}
                oninput={(e) => handleInput(e.currentTarget.value, v => targetVol = v)}
                onkeydown={(e) => handleKeyDown(e, 'targetVol')}
                placeholder={t('input.placeholder.targetVol')} disabled={loading} />
              <span class="unit">% vol</span>
            </div>
          </div>
          <div class="input-field">
            <label for="reverse-temp-input">{t('input.temperature')}</label>
            <div class="input-wrapper">
              <input id="reverse-temp-input" bind:this={reverseTempEl} type="text" inputmode="decimal" value={reverseTemp}
                oninput={(e) => handleInput(e.currentTarget.value, v => reverseTemp = v)}
                onkeydown={(e) => handleKeyDown(e, 'reverseTemp')}
                placeholder={t('input.placeholder.temperature')} disabled={loading} />
              <span class="unit">{tempLabel}</span>
            </div>
          </div>
        </div>
        <div class="button-group">
          <button class="calculate-btn" onclick={doReverse} disabled={loading || !targetVol || !reverseTemp}>{t('button.calculate')}</button>
          <button class="clear-btn" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
        </div>
        {#if error}
          <div class="error-toast"><span>⚠️</span>{error}</div>
        {/if}
        {#if reverseResult}
          <div class="results">
            <div class="result-item primary">
              <span class="result-label">{t('result.alcoholReading')}</span>
              <span class="result-value">{reverseResult}%</span>
            </div>
          </div>
        {/if}
      {/if}

      <!-- 密度互查 -->
      {#if activeTab === 'density'}
        <div class="input-grid single">
          <div class="input-field">
            <label for="density-input">{t('input.density')}</label>
            <div class="input-wrapper">
              <input id="density-input" bind:this={densityInputEl} type="text" inputmode="decimal" value={densityInput}
                oninput={(e) => handleInput(e.currentTarget.value, v => densityInput = v)}
                onkeydown={(e) => handleKeyDown(e, 'densityInput')}
                placeholder={t('input.placeholder.density')} disabled={loading} />
              <span class="unit">g/cm³</span>
            </div>
          </div>
        </div>
        <div class="divider-text">—</div>
        <div class="input-grid single">
          <div class="input-field">
            <label for="vol-input">{t('input.volPercent')}</label>
            <div class="input-wrapper">
              <input id="vol-input" bind:this={volInputEl} type="text" inputmode="decimal" value={volInput}
                oninput={(e) => handleInput(e.currentTarget.value, v => volInput = v)}
                onkeydown={(e) => handleKeyDown(e, 'volInput')}
                placeholder={t('input.placeholder.alcohol')} disabled={loading} />
              <span class="unit">% vol</span>
            </div>
          </div>
        </div>
        <div class="button-group">
          <button class="calculate-btn" onclick={doDensityLookup} disabled={loading || (!densityInput && !volInput)}>{t('button.lookup')}</button>
          <button class="clear-btn" onclick={clearAll} disabled={loading}>{t('button.clear')}</button>
        </div>
        {#if error}
          <div class="error-toast"><span>⚠️</span>{error}</div>
        {/if}
        {#if densityVol}
          <div class="results">
            <div class="result-item secondary">
              <span class="result-label">{t('result.volPercent')}</span>
              <span class="result-value">{densityVol}% vol</span>
            </div>
            {#if densityMass}
              <div class="result-item secondary">
                <span class="result-label">{t('result.massPercent')}</span>
                <span class="result-value">{densityMass}% m</span>
              </div>
            {/if}
            {#if densityDensity}
              <div class="result-item secondary">
                <span class="result-label">{t('result.density')}</span>
                <span class="result-value">{densityDensity}{t('result.unit.density')}</span>
              </div>
            {/if}
          </div>
        {/if}
      {/if}

      <!-- 图表 -->
      {#if activeTab === 'chart'}
        <div class="input-grid single">
          <div class="input-field">
            <label for="chart-alcohol-input">{t('chart.alcoholFixed')}</label>
            <div class="input-wrapper">
              <input id="chart-alcohol-input" bind:this={chartAlcoholEl} type="text" inputmode="decimal" value={chartAlcohol}
                oninput={(e) => handleInput(e.currentTarget.value, v => chartAlcohol = v)}
                onkeydown={(e) => handleKeyDown(e, 'chartAlcohol')}
                placeholder={t('input.placeholder.alcohol')} disabled={loading} />
              <span class="unit">%</span>
            </div>
          </div>
        </div>
        {#if chartData}
          <div class="chart-container">
            <canvas bind:this={canvasEl}></canvas>
          </div>
        {:else}
          <div class="chart-placeholder">📊 {t('chart.alcoholFixed')}</div>
        {/if}
      {/if}
    </div>
  </div>
</div>
