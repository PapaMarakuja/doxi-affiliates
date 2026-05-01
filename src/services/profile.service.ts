import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResponse, Profile } from "@/src/types";

export type UpdateProfilePayload = Pick<
  Profile,
  "name" | "pix_key" | "contact_phone" | "contact_email"
>;

export class ProfileService {
  async updateProfile(payload: Partial<UpdateProfilePayload>): Promise<ApiResponse<Profile>> {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? "Sessão não encontrada." };
    }

    const updateData: Partial<UpdateProfilePayload> = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.pix_key !== undefined) updateData.pix_key = payload.pix_key;
    if (payload.contact_phone !== undefined) updateData.contact_phone = payload.contact_phone;
    if (payload.contact_email !== undefined) updateData.contact_email = payload.contact_email;

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? "Falha ao atualizar o perfil." };
    }

    return { data: data as Profile, error: null };
  }
}
