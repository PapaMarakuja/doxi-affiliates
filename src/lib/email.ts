import nodemailer from 'nodemailer';
import { maskPhone, maskInteger } from './masks';

export interface CandidaturaEmailData {
  nome: string;
  instagram: string;
  whatsapp: string;
  email: string;
  conteudoTipo: string | null;
  igSeguidores?: string;
  igAlcance?: string;
  igImpressoes?: string;
  igInteracoes?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Configurações de SMTP_USER ou SMTP_PASS não foram definidas no .env.local');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // SSL para 465, STARTTLS para 587
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendCandidaturaEmail(data: CandidaturaEmailData): Promise<void> {
  const transporter = getTransporter();
  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;

  const cleanWhatsapp = data.whatsapp.replace(/\D/g, '');
  const cleanInstagram = data.instagram.replace(/^@/, '').trim();
  const formattedWhatsapp = maskPhone(data.whatsapp);
  const formattedSeguidores = data.igSeguidores ? maskInteger(data.igSeguidores) : '-';
  const formattedAlcance = data.igAlcance ? maskInteger(data.igAlcance) : '-';
  const formattedImpressoes = data.igImpressoes ? maskInteger(data.igImpressoes) : '-';
  const formattedInteracoes = data.igInteracoes ? maskInteger(data.igInteracoes) : '-';
  const whatsappUrl = `https://wa.me/55${cleanWhatsapp}`;
  const instagramUrl = `https://instagram.com/${cleanInstagram}`;
  const dataEnvio = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f9fa; color: #1e293b; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #f5b8bf 0%, #e27d8d 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.95; }
        .content { padding: 28px 24px; }
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; margin-top: 24px; }
        .section-title:first-child { margin-top: 0; }
        .data-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #f1f5f9; font-size: 14px; }
        .data-label { color: #64748b; font-weight: 500; }
        .data-value { font-weight: 600; color: #0f172a; text-align: right; }
        .highlight-box { background: #fff5f6; border: 1px solid #fed7dc; border-radius: 12px; padding: 16px; margin: 20px 0; display: flex; gap: 12px; justify-content: space-around; text-align: center; }
        .highlight-item { flex: 1; }
        .highlight-num { font-size: 18px; font-weight: 800; color: #e27d8d; font-family: monospace; }
        .highlight-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
        .btn-row { display: flex; gap: 12px; margin-top: 28px; }
        .btn { display: inline-block; padding: 12px 20px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13.5px; text-align: center; flex: 1; }
        .btn-whatsapp { background: #22c55e; color: #ffffff; }
        .btn-instagram { background: #e1306c; color: #ffffff; }
        .footer { padding: 16px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🐾 Nova Candidatura DoxiClub</h1>
          <p>Uma nova criadora de conteúdo deseja ser afiliada oficial!</p>
        </div>

        <div class="content">
          <div class="section-title">Dados de Contato</div>
          <div class="data-row">
            <span class="data-label">Nome:</span>
            <span class="data-value">${data.nome}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Instagram:</span>
            <span class="data-value"><a href="${instagramUrl}" target="_blank" style="color: #e27d8d; text-decoration: none;">@${cleanInstagram}</a></span>
          </div>
          <div class="data-row">
            <span class="data-label">WhatsApp:</span>
            <span class="data-value">${formattedWhatsapp}</span>
          </div>
          <div class="data-row">
            <span class="data-label">E-mail:</span>
            <span class="data-value">${data.email}</span>
          </div>
          <div class="data-row">
            <span class="data-label">Tipo de Conteúdo:</span>
            <span class="data-value">${data.conteudoTipo || 'Não informado'}</span>
          </div>

          <div class="section-title">Métricas Informadas (Instagram)</div>
          <div class="highlight-box">
            <div class="highlight-item">
              <div class="highlight-num">${formattedSeguidores}</div>
              <div class="highlight-label">Seguidores</div>
            </div>
            <div class="highlight-item">
              <div class="highlight-num">${formattedAlcance}</div>
              <div class="highlight-label">Alcance</div>
            </div>
            <div class="highlight-item">
              <div class="highlight-num">${formattedImpressoes}</div>
              <div class="highlight-label">Impressões</div>
            </div>
            <div class="highlight-item">
              <div class="highlight-num">${formattedInteracoes}</div>
              <div class="highlight-label">Interações</div>
            </div>
          </div>

          <div class="btn-row">
            <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp">Conversar no WhatsApp</a>
            <a href="${instagramUrl}" target="_blank" class="btn btn-instagram">Ver Perfil no Instagram</a>
          </div>
        </div>

        <div class="footer">
          Enviado automaticamente pelo portal Doxi Afiliadas em ${dataEnvio}.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"DoxiClub Portal" <${process.env.SMTP_USER}>`,
    to: notifyEmail,
    replyTo: data.email,
    subject: `🐾 Nova Candidatura DoxiClub: ${data.nome} (@${cleanInstagram})`,
    html,
  });
}
