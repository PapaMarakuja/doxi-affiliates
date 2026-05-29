import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { ApiResponse, Profile, Affiliate } from "@/src/types";

export interface UpdateProfilePayload {
  name?: string;
  pix_key?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export class ProfileService {
  async updateProfile(
    payload: Partial<UpdateProfilePayload>
  ): Promise<ApiResponse<{ profile: Profile; affiliate: Affiliate | null }>> {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: authError?.message ?? "Sessão não encontrada." };
    }

    const profileUpdate: Record<string, unknown> = {};
    if (payload.name !== undefined) profileUpdate.name = payload.name;

    let updatedProfile: Profile | null = null;
    if (Object.keys(profileUpdate).length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error || !data) {
        return { data: null, error: error?.message ?? "Falha ao atualizar o perfil." };
      }
      updatedProfile = data as Profile;
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        return { data: null, error: error?.message ?? "Falha ao carregar perfil." };
      }
      updatedProfile = data as Profile;
    }

    let updatedAffiliate: Affiliate | null = null;
    if (updatedProfile.role === "affiliate") {
      const affiliateUpdate: Record<string, unknown> = {};
      if (payload.pix_key !== undefined) affiliateUpdate.pix_key = payload.pix_key;
      if (payload.contact_phone !== undefined) affiliateUpdate.contact_phone = payload.contact_phone;
      if (payload.contact_email !== undefined) affiliateUpdate.contact_email = payload.contact_email;
      if (payload.name !== undefined) affiliateUpdate.name = payload.name;

      if (Object.keys(affiliateUpdate).length > 0) {
        const { data, error } = await supabase
          .from("affiliates")
          .update(affiliateUpdate)
          .eq("profile_id", updatedProfile.id)
          .select()
          .single();
        if (!error && data) {
          updatedAffiliate = data as Affiliate;
        } else {
          console.error("Error updating affiliate in updateProfile:", error);
          // If update fails (e.g. affiliate not created yet), try to fetch current
          const { data: currentAff } = await supabase
            .from("affiliates")
            .select("*")
            .eq("profile_id", updatedProfile.id)
            .single();
          updatedAffiliate = (currentAff as Affiliate) || null;
        }
      } else {
        const { data } = await supabase
          .from("affiliates")
          .select("*")
          .eq("profile_id", updatedProfile.id)
          .single();
        updatedAffiliate = (data as Affiliate) || null;
      }
    }

    return { data: { profile: updatedProfile, affiliate: updatedAffiliate }, error: null };
  }
}
