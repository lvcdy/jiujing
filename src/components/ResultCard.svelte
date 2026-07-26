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
    padding: 20px 22px;
    border-radius: 14px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    gap: 12px;
  }

  .result-item:hover {
    transform: translateY(-1px);
  }

  .result-item.primary {
    background: linear-gradient(
      135deg,
      rgba(102, 126, 234, 0.25) 0%,
      rgba(118, 75, 162, 0.25) 100%
    );
    border: 1px solid rgba(102, 126, 234, 0.2);
    color: white;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.12);
  }

  .result-item.secondary {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .result-label {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.7;
    letter-spacing: 0.3px;
    min-width: 100px;
    line-height: 1.4;
  }

  .result-value {
    font-size: 26px;
    font-weight: 800;
    font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Inconsolata', monospace;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    letter-spacing: -0.5px;
    flex: 1;
    text-align: right;
  }

  @media (max-width: 520px) {
    .result-item {
      padding: 16px 18px;
    }

    .result-label {
      min-width: 80px;
      font-size: 11px;
    }

    .result-value {
      font-size: 22px;
    }
  }
</style>
