import styles from './MapLegend.module.css';

const defaultItems = [
  { icon: '🚑', label: 'Ambulance' },
  { icon: '🏥', label: 'Hospital' },
  { icon: '🆘', label: 'Patient Emergency' },
  { icon: '📍', label: 'Selected Location' },
];

const MapLegend = ({ items = defaultItems, showEmergency = false }) => {
  const allItems = showEmergency
    ? [{ icon: '🔴', label: 'Active Emergency', className: 'emergency' }, ...items]
    : items;

  return (
    <div className={styles.legend}>
      {allItems.map((item, i) => (
        <div key={i} className={styles.legend_item}>
          <span className={`${styles.icon} ${item.className ? styles[item.className] : ''}`}>
            {item.icon}
          </span>
          <span className={styles.label}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default MapLegend;
