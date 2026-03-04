import { useState, useRef, useEffect, useCallback } from 'react';
import { SEVERITY_LEVELS, SEVERITY_COLORS } from '../../utils/constants';
import styles from './EmergencyForm.module.css';

const UNDO_SECONDS = 5;

const EmergencyForm = ({
  position,
  usingFallback,
  onSubmit,
  loading = false,
}) => {
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [undoCountdown, setUndoCountdown] = useState(0); // 0 = not pending
  const timerRef = useRef(null);
  const pendingDataRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      latitude: position.latitude,
      longitude: position.longitude,
      severity,
      description: description || undefined,
    };
    pendingDataRef.current = data;
    setUndoCountdown(UNDO_SECONDS);

    // Start countdown
    timerRef.current = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          // Timer expired — dispatch for real
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (pendingDataRef.current) {
            onSubmit(pendingDataRef.current);
            pendingDataRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndo = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    pendingDataRef.current = null;
    setUndoCountdown(0);
  }, []);

  const isPending = undoCountdown > 0;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.heading}>🆘 Request Emergency</h3>

      {usingFallback && (
        <div className={styles.fallback_banner}>
          📍 Using default seeded location
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Severity Level</label>
        <div className={styles.severity_grid}>
          {SEVERITY_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              disabled={isPending}
              className={`${styles.severity_btn} ${severity === level ? styles.active : ''}`}
              style={{
                borderColor: severity === level ? SEVERITY_COLORS[level] : '#e2e8f0',
                backgroundColor: severity === level ? `${SEVERITY_COLORS[level]}15` : 'white',
                color: severity === level ? SEVERITY_COLORS[level] : '#64748b',
              }}
              onClick={() => setSeverity(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Description (optional)</label>
        <textarea
          className={styles.textarea}
          placeholder="Describe the emergency situation..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isPending}
        />
      </div>

      <div className={styles.location_info}>
        <span>📍 Location: {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}</span>
      </div>

      {!isPending ? (
        <button
          type="submit"
          className={styles.submit_btn}
          disabled={loading}
        >
          {loading ? 'Dispatching...' : '🚑 Request Ambulance'}
        </button>
      ) : (
        <div className={styles.undo_container}>
          <div className={styles.undo_progress}>
            <div
              className={styles.undo_bar}
              style={{ width: `${(undoCountdown / UNDO_SECONDS) * 100}%` }}
            />
          </div>
          <div className={styles.undo_row}>
            <span className={styles.undo_text}>
              Dispatching in {undoCountdown}s...
            </span>
            <button
              type="button"
              className={styles.undo_btn}
              onClick={handleUndo}
            >
              ✕ Undo
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default EmergencyForm;
