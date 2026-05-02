'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { useLoginForm } from './hooks/useLoginForm';
import { Alert } from '@/src/components/ui/Alert';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';

export function LoginForm() {
  const { values, errors, serverError, loading, handleChange, handleSubmit } =
    useLoginForm();

  return (
    <form id='login-form' onSubmit={handleSubmit} noValidate>
      {serverError && <Alert type='error' message={serverError} />}

      <Input
        id='email'
        name='email'
        type='text'
        label='Usuário'
        placeholder='Digite seu usuário'
        autoComplete='username'
        value={values.email}
        onChange={handleChange}
        disabled={loading}
        icon={<FontAwesomeIcon icon={faUser} />}
        error={errors.email}
      />

      <Input
        id='password'
        name='password'
        type='password'
        label='Senha'
        placeholder='••••••••'
        autoComplete='current-password'
        value={values.password}
        onChange={handleChange}
        disabled={loading}
        icon={<FontAwesomeIcon icon={faLock} />}
        error={errors.password}
      // rightLabel={
      //   <a href="#" className="login-forgot-link">
      //     Esqueceu a senha?
      //   </a>
      // }
      />

      <Button type='submit' loading={loading}>
        Entrar
      </Button>

      <p className='text-sm mt-2' style={{ color: 'var(--text-muted)' }}>
        Após o login, sua sessão permanece ativa até você sair.
      </p>
    </form>
  );
}
