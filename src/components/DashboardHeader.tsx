'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faUserPen,
  faRightFromBracket,
  faChevronDown,
  faBars,
} from '@fortawesome/free-solid-svg-icons';

import { User } from '@supabase/supabase-js';
import { Profile } from '@/src/types';
import { clearSidebarCache } from '@/src/lib/sidebar/sidebarService';

interface Props {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
  pageTitle: string;
  user: User;
  profile: Profile;
  onOpenProfileModal: () => void;
}

export default function DashboardHeader({
  sidebarCollapsed,
  onMobileMenuToggle,
  pageTitle,
  profile,
  onOpenProfileModal,
}: Props) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) {
        setLoggingOut(false);
        return;
      }
      clearSidebarCache();
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  function handleOpenProfile() {
    setDropdownOpen(false);
    onOpenProfileModal();
  }

  return (
    <>
      <header
        className={`dash-header ${sidebarCollapsed ? 'dash-header--collapsed' : 'dash-header--expanded'}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className='mobile-menu-btn' onClick={onMobileMenuToggle}>
            <FontAwesomeIcon icon={faBars} />
          </button>
          <h1 className='dash-header-title'>{pageTitle}</h1>
        </div>

        <div className='dash-header-user' ref={ref}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className='dash-header-user-btn'
            aria-expanded={dropdownOpen}
            aria-haspopup='true'
            id='header-user-menu-btn'
          >
            <div className='dash-header-avatar'>
              <FontAwesomeIcon icon={faUser} />
            </div>
            <div className='dash-header-user-info'>
              <p className='dash-header-user-name'>{profile.name || 'Usuário'}</p>
              <p className='dash-header-user-role'>
                {profile.role === 'admin' ? 'Administrador' : 'Afiliado'}
              </p>
            </div>
            <span className='dash-header-chevron'>
              <FontAwesomeIcon icon={faChevronDown} />
            </span>
          </button>

          {dropdownOpen && (
            <div className='dash-dropdown' role='menu'>
              <button
                className='dash-dropdown-item'
                onClick={handleOpenProfile}
                role='menuitem'
                id='header-menu-profile'
              >
                <span className='dash-dropdown-icon'>
                  <FontAwesomeIcon icon={faUserPen} />
                </span>
                Meu Perfil
              </button>
              {/* <a href="#" className="dash-dropdown-item" role="menuitem">
                <span className="dash-dropdown-icon">
                  <FontAwesomeIcon icon={faGear} />
                </span>
                Configurações
              </a> */}
              <div className='dash-dropdown-divider' />
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className='dash-dropdown-item dash-dropdown-item--danger'
                role='menuitem'
                id='header-menu-logout'
              >
                <span className='dash-dropdown-icon'>
                  <FontAwesomeIcon icon={faRightFromBracket} />
                </span>
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
