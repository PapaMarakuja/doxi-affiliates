import { AchievementsService } from "@/src/services/achievements.service";
import { AuthService } from "@/src/services/auth.service";
import { AffiliateService } from "@/src/services/affiliate.service";

export async function POST(request: Request) {
  try {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();

    if (!authData) {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { achievement_id } = await request.json();

    if (!achievement_id) {
      return Response.json(
        { error: "ID da conquista é obrigatório" },
        { status: 400 }
      );
    }

    const affiliateService = new AffiliateService();
    const affiliate = await affiliateService.getAffiliateByUserId(authData.user.id);
    if (!affiliate) {
      return Response.json({ error: "Afiliado não encontrado." }, { status: 404 });
    }

    const achievementsService = new AchievementsService();
    const result = await achievementsService.claimRewardByAchievement({
      affiliateId: affiliate.id,
      achievementId: achievement_id
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ data: result.data });
  } catch (error) {
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
