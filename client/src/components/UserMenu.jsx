import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import { ROLE_LABEL, useAuth } from '@/lib/auth.jsx';

function initials(name) {
  return (name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-[#E2E8F0] py-1.5 pl-1.5 pr-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#d4dce6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0B5000] text-sm font-semibold text-white">
            {initials(user?.name ?? user?.email)}
          </span>
        )}
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium leading-tight text-[#001F00]">
            {user?.name ?? user?.email}
          </div>
          <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[user?.role] ?? ''}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/change-password')}>
          <KeyRound className="mr-2 h-4 w-4" aria-hidden /> Change password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
