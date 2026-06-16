import { Badge } from '@/components/ui/badge.jsx';
import { ROLE_LABEL } from '@/lib/auth.jsx';

const VARIANT_BY_ROLE = {
  ngo_admin: 'default',
  site_owner: 'accent',
  donor: 'success',
  volunteer: 'secondary',
};

export default function RoleBadge({ role }) {
  return <Badge variant={VARIANT_BY_ROLE[role] ?? 'muted'}>{ROLE_LABEL[role] ?? role}</Badge>;
}
