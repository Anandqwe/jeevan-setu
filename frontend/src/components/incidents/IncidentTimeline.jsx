import { INCIDENT_STATUSES, STATUS_LABELS, STATUS_COLORS } from '../../utils/constants';
import styles from './IncidentTimeline.module.css';

const TIMELINE_ORDER = [
  INCIDENT_STATUSES.REQUESTED,
  INCIDENT_STATUSES.AMBULANCE_ASSIGNED,
  INCIDENT_STATUSES.EN_ROUTE_TO_PATIENT,
  INCIDENT_STATUSES.PATIENT_PICKED_UP,
  INCIDENT_STATUSES.EN_ROUTE_TO_HOSPITAL,
  INCIDENT_STATUSES.ARRIVED_AT_HOSPITAL,
  INCIDENT_STATUSES.TREATMENT_STARTED,
  INCIDENT_STATUSES.COMPLETED,
];

const IncidentTimeline = ({ currentStatus }) => {
  const currentIndex = TIMELINE_ORDER.indexOf(currentStatus);

  return (
    <div className={styles.timeline}>
      {TIMELINE_ORDER.map((status, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const color = isCompleted ? STATUS_COLORS[status] : '#d1d5db';

        return (
          <div key={status} className={styles.step}>
            <div className={styles.step_indicator}>
              <div
                className={`${styles.dot} ${isCurrent ? styles.current : ''}`}
                style={{ backgroundColor: color, borderColor: color }}
              >
                {isCompleted && !isCurrent && '✓'}
              </div>
              {index < TIMELINE_ORDER.length - 1 && (
                <div
                  className={styles.line}
                  style={{ backgroundColor: isCompleted ? color : '#e2e8f0' }}
                />
              )}
            </div>
            <span
              className={styles.label}
              style={{ color: isCompleted ? '#1e293b' : '#9ca3af', fontWeight: isCurrent ? 700 : 400 }}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default IncidentTimeline;
