import { STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import styles from './StatusBadge.module.css';

const StatusBadge = ({ status, size = 'medium' }) => {
  const color = STATUS_COLORS[status] || '#6b7280';
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      style={{ backgroundColor: `${color}22`, color, borderColor: color }}
    >
      <span className={styles.dot} style={{ backgroundColor: color }}></span>
      {label}
    </span>
  );
};

export default StatusBadge;
