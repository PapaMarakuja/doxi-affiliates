import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/src/lib/auth/session';
import { LoginForm } from '@/src/components/auth/LoginForm';
import { Card } from '@/src/components/ui/Card';
import loginBackground from '@/src/assets/images/login-background.png';
import doxiClubLightLogo from '@/src/assets/images/doxi-club-light.png';
import doxiClubDarkLogo from '@/src/assets/images/doxi-club-dark.png';

export const metadata: Metadata = {
  title: 'Entrar | Doxi Afiliados',
  description: 'Acesse seu painel de afiliado Doxi Wear.',
};

export default async function LoginPage() {
  const result = await getAuthenticatedUser();

  if (result.data) {
    redirect('/');
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '20px 12px',
        minHeight: '100vh',
        backgroundImage: `url(${loginBackground.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '8px',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '360px',
            flex: '1 1 210px',
          }}
        >
          <Image
            src={doxiClubLightLogo}
            alt='Doxi Club'
            priority
            className='login-logo-light'
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
          <Image
            src={doxiClubDarkLogo}
            alt='Doxi Club'
            priority
            className='login-logo-dark'
            style={{
              width: '100%',
              height: 'auto',
            }}
          />
        </div>
      </header>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Card>
          <LoginForm />
        </Card>
      </div>

      <footer
        style={{
          marginTop: '4px',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--text-muted)',
        }}
      >
        <Card style={{ padding: '12px 16px' }}>
          Quer fazer parte?{' '}
          <a href='#' style={{ color: 'var(--pink-dark)', textDecoration: 'none' }}>
            Entre em contato
          </a>
        </Card>
      </footer>
    </div>
  );
}
