import { useState, useEffect, useCallback, useRef } from 'react'
import { readExcelFile, bilinearInterpolate, getMassFromVolume, parseExcelCache } from '../utils/excel'
import jiujingExcel from '../assets/jiujing.xlsx?url'
import wenduExcel from '../assets/wendu.xlsx?url'
import './Calculator.css'

export default function Calculator() {
  const [alcohol, setAlcohol] = useState('')
  const [temperature, setTemperature] = useState('')
  const [result, setResult] = useState<{ vol: string; mass: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const alcoholInputRef = useRef<HTMLInputElement>(null)
  const temperatureInputRef = useRef<HTMLInputElement>(null)
  const calculateBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    Promise.all([readExcelFile(jiujingExcel), readExcelFile(wenduExcel)])
      .then(([j, w]) => {
        if (j) parseExcelCache(j, 'jiujing')
        if (w) parseExcelCache(w, 'wendu')
        setLoading(false)
        // 自动聚焦第一个输入框
        setTimeout(() => alcoholInputRef.current?.focus(), 100)
      })
      .catch(() => {
        setError('数据加载失败')
        setLoading(false)
      })
  }, [])

  const calculate = useCallback(() => {
    if (!alcohol || !temperature) {
      setError('请输入完整数据')
      return
    }

    setError('')
    const vol = bilinearInterpolate(Number(temperature), Number(alcohol))

    if (!vol) {
      setError('计算失败')
      return
    }

    const mass = getMassFromVolume(Number(vol))
    setResult({ vol, mass })
  }, [alcohol, temperature])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent, field: 'alcohol' | 'temperature') => {
    // Enter 键：如果两个输入框都有值，直接计算；否则在酒精输入框时跳转到温度输入框
    if (e.key === 'Enter') {
      e.preventDefault()
      if (alcohol && temperature) {
        // 两个输入框都有值，直接计算
        calculate()
      } else if (field === 'alcohol') {
        // 只有酒精输入框有值，跳转到温度输入框
        temperatureInputRef.current?.focus()
      } else {
        // 在温度输入框但缺少数据，显示错误
        setError('请输入完整数据')
      }
    }

    // Escape 键：清空当前输入框
    if (e.key === 'Escape') {
      if (field === 'alcohol') {
        setAlcohol('')
      } else {
        setTemperature('')
      }
    }

    // Ctrl/Cmd + A: 全选
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      if (field === 'alcohol') {
        alcoholInputRef.current?.select()
      } else {
        temperatureInputRef.current?.select()
      }
    }
  }

  // 处理输入，支持中文输入法下的小数点
  const handleInputChange = (value: string, setter: (val: string) => void) => {
    const sanitized = value
      .replace(/。/g, '.')
      .replace(/[^0-9.-]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^(-?\d+\.\d+).*$/, '$1')

    setter(sanitized)
  }

  // 清空所有数据
  const clearAll = () => {
    setAlcohol('')
    setTemperature('')
    setResult(null)
    setError('')
    alcoholInputRef.current?.focus()
  }

  return (
    <div className="calculator">
      <div className="glass-card">
        <header className="card-header">
          <div className="logo">
            <span className="icon">🧪</span>
            <h1>酒精浓度计算器</h1>
          </div>
          <p className="subtitle">基于温度校正的标准浓度计算</p>
        </header>

        <div className="card-body">
          <div className="input-grid">
            <div className="input-field">
              <label>酒精计读数</label>
              <div className="input-wrapper">
                <input
                  ref={alcoholInputRef}
                  type="text"
                  inputMode="decimal"
                  value={alcohol}
                  onChange={(e) => handleInputChange(e.target.value, setAlcohol)}
                  onKeyDown={(e) => handleKeyDown(e, 'alcohol')}
                  placeholder="0.0"
                  disabled={loading}
                />
                <span className="unit">%</span>
              </div>
            </div>

            <div className="input-field">
              <label>当前温度</label>
              <div className="input-wrapper">
                <input
                  ref={temperatureInputRef}
                  type="text"
                  inputMode="decimal"
                  value={temperature}
                  onChange={(e) => handleInputChange(e.target.value, setTemperature)}
                  onKeyDown={(e) => handleKeyDown(e, 'temperature')}
                  placeholder="20"
                  disabled={loading}
                />
                <span className="unit">℃</span>
              </div>
            </div>
          </div>

          <div className="button-group">
            <button
              ref={calculateBtnRef}
              className="calculate-btn"
              onClick={calculate}
              disabled={loading || !alcohol || !temperature}
            >
              {loading ? '加载中...' : '开始计算 (Enter)'}
            </button>

            <button
              className="clear-btn"
              onClick={clearAll}
              disabled={loading}
              title="清空所有数据 (Ctrl+L)"
            >
              清空
            </button>
          </div>

          {error && <div className="error-toast">{error}</div>}

          {result && (
            <div className="results">
              <div className="result-item primary">
                <span className="result-label">标准浓度 (20℃)</span>
                <span className="result-value">{result.vol}% vol</span>
              </div>
              {result.mass !== null && (
                <div className="result-item secondary">
                  <span className="result-label">质量分数</span>
                  <span className="result-value">{result.mass}% m</span>
                </div>
              )}
            </div>
          )}

          <div className="keyboard-hints">
            <span>快捷键: Enter-计算/跳转 | Tab-切换 | Esc-清空 | Ctrl+A-全选</span>
          </div>
        </div>
      </div>
    </div>
  )
}
