import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-6 text-sm text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-300">Smart Order Management System (SOMS)</span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-xs text-slate-500 hidden sm:inline">Decoupled WooCommerce Engine · Native Order ID Architecture</span>
        </div>
        <div className="text-sm">
          Developed by{' '}
          <a
            href="https://www.facebook.com/m.rakibmazhar/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            MI Rakib
          </a>
        </div>
      </div>
    </footer>
  );
};
