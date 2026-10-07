import { NextResponse } from 'next/server';
import { sendCandidaturaEmail } from '@/src/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.nome || !body.whatsapp || !body.email || !body.instagram) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes (nome, whatsapp, email, instagram).' },
        { status: 400 }
      );
    }

    await sendCandidaturaEmail(body);

    return NextResponse.json({ success: true, message: 'Candidatura enviada com sucesso!' });
  } catch (error: unknown) {
    console.error('Erro ao enviar e-mail de candidatura:', error);
    const msg = error instanceof Error ? error.message : 'Falha ao enviar candidatura';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
