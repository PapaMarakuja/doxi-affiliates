import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Affiliate, Profile, ApiResponse } from "@/src/types";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

const getCachedSupabaseUser = cache(async (): Promise<ApiResponse<User>> => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    return { data: user as User, error: null };
  } catch (error) {
    console.error("getCachedSupabaseUser error:", error);
    return { data: null, error: "Erro inesperado na sessão." };
  }
});

const getCachedProfileByUserId = cache(async (userId: string): Promise<ApiResponse<Profile>> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return { data: null, error: "Profile not found" };
    }

    return { data: profile as Profile, error: null };
  } catch (error) {
    console.error("getCachedProfileByUserId error:", error);
    return { data: null, error: "Erro ao buscar perfil." };
  }
});

const getCachedAffiliateByProfileId = cache(
  async (profileId: string): Promise<ApiResponse<Affiliate>> => {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: affiliate, error: affiliateError } = await supabase
        .from("affiliates")
        .select("*")
        .eq("profile_id", profileId)
        .single();

      if (affiliateError || !affiliate) {
        return { data: null, error: "Affiliate profile not found" };
      }

      return { data: affiliate as Affiliate, error: null };
    } catch (error) {
      console.error("getCachedAffiliateByProfileId error:", error);
      return { data: null, error: "Erro ao buscar afiliado." };
    }
  }
);

export async function getAuthenticatedUser(): Promise<ApiResponse<{ id: string; email: string }>> {
  const userResult = await getCachedSupabaseUser();
  if (!userResult.data || userResult.error) {
    return { data: null, error: userResult.error ?? "Unauthorized" };
  }

  return {
    data: { id: userResult.data.id, email: userResult.data.email ?? "" },
    error: null,
  };
}

export async function getAuthenticatedAffiliate(): Promise<
  ApiResponse<Affiliate>
> {
  const userResult = await getAuthenticatedUser();

  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error ?? "Unauthorized" };
  }

  const profileResult = await getCachedProfileByUserId(userResult.data.id);
  if (profileResult.error || !profileResult.data) {
    return { data: null, error: profileResult.error ?? "Profile not found" };
  }

  const affiliateResult = await getCachedAffiliateByProfileId(profileResult.data.id);
  if (affiliateResult.error || !affiliateResult.data) {
    return {
      data: null,
      error: affiliateResult.error ?? "Affiliate profile not found",
    };
  }

  return { data: affiliateResult.data, error: null };
}

export async function getAuthenticatedAdmin(): Promise<ApiResponse<Profile>> {
  const userResult = await getAuthenticatedUser();

  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error ?? "Unauthorized" };
  }

  const profileResult = await getCachedProfileByUserId(userResult.data.id);
  if (profileResult.error || !profileResult.data) {
    return { data: null, error: profileResult.error ?? "Profile not found" };
  }

  if (profileResult.data.role !== "admin") {
    return { data: null, error: "Forbidden: admin access required" };
  }

  return { data: profileResult.data, error: null };
}

export async function getAuthenticatedProfile(): Promise<
  ApiResponse<{ user: User; profile: Profile }>
> {
  const userResult = await getCachedSupabaseUser();
  if (userResult.error || !userResult.data) {
    return { data: null, error: userResult.error ?? "Session not found" };
  }

  const profileResult = await getCachedProfileByUserId(userResult.data.id);
  if (profileResult.error || !profileResult.data) {
    return { data: null, error: profileResult.error ?? "Profile not found" };
  }

  return {
    data: {
      user: userResult.data,
      profile: profileResult.data,
    },
    error: null,
  };
}

export async function logout(): Promise<ApiResponse<null>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error("logout error:", error);
    return { data: null, error: "Erro inesperado no logout." };
  }
}
