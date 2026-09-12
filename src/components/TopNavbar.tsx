'use client';

import React from 'react';

interface TopNavbarProps {
  showBrand?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ showBrand = false }) => {
  return (
    <header className={`w-full h-[72px] bg-white dark:bg-zinc-900 border-b border-[#E4E4E7] dark:border-zinc-800 px-6 sm:px-10 flex items-center ${showBrand ? 'justify-between' : 'justify-end'} transition-colors`}>
      {/* Brand (Optional) */}
      {showBrand && (
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-sm bg-[#09090B] dark:bg-zinc-100" />
          <span className="font-bold text-sm tracking-tight text-[#09090B] dark:text-zinc-100">
            HackLegioner
          </span>
        </div>
      )}

      {/* User Icon (Anchored to right - justify-end) */}
      <div className="flex items-center justify-end">
        <button
          aria-label="Perfil de usuario"
          className="rounded-full hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <svg
            width="40"
            height="40"
            viewBox="1600 16 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10"
          >
            <rect
              x="1600.5"
              y="16.5"
              width="39"
              height="39"
              rx="19.5"
              fill="#F4F4F5"
              className="fill-zinc-100 dark:fill-zinc-800"
            />
            <rect
              x="1600.5"
              y="16.5"
              width="39"
              height="39"
              rx="19.5"
              stroke="#E4E4E7"
              className="stroke-zinc-200 dark:stroke-zinc-700"
            />
            <g clipPath="url(#clip0_user_nav)">
              <path
                d="M1615.83 43.2189V41.8338C1615.83 41.3917 1616.01 40.9678 1616.32 40.6552C1616.63 40.3426 1617.06 40.167 1617.5 40.167H1622.5C1622.94 40.167 1623.37 40.3426 1623.68 40.6552C1623.99 40.9678 1624.17 41.3917 1624.17 41.8338V43.2189M1628.33 36C1628.33 40.6027 1624.6 44.334 1620 44.334C1615.4 44.334 1611.67 40.6027 1611.67 36C1611.67 31.3973 1615.4 27.666 1620 27.666C1624.6 27.666 1628.33 31.3973 1628.33 36ZM1622.5 34.3332C1622.5 35.714 1621.38 36.8334 1620 36.8334C1618.62 36.8334 1617.5 35.714 1617.5 34.3332C1617.5 32.9524 1618.62 31.833 1620 31.833C1621.38 31.833 1622.5 32.9524 1622.5 34.3332Z"
                stroke="#09090B"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-zinc-900 dark:stroke-zinc-100"
              />
            </g>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
