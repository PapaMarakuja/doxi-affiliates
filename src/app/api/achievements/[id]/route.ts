import { AchievementsService } from "@/src/services/achievements.service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const achievementsService = new AchievementsService();
    const result = await achievementsService.updateAchievement(id, body);

    if (result.error) {
      if (result.error === "Acesso negado.") {
        return Response.json({ error: result.error }, { status: 403 });
      }
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ data: result.data });
  } catch (error) {
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const achievementsService = new AchievementsService();
    const result = await achievementsService.deleteAchievement(id);

    if (result.error) {
      if (result.error === "Acesso negado.") {
        return Response.json({ error: result.error }, { status: 403 });
      }
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ data: result.data });
  } catch (error) {
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
