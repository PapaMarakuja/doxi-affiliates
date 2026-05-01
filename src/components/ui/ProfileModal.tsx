'use client';

import type { Profile } from '@/src/types';
import { Modal } from '@/src/components/ui/Modal';
import { ProfileForm } from '@/src/components/ui/ProfileForm';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onProfileUpdated?: (updated: Profile) => void;
  startInEditMode?: boolean;
}

export function ProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
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
        onProfileUpdated={onProfileUpdated}
        initialMode={startInEditMode ? 'edit' : 'view'}
      />
    </Modal>
  );
}
