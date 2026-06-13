import { Percent, Sparkles } from 'lucide-react';
import styles from './TipSelector.module.css';

interface TipSelectorProps {
  selectedPercentage: number;
  onSelect: (percentage: number) => void;
}

const PRESETS = [0, 5, 10, 15, 20];

export function TipSelector({ selectedPercentage, onSelect }: TipSelectorProps) {
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      onSelect(value);
    }
  };

  return (
    <div className={styles.selector}>
      <div className={styles.selector__header}>
        <Percent size={20} />
        <h3 className={styles.selector__title}>Чаевые</h3>
        <span className={styles.selector__hint}>
          <Sparkles size={16} />
          Спасибо!
        </span>
      </div>

      <div className={styles.selector__presets}>
        {PRESETS.map(preset => (
          <button
            key={preset}
            className={`${styles.selector__preset} ${selectedPercentage === preset ? styles['selector__preset--active'] : ''}`}
            onClick={() => onSelect(preset)}
          >
            {preset}%
          </button>
        ))}
      </div>

      <div className={styles.selector__custom}>
        <label htmlFor="custom-tip" className={styles.selector__customLabel}>
          Свой процент:
        </label>
        <div className={styles.selector__customInputWrapper}>
          <input
            id="custom-tip"
            type="number"
            min="0"
            max="100"
            step="1"
            value={selectedPercentage}
            onChange={handleCustomChange}
            className={styles.selector__customInput}
          />
          <span className={styles.selector__customSuffix}>%</span>
        </div>
      </div>

      <div className={styles.selector__info}>
        <p className={styles.selector__infoText}>
          Чаевые идут персоналу заведения
        </p>
      </div>
    </div>
  );
}
