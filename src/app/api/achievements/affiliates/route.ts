import { AchievementsService } from "@/src/services/achievements.service";
import { AuthService } from "@/src/services/auth.service";

export async function GET(request: Request) {
  try {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();
    
    if (!authData || authData.profile.role !== "admin") {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const affiliateId = searchParams.get("affiliate_id");

    const achievementsService = new AchievementsService();
    const result = await achievementsService.getAllAffiliateAchievements(affiliateId || undefined);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ data: result.data });
  } catch (error) {
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
