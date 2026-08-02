<script lang="ts">
  import i18n from '../i18n'

  export interface ProcessStep {
    step: number
    label: string
    detail: string
    formula?: string
  }

  let { steps = [], title = '' }: { steps?: ProcessStep[]; title?: string } = $props()

  let open = $state(false)

  // i18n 响应式
  let lang = $state(i18n.language || 'zh-CN')
  i18n.on('languageChanged', (lng: string) => { lang = lng })
  const t = $derived.by(() => { void lang; return (key: string) => i18n.t(key) })
</script>

{#if steps.length > 0}
  <div class="process-section">
    <button class="process-toggle" onclick={() => open = !open}>
      <span class="process-toggle-icon" class:open>▶</span>
      <span>{title || t('process.title')}</span>
    </button>
    {#if open}
      <div class="process-content">
        {#each steps as item}
          <div class="process-step">
            <div class="step-number">{item.step}</div>
            <div class="step-body">
              <div class="step-label">{item.label}</div>
              <div class="step-detail">{item.detail}</div>
              {#if item.formula}
                <div class="step-formula">{item.formula}</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .process-section {
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 12px;
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .process-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px;
    background: var(--surface, #141419);
    border: none;
    color: var(--text-secondary, #8b8b97);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.3px;
    font-family: inherit;
  }

  .process-toggle:hover {
    background: var(--surface-hover, #25252d);
    color: var(--text, #f0f0f5);
  }

  .process-toggle-icon {
    font-size: 9px;
    transition: transform 0.25s ease;
    display: inline-block;
  }

  .process-toggle-icon.open {
    transform: rotate(90deg);
  }

  .process-content {
    padding: 4px 14px 14px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .process-step {
    display: flex;
    gap: 12px;
    padding: 10px 4px;
    position: relative;
  }

  .process-step:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 34px;
    bottom: -6px;
    width: 1px;
    background: var(--accent, #3b82f6);
    opacity: 0.2;
  }

  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent, #3b82f6);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
  }

  .step-body {
    flex: 1;
    min-width: 0;
  }

  .step-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #8b8b97);
    margin-bottom: 4px;
  }

  .step-detail {
    font-size: 11px;
    color: var(--text-tertiary, #52525e);
    line-height: 1.5;
    word-wrap: break-word;
  }

  .step-formula {
    margin-top: 6px;
    padding: 4px 8px;
    background: var(--accent-muted, rgba(59, 130, 246, 0.1));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 6px;
    font-size: 11px;
    font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', monospace;
    color: var(--accent, #3b82f6);
    overflow-x: auto;
  }

  @media (max-width: 640px) {
    .process-toggle {
      padding: 12px 14px;
      font-size: 11px;
    }
  }
</style>
