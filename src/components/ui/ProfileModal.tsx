'use client';

import type { Profile, Affiliate } from '@/src/types';
import { Modal } from '@/src/components/ui/Modal';
import { ProfileForm } from '@/src/components/ui/ProfileForm';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  affiliate?: Affiliate | null;
  onProfileUpdated?: (updated: Profile) => void;
  onAffiliateUpdated?: (updated: Affiliate) => void;
  startInEditMode?: boolean;
}

export function ProfileModal({
  isOpen,
  onClose,
  profile,
  affiliate,
  onProfileUpdated,
  onAffiliateUpdated,
  startInEditMode = false,
}: ProfileModalProps) {
  return (
    <Modal
      id='profile-modal'
      isOpen={isOpen}
      onClose={onClose}
      title='Meu Perfil'
      size='md'
    >
      <ProfileForm
        profile={profile}
        affiliate={affiliate}
        onProfileUpdated={onProfileUpdated}
        onAffiliateUpdated={onAffiliateUpdated}
        initialMode={startInEditMode ? 'edit' : 'view'}
      />
    </Modal>
  );
}
