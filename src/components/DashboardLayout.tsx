'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/src/types';
import { ToastProvider } from '@/src/contexts/ToastContext';
import { ToastContainer } from '@/src/components/ui/Toast';
import { ConfirmDialogProvider } from '@/src/contexts/ConfirmDialogContext';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { SidebarMenuProvider } from '@/src/contexts/SidebarMenuContext';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { ProfileModal } from '@/src/components/ui/ProfileModal';
import { UserProvider } from '@/src/contexts/UserContext';

const POST_LOGIN_FLAG = 'doxi-post-login';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/afiliados': 'Afiliados',
  '/cupons': 'Cupons',
  '/comissoes': 'Comissões',
  '/suporte': 'Suporte',
  '/gerenciar-conquistas': 'Conquistas',
  '/brindes': 'Brindes',
  '/pagamentos': 'Pagamentos',
  '/minhas-vendas': 'Minhas Vendas',
};

interface Props {
  children: React.ReactNode;
  user: User;
  profile: Profile;
}

export default function DashboardLayout({ children, user, profile }: Props) {
  const hasPixOnInitialProfile = Boolean(profile.pix_key?.trim());
  const [hasPostLoginFlag] = useState(() => {
    if (typeof window === 'undefined') return false;
    const value = sessionStorage.getItem(POST_LOGIN_FLAG) === '1';
    if (value) {
      sessionStorage.removeItem(POST_LOGIN_FLAG);
    }
    return value;
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayProfile, setDisplayProfile] = useState(profile);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalStartInEditMode, setProfileModalStartInEditMode] = useState(false);
  const [pixPendingModalOpen, setPixPendingModalOpen] = useState(
    hasPostLoginFlag && !hasPixOnInitialProfile
  );
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] || 'Dashboard';

  useEffect(() => {
    document.title = `Doxi | ${pageTitle}`;

    // Sequential Favicon Rotation
    const favicons = [
      '/favicons/favicon_1.svg',
      '/favicons/favicon_2.svg',
      '/favicons/favicon_3.svg',
      '/favicons/favicon_4.svg',
      '/favicons/favicon_5.svg'
    ];
    
    const currentIndex = parseInt(sessionStorage.getItem('favicon-index') || '0', 10);
    const nextIndex = (currentIndex + 1) % favicons.length;
    
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    link.href = favicons[currentIndex];
    sessionStorage.setItem('favicon-index', nextIndex.toString());
  }, [pageTitle, pathname]);

  function handleOpenProfileModal(startInEditMode = false) {
    setProfileModalStartInEditMode(startInEditMode);
    setProfileModalOpen(true);
  }

  function handleCloseProfileModal() {
    setProfileModalOpen(false);
    setProfileModalStartInEditMode(false);
  }

  function handlePendingPixAction() {
    setPixPendingModalOpen(false);
    handleOpenProfileModal(true);
  }

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <UserProvider user={user} profile={profile}>
          <SidebarMenuProvider role={displayProfile.role}>
            <div>
              <DashboardSidebar
                collapsed={collapsed}
                onToggle={() => setCollapsed(!collapsed)}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
              />
              <DashboardHeader
                sidebarCollapsed={collapsed}
                onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
                pageTitle={pageTitle}
                user={user}
                profile={displayProfile}
                onOpenProfileModal={() => handleOpenProfileModal(false)}
              />
              <main
                className={`dash-main ${collapsed ? 'dash-main--collapsed' : 'dash-main--expanded'}`}
              >
                <div className='dash-content'>{children}</div>
              </main>
            </div>
            <ProfileModal
              isOpen={profileModalOpen}
              onClose={handleCloseProfileModal}
              profile={displayProfile}
              onProfileUpdated={setDisplayProfile}
              startInEditMode={profileModalStartInEditMode}
            />

            <Modal
              id='pix-pending-modal'
              isOpen={pixPendingModalOpen}
              onClose={() => setPixPendingModalOpen(false)}
              title='Pendência Cadastral'
              size='sm'
            >
              <div className='pix-pending-modal-content'>
                <p className='pix-pending-modal-text'>
                  Você ainda não cadastrou sua Chave Pix. Complete seu perfil para receber
                  seus pagamentos sem atrasos.
                </p>
                <Button id='pix-pending-open-profile-btn' onClick={handlePendingPixAction}>
                  Concluir cadastro agora
                </Button>
              </div>
            </Modal>
            <ToastContainer />
            <ConfirmDialog />
          </SidebarMenuProvider>
        </UserProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
