/**
 * User Avatar Menu Component
 * Circular avatar with user initial and dropdown menu for profile/settings/logout
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function UserAvatarMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const getInitial = () => {
    if (!user) return 'U';
    return (user.name || user.email || 'U')[0].toUpperCase();
  };

  const getUserDisplayName = () => {
    return user?.name || user?.email || 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-10 h-10 rounded-full p-0 border-2"
          title={getUserDisplayName()}
        >
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white font-semibold text-base">
            {getInitial()}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User Info */}
        <div className="px-3 py-2 border-b">
          <p className="font-medium truncate text-sm">{getUserDisplayName()}</p>
          <p className="text-xs text-muted-foreground truncate">
            {getUserEmail()}
          </p>
        </div>

        {/* Menu Items */}
        <DropdownMenuItem
          onClick={() => router.push('/profile')}
          className="cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
