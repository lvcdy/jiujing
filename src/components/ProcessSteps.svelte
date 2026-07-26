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
    margin-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 12px;
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
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s ease;
    letter-spacing: 0.3px;
  }

  .process-toggle:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.7);
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
    padding: 12px 0 4px;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .process-step {
    display: flex;
    gap: 12px;
    padding: 8px 12px;
    position: relative;
  }

  .process-step:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 23px;
    top: 32px;
    bottom: -8px;
    width: 1px;
    background: rgba(102, 126, 234, 0.2);
  }

  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
    border: 1px solid rgba(102, 126, 234, 0.3);
    color: rgba(255, 255, 255, 0.8);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: 'SF Mono', 'Monaco', monospace;
  }

  .step-body {
    flex: 1;
    min-width: 0;
  }

  .step-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 4px;
  }

  .step-detail {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.5;
    word-wrap: break-word;
  }

  .step-formula {
    margin-top: 4px;
    padding: 4px 8px;
    background: rgba(102, 126, 234, 0.08);
    border: 1px solid rgba(102, 126, 234, 0.12);
    border-radius: 6px;
    font-size: 11px;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Inconsolata', monospace;
    color: rgba(102, 126, 234, 0.8);
    overflow-x: auto;
  }

  @media (max-width: 520px) {
    .process-toggle {
      padding: 10px 12px;
      font-size: 11px;
    }
  }
</style>
