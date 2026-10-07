'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCommentDots,
  faHourglassHalf,
} from '@fortawesome/free-solid-svg-icons';

export function StepBemVindo() {
  return (
    <div className="cad-welcome">
      <h2 className="cad-welcome-title">Que alegria ter você aqui!</h2>
      <p className="cad-welcome-subtitle">
        Obrigada pelo interesse em fazer parte do programa de afiliados DoxiClub.
        Queremos muito conhecer você e seus peludos.
      </p>

      <div className="cad-info-list">
        <div className="cad-info-item">
          <div className="cad-info-item-icon">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </div>
          <strong className="cad-info-item-title">Análise manual</strong>
          <p className="cad-info-item-text">
            Avaliamos cada perfil pessoalmente, priorizando autenticidade e conexão real com o universo pet.
          </p>
        </div>

        <div className="cad-info-item">
          <div className="cad-info-item-icon">
            <FontAwesomeIcon icon={faHourglassHalf} />
          </div>
          <strong className="cad-info-item-title">Prazo de até 5 dias</strong>
          <p className="cad-info-item-text">
            Retornamos em até 5 dias úteis com o resultado da sua candidatura.
          </p>
        </div>

        <div className="cad-info-item">
          <div className="cad-info-item-icon">
            <FontAwesomeIcon icon={faCommentDots} />
          </div>
          <strong className="cad-info-item-title">Contato direto</strong>
          <p className="cad-info-item-text">
            O retorno será enviado pelo WhatsApp ou e-mail cadastrados neste formulário.
          </p>
        </div>
      </div>
    </div>
  );
}
