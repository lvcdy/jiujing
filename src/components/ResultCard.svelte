<script lang="ts">
  let {
    label,
    value,
    variant = 'secondary',
  }: {
    label: string
    value: string
    variant?: 'primary' | 'secondary'
  } = $props()
</script>

<div class="result-item" class:primary={variant === 'primary'} class:secondary={variant === 'secondary'}>
  <span class="result-label">{label}</span>
  <span class="result-value">{value}</span>
</div>

<style>
  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 18px;
    border-radius: 12px;
    transition: background 0.2s ease;
    gap: 12px;
  }

  .result-item.primary {
    background: var(--accent-muted, rgba(59, 130, 246, 0.12));
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    color: var(--text, #f0f0f5);
  }

  .result-item.secondary {
    background: transparent;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    color: var(--text, #f0f0f5);
  }

  .result-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary, #8b8b97);
    letter-spacing: 0.3px;
    min-width: 100px;
    line-height: 1.4;
  }

  .result-value {
    font-size: 20px;
    font-weight: 700;
    font-family: 'JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    letter-spacing: -0.5px;
    flex: 1;
    text-align: right;
    color: var(--text, #f0f0f5);
  }

  .result-item.primary .result-value {
    color: var(--accent, #3b82f6);
  }

  @media (max-width: 640px) {
    .result-item {
      padding: 14px 16px;
    }

    .result-label {
      min-width: 80px;
      font-size: 11px;
    }

    .result-value {
      font-size: 18px;
    }
  }
</style>
