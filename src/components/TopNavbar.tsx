'use client';

import React, { useState, useRef, useEffect } from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';

interface TopNavbarProps {
  showBrand?: boolean;
  brandTitle?: string;
  activeTab?: 'home' | 'driver' | 'audit';
  userName?: string;
  userRoleLabel?: string;
  onSettingsClick?: () => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  showBrand = false,
  brandTitle = 'DeliMan',
  activeTab,
  userName = 'Admin',
  userRoleLabel = 'Usuario actual',
  onSettingsClick,
  onThemeToggle,
  onLogout,
  children,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSettings = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
    setIsMenuOpen(false);
  };

  const handleTheme = () => {
    if (onThemeToggle) {
      onThemeToggle();
    } else {
      toggleTheme();
    }
    setIsMenuOpen(false);
  };

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="relative z-50 w-full h-14 bg-[#09090b] border-b border-[#27272a] px-6 sm:px-10 flex items-center justify-between">
      {/* Brand (Optional) */}
      <div className="flex items-center gap-6">
        {showBrand && (
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
            <Image
              src="/logo.svg"
              alt="DeliMan Logo"
              width={26}
              height={26}
              className="w-[26px] h-[26px] rounded-[6px] object-contain shrink-0"
              priority
            />
            <span className="font-semibold text-sm tracking-tight text-[#fafafa]">
              {brandTitle}
            </span>
          </Link>
        )}

        {/* Global Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            href="/"
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === 'home'
                ? 'bg-[#18181b] text-[#fafafa] border border-[#27272a]'
                : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]/50'
            }`}
          >
            Simulación v2
          </Link>
          <Link
            href="/driver"
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === 'driver'
                ? 'bg-[#18181b] text-[#fafafa] border border-[#27272a]'
                : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]/50'
            }`}
          >
            Repartidores
          </Link>
          <Link
            href="/audit"
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              activeTab === 'audit'
                ? 'bg-[#18181b] text-[#fafafa] border border-[#27272a]'
                : 'text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b]/50'
            }`}
          >
            Auditoría
          </Link>
        </nav>
      </div>

      {/* Right Content & User Icon */}
      <div className="flex items-center gap-4">
        {children}

        {/* User profile dropdown container */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-label="Perfil de usuario"
            className="w-8 h-8 rounded-full bg-[#18181b] border border-[#27272a] text-[#fafafa] text-xs font-mono font-medium flex items-center justify-center hover:border-[#3f3f46] transition-all focus:outline-none focus:ring-1 focus:ring-[#3f3f46]"
          >
            AH
          </button>

          {/* User Popover Menu */}
          {isMenuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] w-[260px] bg-[#121215] border border-[#27272a] rounded-md p-5 shadow-2xl z-[1000] select-none animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              aria-orientation="vertical"
              aria-label="Menú de usuario"
            >
              {/* Header info: Usuario actual + Admin */}
              <div className="flex flex-col items-end mb-5">
                <span className="text-xs text-[#71717a] font-medium">
                  {userRoleLabel}
                </span>
                <span className="text-xl font-bold font-mono text-[#fafafa] tracking-tight mt-0.5 leading-tight">
                  {userName}
                </span>
              </div>

              {/* Menu action buttons */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleSettings}
                  className="w-full py-2.5 px-4 bg-[#18181b] hover:bg-[#27272a] active:scale-[0.99] border border-[#27272a] rounded-md text-[#fafafa] font-semibold text-xs text-center transition-all focus:outline-none focus:ring-1 focus:ring-[#3f3f46]"
                >
                  Configuración
                </button>

                <button
                  type="button"
                  onClick={handleTheme}
                  className="w-full py-2.5 px-4 bg-[#18181b] hover:bg-[#27272a] active:scale-[0.99] border border-[#27272a] rounded-md text-[#fafafa] font-semibold text-xs text-center transition-all focus:outline-none focus:ring-1 focus:ring-[#3f3f46] flex items-center justify-between"
                >
                  <span>Tema</span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#a1a1aa] px-1.5 py-0.5 rounded bg-[#121215] border border-[#27272a]">
                    {theme === 'dark' ? 'Oscuro' : 'Claro'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogoutAction}
                  className="w-full py-2.5 px-4 bg-[#ffffff] hover:bg-[#e4e4e7] active:scale-[0.99] rounded-md text-[#09090b] font-bold text-xs text-center transition-all focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
