'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card } from '@/src/components/ui/Card';
import { Wizard, type WizardStep } from '@/src/components/ui/Wizard';
import ThemeToggle from '@/src/components/ThemeToggle';
import loginBackground from '@/src/assets/images/login-background.png';
import doxiClubLightLogo from '@/src/assets/images/doxi-club-light.png';
import doxiClubDarkLogo from '@/src/assets/images/doxi-club-dark.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaw,
  faGift,
  faBook,
  faClipboardList,
  faUser,
} from '@fortawesome/free-solid-svg-icons';

import { StepBemVindo } from './steps/StepBemVindo';
import { StepBeneficios } from './steps/StepBeneficios';
import {
  StepRegrasMarca,
  StepRegrasCanais,
  StepRegrasLinguagem,
} from './steps/StepRegras';
import { StepObrigacoes } from './steps/StepObrigacoes';
import {
  StepDadosCadastrais,
  type DadosCadastraisData,
  type DadosCadastraisErrors,
} from './steps/StepDadosCadastrais';
import { StepFinalizacao } from './steps/StepFinalizacao';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CadastroPage() {
  // ── Regras ────────────────────────────────────────────────────────────────
  const [regrasAceitas, setRegrasAceitas] = useState(false);
  const [regrasError, setRegrasError] = useState<string | undefined>();

  // ── Obrigações ────────────────────────────────────────────────────────────
  const [obrigacoesAceitas, setObrigacoesAceitas] = useState(false);
  const [obrigacoesError, setObrigacoesError] = useState<string | undefined>();

  // ── Dados cadastrais ──────────────────────────────────────────────────────
  const [dados, setDados] = useState<DadosCadastraisData>({
    nome: '',
    instagram: '',
    whatsapp: '',
    email: '',
    conteudoTipo: null,
    igSeguidores: '',
    igAlcance: '',
    igImpressoes: '',
    igInteracoes: '',
  });
  const [dadosErrors, setDadosErrors] = useState<DadosCadastraisErrors>({});

  // ── Submission ────────────────────────────────────────────────────────────
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingText, setSubmittingText] = useState('Enviando e-mail...');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleDadosChange<K extends keyof DadosCadastraisData>(
    field: K,
    value: DadosCadastraisData[K],
  ) {
    setDados((prev) => ({ ...prev, [field]: value }));
    setDadosErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateRegras(): boolean {
    if (!regrasAceitas) {
      setRegrasError('Você precisa aceitar as regras para continuar.');
      return false;
    }
    setRegrasError(undefined);
    return true;
  }

  function validateObrigacoes(): boolean {
    if (!obrigacoesAceitas) {
      setObrigacoesError('Você precisa aceitar as obrigações para continuar.');
      return false;
    }
    setObrigacoesError(undefined);
    return true;
  }

  function validateDados(): boolean {
    const errors: DadosCadastraisErrors = {};
    if (!dados.nome.trim()) errors.nome = 'Nome é obrigatório.';
    if (!dados.whatsapp.trim()) {
      errors.whatsapp = 'WhatsApp é obrigatório.';
    } else if (dados.whatsapp.replace(/\D/g, '').length < 10) {
      errors.whatsapp = 'WhatsApp inválido.';
    }
    if (!dados.email.trim()) {
      errors.email = 'E-mail é obrigatório.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      errors.email = 'E-mail inválido.';
    }
    if (!dados.instagram.trim()) errors.instagram = 'Instagram é obrigatório.';
    if (!dados.conteudoTipo) errors.conteudoTipo = 'Selecione o tipo de conteúdo.';

    setDadosErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Steps ─────────────────────────────────────────────────────────────────

  const steps: WizardStep[] = [
    {
      key: 'boas-vindas',
      label: 'Boas-vindas',
      icon: <FontAwesomeIcon icon={faPaw} />,
      content: <StepBemVindo />,
    },
    {
      key: 'beneficios',
      label: 'Benefícios',
      icon: <FontAwesomeIcon icon={faGift} />,
      content: <StepBeneficios />,
    },
    {
      key: 'regras',
      label: 'Regras',
      icon: <FontAwesomeIcon icon={faBook} />,
      subSteps: [
        {
          key: 'regras-marca',
          label: 'Uso da Marca',
          content: <StepRegrasMarca />,
        },
        {
          key: 'regras-canais',
          label: 'Canais',
          content: <StepRegrasCanais />,
        },
        {
          key: 'regras-linguagem',
          label: 'Linguagem',
          content: (
            <StepRegrasLinguagem
              agreed={regrasAceitas}
              onChange={(v) => {
                setRegrasAceitas(v);
                if (v) setRegrasError(undefined);
              }}
              error={regrasError}
            />
          ),
          canExit: () => validateRegras() || 'Você precisa aceitar as regras para continuar.',
        },
      ],
    },
    {
      key: 'obrigacoes',
      label: 'Obrigações',
      icon: <FontAwesomeIcon icon={faClipboardList} />,
      content: (
        <StepObrigacoes
          agreed={obrigacoesAceitas}
          onChange={(v) => {
            setObrigacoesAceitas(v);
            if (v) setObrigacoesError(undefined);
          }}
          error={obrigacoesError}
        />
      ),
      canExit: () => validateObrigacoes() || 'Você precisa aceitar as obrigações para continuar.',
    },
    {
      key: 'dados',
      label: 'Seus dados',
      icon: <FontAwesomeIcon icon={faUser} />,
      content: (
        <StepDadosCadastrais
          data={dados}
          errors={dadosErrors}
          onChange={handleDadosChange}
        />
      ),
      canExit: () => validateDados() || 'Corrija os erros antes de continuar.',
    },
  ];

  async function handleComplete() {
    setSubmitting(true);
    setSubmitError(null);
    setSubmittingText('Enviando e-mail...');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSubmittingText('Pode demorar um pouco...');
    }, 10000);

    try {
      const res = await fetch('/api/cadastro/candidatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao enviar candidatura. Tente novamente.');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Falha ao submeter candidatura:', err);
      setSubmitError(
        err instanceof Error ? err.message : 'Erro ao enviar candidatura. Verifique os dados e tente novamente.'
      );
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSubmitting(false);
      setSubmittingText('Enviando e-mail...');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="cad-page"
      style={{
        backgroundImage: `url(${loginBackground.src})`,
      }}
    >
      <ThemeToggle variant="floating" />

      <header className="cad-header">
        <div className="cad-logo-wrap">
          <Image
            src={doxiClubLightLogo}
            alt="Doxi Club"
            priority
            className="login-logo-light"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          <Image
            src={doxiClubDarkLogo}
            alt="Doxi Club"
            priority
            className="login-logo-dark"
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
      </header>

      <div className="cad-card-wrap">
        <Card>
          {submitted ? (
            <StepFinalizacao />
          ) : (
            <>
              <div className="cad-card-heading">
                <h1 className="cad-card-heading-title">Candidatura de Afiliada</h1>
                <p className="cad-card-heading-sub">
                  Preencha as etapas abaixo para enviar sua candidatura ao programa DoxiClub.
                </p>
              </div>

              {submitError && (
                <div className="wizard-error" role="alert" style={{ marginBottom: 20 }}>
                  <span className="wizard-error-icon">✕</span>
                  <span>{submitError}</span>
                </div>
              )}

              <Wizard
                steps={steps}
                onComplete={handleComplete}
                completeLabel={submitting ? submittingText : 'Enviar candidatura'}
                loading={submitting}
              />
            </>
          )}
        </Card>
      </div>

      <footer className="cad-footer">
        <Card>
          Já possui uma conta?{' '}
          <Link
            href="/login"
            style={{ color: 'var(--pink-dark)', textDecoration: 'none', fontWeight: 600 }}
          >
            Faça login
          </Link>
        </Card>
      </footer>
    </div>
  );
}
