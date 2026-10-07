'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImage,
  faMobileScreen,
  faCommentDots,
  faCheck,
  faXmark,
  faCircleCheck,
  faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import { Checkbox } from '@/src/components/ui/Checkbox';

// ─── Shared sub-components ─────────────────────────────────────────────────

interface SubStepHeaderProps {
  iconEl: React.ReactNode;
  title: string;
  subtitle: string;
}

function SubStepHeader({ iconEl, title, subtitle }: SubStepHeaderProps) {
  return (
    <div className="cad-rules-header">
      <div className="cad-rules-header-icon">{iconEl}</div>
      <div>
        <div className="cad-rules-header-title">{title}</div>
        <div className="cad-rules-header-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

interface RuleItemProps {
  allowed: boolean;
  text: string;
}

function RuleItem({ allowed, text }: RuleItemProps) {
  return (
    <li className="cad-rules-item">
      <FontAwesomeIcon
        icon={allowed ? faCheck : faXmark}
        className={`cad-rules-item-icon ${allowed ? 'cad-rules-item-icon--ok' : 'cad-rules-item-icon--no'}`}
      />
      <span>{text}</span>
    </li>
  );
}

// ─── Sub-step 1: Uso da Marca ──────────────────────────────────────────────

export function StepRegrasMarca() {
  return (
    <div className="cad-rules-section">
      <SubStepHeader
        iconEl={<FontAwesomeIcon icon={faImage} />}
        title="Uso da Marca DoxiClub"
        subtitle="Como representar nossa identidade visual com cuidado e padrão"
      />

      <p className="cad-rules-intro">
        Ao divulgar a DoxiClub, você também representa nossa marca. Criamos estas diretrizes simples para manter nossa identidade bonita e consistente em qualquer canal:
      </p>

      <div className="cad-rules-dual-grid">
        {/* O que fazer */}
        <div className="cad-rules-col">
          <div className="cad-rules-col-title cad-rules-col-title--ok">
            <FontAwesomeIcon icon={faCircleCheck} /> O que fazer
          </div>
          <ul className="cad-rules-list">
            <RuleItem
              allowed
              text="Utilize apenas os logos oficiais fornecidos pelo nosso time (versão clara, escura ou compacta)."
            />
            <RuleItem
              allowed
              text="Em posts de feed prefira a versão horizontal. Em stories e Reels, o logo compacto é ideal."
            />
            <RuleItem
              allowed
              text="Mencione 'DoxiClub' nas legendas para reforçar o reconhecimento e o alcance orgânico."
            />
          </ul>
        </div>

        {/* O que evitar */}
        <div className="cad-rules-col">
          <div className="cad-rules-col-title cad-rules-col-title--no">
            <FontAwesomeIcon icon={faCircleXmark} /> O que evitar
          </div>
          <ul className="cad-rules-list">
            <RuleItem
              allowed={false}
              text="Não distorça, recorte, mude cores, aplique filtros ou sobreponha textos sobre o logo."
            />
            <RuleItem
              allowed={false}
              text="Evite aplicar o logo sobre imagens de baixa qualidade ou com contraste ruim."
            />
            <RuleItem
              allowed={false}
              text="Não crie materiais promocionais ou campanhas paralelas sem aprovação prévia da equipe."
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-step 2: Canais Permitidos ────────────────────────────────────────

const ALLOWED_CHANNELS = [
  'Instagram (posts, Reels e stories)',
  'TikTok',
  'YouTube (vídeos e Shorts)',
  'Pinterest',
  'Blog pessoal',
  'WhatsApp para contatos próximos',
];

const FORBIDDEN_CHANNELS = [
  'Anúncios pagos (Meta Ads, Google Ads)',
  'Spam em grupos ou comentários',
  'Sites de cupons e cashback automáticos',
  'Disparo em massa de mensagens',
  'Perfis comprados ou automatizados',
];

export function StepRegrasCanais() {
  return (
    <div className="cad-rules-section">
      <SubStepHeader
        iconEl={<FontAwesomeIcon icon={faMobileScreen} />}
        title="Canais de Divulgação"
        subtitle="Onde você pode e onde não é permitido divulgar"
      />

      <p className="cad-rules-intro">
        A divulgação deve sempre acontecer onde você tem presença orgânica e relacionamento genuíno com o público. Sem atalhos e sem spam.
      </p>

      <div className="cad-rules-dual-grid">
        <div className="cad-rules-col">
          <div className="cad-rules-col-title cad-rules-col-title--ok">
            <FontAwesomeIcon icon={faCircleCheck} /> Canais permitidos
          </div>
          <div className="cad-channel-tags">
            {ALLOWED_CHANNELS.map((ch) => (
              <span key={ch} className="cad-channel-tag cad-channel-tag--allowed">{ch}</span>
            ))}
          </div>
        </div>

        <div className="cad-rules-col">
          <div className="cad-rules-col-title cad-rules-col-title--no">
            <FontAwesomeIcon icon={faCircleXmark} /> Não é permitido
          </div>
          <div className="cad-channel-tags">
            {FORBIDDEN_CHANNELS.map((ch) => (
              <span key={ch} className="cad-channel-tag cad-channel-tag--forbidden">{ch}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="cad-rules-note">
        Dúvidas sobre algum canal específico? Fale com a equipe antes de publicar.
      </div>
    </div>
  );
}

// ─── Sub-step 3: Linguagem + Checkbox ─────────────────────────────────────

interface StepRegrasLinguagemProps {
  agreed: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}

export function StepRegrasLinguagem({ agreed, onChange, error }: StepRegrasLinguagemProps) {
  return (
    <div className="cad-rules-section">
      <SubStepHeader
        iconEl={<FontAwesomeIcon icon={faCommentDots} />}
        title="Tom de Comunicação"
        subtitle="Como falar sobre a DoxiClub com verdade e leveza"
      />

      <p className="cad-rules-intro">
        Queremos que você fale da DoxiClub com naturalidade e entusiasmo genuíno. O seu estilo próprio é o que mais conecta:
      </p>

      <div className="cad-rules-dual-grid">
        {/* Boas práticas */}
        <div className="cad-rules-col">
          <div className="cad-rules-col-title cad-rules-col-title--ok">
            <FontAwesomeIcon icon={faCircleCheck} /> Boas práticas
          </div>
          <ul className="cad-rules-list">
            <RuleItem
              allowed
              text="Compartilhe experiências reais de uso com seus pets. Recomendações verdadeiras convertem muito mais."
            />
            <RuleItem
              allowed
              text="Mantenha um tom alegre e leve, sem promessas exageradas que fujam da proposta do produto."
            />
            <RuleItem
              allowed
              text="Se ainda não testou um item, seja transparente com seus seguidores. Credibilidade é seu maior ativo."
            />
          </ul>
        </div>

        {/* Evite */}
        <div className="cad-rules-col">
          <div className="cad-rules-col-title cad-rules-col-title--no">
            <FontAwesomeIcon icon={faCircleXmark} /> O que evitar
          </div>
          <ul className="cad-rules-list">
            <RuleItem
              allowed={false}
              text="Não faça comparações depreciativas com concorrentes. Foque nas qualidades da DoxiClub."
            />
            <RuleItem
              allowed={false}
              text="Evite urgência forçada ('última chance') se não houver uma ação promocional real em andamento."
            />
            <RuleItem
              allowed={false}
              text="Não publique informações imprecisas sobre valores, características técnicas ou prazos de envio."
            />
          </ul>
        </div>
      </div>

      <div className="cad-rules-agreement">
        <Checkbox
          label="Eu li e concordo com todas as regras do programa de afiliados DoxiClub"
          checked={agreed}
          onChange={onChange}
        />
        {error && (
          <span className="cad-field-error">{error}</span>
        )}
      </div>
    </div>
  );
}
