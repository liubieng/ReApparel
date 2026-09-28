import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';

interface HeaderProps {
  currentView: string;
  theme: 'light' | 'dark';
  onOpenMobileSidebar: () => void;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  theme,
  onOpenMobileSidebar,
  onToggleTheme
}) => {
  const currentItem = NAV_ITEMS.find(n => n.id === currentView);
  const title = currentItem ? currentItem.label : 'ReApparel';

  return (
    <div className="top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <button 
        type="button" 
        className="icobtn" 
        onClick={onOpenMobileSidebar}
        aria-label="Open navigation sidebar"
      >
        <Menu className="ico" style={{ width: 20, height: 20 }} />
      </button>

      <strong style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text)' }}>
        {title}
      </strong>

      <button 
        type="button" 
        className="icobtn" 
        onClick={onToggleTheme}
        aria-label="Toggle visual theme"
      >
        {theme === 'dark' ? <Sun className="ico" style={{ width: 18, height: 18 }} /> : <Moon className="ico" style={{ width: 18, height: 18 }} />}
      </button>
    </div>
  );
};
