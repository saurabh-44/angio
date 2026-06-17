import { Badge } from '@/components/ui/badge.jsx';

const LABEL = {
  healthy: 'Healthy',
  stressed: 'Stressed',
  diseased: 'Diseased',
  dying: 'Dying',
};

const VARIANT = {
  healthy: 'success',
  stressed: 'accent',
  diseased: 'destructive',
  dying: 'destructive',
};

// Compact pill that surfaces the volunteer's assessment of the tree on
// the day of the maintenance check. Hidden when not set (no assumption
// of "healthy by default" — a missing value just means it wasn't
// recorded).
export default function HealthBadge({ status, className }) {
  if (!status || !LABEL[status]) return null;
  return (
    <Badge variant={VARIANT[status] ?? 'muted'} className={className}>
      {LABEL[status]}
    </Badge>
  );
}

export const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy — growing well' },
  { value: 'stressed', label: 'Stressed — water or sunlight issue' },
  { value: 'diseased', label: 'Diseased — visible signs' },
  { value: 'dying', label: 'Dying — needs urgent attention' },
];
