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
import { Avatar } from '@/components/ui/avatar.jsx';
import { ROLE_LABEL, useAuth } from '@/lib/auth.jsx';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2.5 rounded-2xl pl-1 pr-3 py-1 hover:bg-secondary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar name={user?.name ?? user?.email ?? '?'} className="h-8 w-8" />
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-foreground leading-tight">
            {user?.name ?? user?.email}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {ROLE_LABEL[user?.role] ?? ''}
          </div>
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
