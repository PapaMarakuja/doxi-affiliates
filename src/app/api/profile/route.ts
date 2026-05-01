import { ProfileService, type UpdateProfilePayload } from "@/src/services/profile.service";
import { validateProfileUpdate, hasValidationErrors } from "@/src/lib/profileValidation";

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<UpdateProfilePayload>;

    const errors = validateProfileUpdate(body);
    if (hasValidationErrors(errors)) {
      const firstError = Object.values(errors).find(Boolean);
      return Response.json({ error: firstError }, { status: 422 });
    }

    const profileService = new ProfileService();
    const result = await profileService.updateProfile(body);

    if (result.error || !result.data) {
      return Response.json(
        { error: result.error ?? "Erro ao atualizar o perfil." },
        { status: 500 }
      );
    }

    return Response.json({ data: result.data });
  } catch {
    return Response.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
