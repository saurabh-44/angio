import { Badge } from '@/components/ui/badge.jsx';

const LABEL = { alive: 'Alive', dead: 'Dead', removed: 'Removed' };
const VARIANT = { alive: 'success', dead: 'destructive', removed: 'muted' };

export default function PlantStatusBadge({ status }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{LABEL[status] ?? status}</Badge>;
}
