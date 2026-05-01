import { AchievementsService } from "@/src/services/achievements.service";
import { AuthService } from "@/src/services/auth.service";
import { AffiliateService } from "@/src/services/affiliate.service";

// GET - Consulta de conquistas disponíveis e, se for afiliado, as suas progressões.
export async function GET(request: Request) {
  try {
    const authService = new AuthService();
    const { data: authData } = await authService.getProfile();
    
    if (!authData) {
      return Response.json({ error: "Não autorizado" }, { status: 401 });
    }

    const achievementsService = new AchievementsService();
    
    if (authData.profile.role === "admin") {
      const result = await achievementsService.getAchievements();
      if (result.error) return Response.json({ error: result.error }, { status: 500 });
      return Response.json({ data: result.data });
    } else {
      const affiliateService = new AffiliateService();
      const affiliate = await affiliateService.getAffiliateByUserId(authData.user.id);

      // Para o afiliado, retornamos as definições + suas conquistas específicas
      const [defResult, affResult] = await Promise.all([
        achievementsService.getAchievements(),
        affiliate ? achievementsService.getAffiliateAchievements(affiliate.id) : Promise.resolve({ data: [], error: null })
      ]);

      if (defResult.error) return Response.json({ error: defResult.error }, { status: 500 });
      if (affResult.error) return Response.json({ error: affResult.error }, { status: 500 });

      return Response.json({ 
        data: {
          definitions: defResult.data,
          affiliateAchievements: affResult.data
        }
      });
    }

  } catch (error) {
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

// POST - Criar nova definição de conquista (Apenas Admin)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const achievementsService = new AchievementsService();
    const result = await achievementsService.createAchievement(body);

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
