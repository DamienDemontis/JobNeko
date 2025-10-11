'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { JobNekoLogo } from '@/components/ui/jobneko-logo';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AIActivityButton } from '@/components/ui/ai-activity-button';
import { AIActivityDropdown } from '@/components/ui/ai-activity-dropdown';
import { UserAvatarMenu } from '@/components/ui/user-avatar-menu';
import { useAuth } from '@/contexts/AuthContext';

export function SiteHeader() {
  const { user } = useAuth();
  const [showAIDropdown, setShowAIDropdown] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-4 hover:opacity-80 transition-opacity"
          >
            <JobNekoLogo size={60} textClassName="text-3xl" />
            <div>
              <p className="text-gray-600 text-sm">
                Welcome back, {user?.name || user?.email}
              </p>
            </div>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* AI Activity Monitor */}
            <DropdownMenu open={showAIDropdown} onOpenChange={setShowAIDropdown}>
              <DropdownMenuTrigger asChild>
                <div>
                  <AIActivityButton
                    onOpenDropdown={() => setShowAIDropdown(true)}
                  />
                </div>
              </DropdownMenuTrigger>
              <AIActivityDropdown />
            </DropdownMenu>

            {/* User Avatar Menu */}
            <UserAvatarMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
