import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Big from 'big.js'
import { loadExcelData, bilinearInterpolate, getMassFromVolume } from '../utils/excel'
import jiujingExcel from '../assets/jiujing.xlsx?url'
import wenduExcel from '../assets/wendu.xlsx?url'
import './Calculator.css'

export default function Calculator() {
  const { t, i18n } = useTranslation()
  const [alcohol, setAlcohol] = useState('')
  const [temperature, setTemperature] = useState('')
  const [result, setResult] = useState<{ vol: string; mass: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const alcoholInputRef = useRef<HTMLInputElement>(null)
  const temperatureInputRef = useRef<HTMLInputElement>(null)
  const calculateBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    Promise.all([loadExcelData(jiujingExcel, 'jiujing'), loadExcelData(wenduExcel, 'wendu')])
      .then(() => {
        setLoading(false)
        // 自动聚焦第一个输入框
        setTimeout(() => alcoholInputRef.current?.focus(), 100)
      })
      .catch(() => {
        setError(t('error.loadFailed'))
        setLoading(false)
      })
  }, [t])

  const calculate = useCallback(() => {
    if (!alcohol || !temperature) {
      setError(t('error.required'))
      return
    }

    setError('')
    const volRaw = bilinearInterpolate(Number(temperature), Number(alcohol))

    if (!volRaw) {
      setError(t('error.failed'))
      return
    }

    const volFixed = new Big(volRaw).toFixed(2)
    const mass = getMassFromVolume(volRaw)
    setResult({ vol: volFixed, mass })
  }, [alcohol, temperature, t])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent, field: 'alcohol' | 'temperature') => {
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
        setError(t('error.required'))
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
  }, [alcohol, temperature, calculate, t])

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
          <div className="header-content">
            <div className="logo">
              <span className="icon">🧪</span>
              <h1>{t('app.title')}</h1>
            </div>
            <div className="language-dropdown">
              <button className="language-btn">
                {i18n.language === 'zh-CN' ? '中文' : 'English'}
                <span className="dropdown-arrow">▼</span>
              </button>
              <div className="dropdown-menu">
                <button
                  className={`dropdown-item ${i18n.language === 'zh-CN' ? 'active' : ''}`}
                  onClick={() => {
                    i18n.changeLanguage('zh-CN');
                    localStorage.setItem('language', 'zh-CN');
                  }}
                >
                  中文
                </button>
                <button
                  className={`dropdown-item ${i18n.language === 'en-US' ? 'active' : ''}`}
                  onClick={() => {
                    i18n.changeLanguage('en-US');
                    localStorage.setItem('language', 'en-US');
                  }}
                >
                  English
                </button>
              </div>
            </div>
          </div>
          <p className="subtitle">{t('app.subtitle')}</p>
        </header>

        <div className="card-body">
          <div className="input-grid">
            <div className="input-field">
              <label>{t('input.alcohol')}</label>
              <div className="input-wrapper">
                <input
                  ref={alcoholInputRef}
                  type="text"
                  inputMode="decimal"
                  value={alcohol}
                  onChange={(e) => handleInputChange(e.target.value, setAlcohol)}
                  onKeyDown={(e) => handleKeyDown(e, 'alcohol')}
                  placeholder={t('input.placeholder.alcohol')}
                  disabled={loading}
                />
                <span className="unit">%</span>
              </div>
            </div>

            <div className="input-field">
              <label>{t('input.temperature')}</label>
              <div className="input-wrapper">
                <input
                  ref={temperatureInputRef}
                  type="text"
                  inputMode="decimal"
                  value={temperature}
                  onChange={(e) => handleInputChange(e.target.value, setTemperature)}
                  onKeyDown={(e) => handleKeyDown(e, 'temperature')}
                  placeholder={t('input.placeholder.temperature')}
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
              {loading ? t('button.loading') : t('button.calculate')}
            </button>

            <button
              className="clear-btn"
              onClick={clearAll}
              disabled={loading}
              title={t('button.clear')}
            >
              {t('button.clear')}
            </button>
          </div>

          {error && <div className="error-toast">{error}</div>}

          {result && (
            <div className="results">
              <div className="result-item primary">
                <span className="result-label">{t('result.standard')}</span>
                <span className="result-value">{result.vol}{t('result.unit.vol')}</span>
              </div>
              {result.mass !== null && (
                <div className="result-item secondary">
                  <span className="result-label">{t('result.mass')}</span>
                  <span className="result-value">{result.mass}{t('result.unit.mass')}</span>
                </div>
              )}
            </div>
          )}

          <div className="keyboard-hints">
            <span>{t('keyboard.hints')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
