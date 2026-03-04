import StatusBadge from '../common/StatusBadge';
import { SEVERITY_COLORS } from '../../utils/constants';
import styles from './IncidentCard.module.css';

const IncidentCard = ({ incident, onClick }) => {
  const severityColor = SEVERITY_COLORS[incident.severity] || '#6b7280';

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <span className={styles.id}>#{incident.id}</span>
        <StatusBadge status={incident.status} size="small" />
      </div>

      <div className={styles.body}>
        <div className={styles.severity}>
          <span
            className={styles.severity_dot}
            style={{ backgroundColor: severityColor }}
          ></span>
          <span style={{ color: severityColor, fontWeight: 600 }}>
            {incident.severity}
          </span>
        </div>

        {incident.description && (
          <p className={styles.description}>{incident.description}</p>
        )}

        <div className={styles.meta}>
          <span>📍 {incident.latitude?.toFixed(4)}, {incident.longitude?.toFixed(4)}</span>
          <span>
            {incident.created_at
              ? new Date(incident.created_at).toLocaleString()
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default IncidentCard;
