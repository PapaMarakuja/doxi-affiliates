import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { createSupabaseServiceClient } from "@/src/lib/supabase/server";
import type { Affiliate, ApiResponse, Profile } from "@/src/types";
import { User } from "@supabase/supabase-js";
import { getAuthenticatedProfile } from "@/src/lib/auth/session";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  role?: "admin" | "affiliate";
  pix_key?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export interface CreateUserResult {
  profile: Profile;
  affiliate: Affiliate | null;
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ userId: string; role: string }>> {
    try {
      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error || !data.user) {
        return {
          data: null,
          error: error?.message ?? "Invalid credentials",
        };
      }

      // Buscar o perfil para obter a role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (profileError) {
        return {
          data: null,
          error: "Erro ao carregar perfil do usuário.",
        };
      }

      return { 
        data: { 
          userId: data.user.id, 
          role: profile?.role ?? "affiliate" 
        }, 
        error: null 
      };
    } catch (error) {
      console.error("AuthService.login error:", error);
      return { data: null, error: "Erro inesperado durante o login." };
    }
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      const supabase = await createSupabaseServerClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: null, error: null };
    } catch (error) {
      console.error("AuthService.logout error:", error);
      return { data: null, error: "Erro inesperado durante o logout." };
    }
  }

  async createUser(payload: CreateUserPayload): Promise<ApiResponse<CreateUserResult>> {
    try {
      const serviceClient = await createSupabaseServiceClient();

      const { data: newAuthUser, error: createError } =
        await serviceClient.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
        });

      if (createError || !newAuthUser.user) {
        return {
          data: null,
          error: createError?.message ?? "Failed to create auth user",
        };
      }

      const role = payload.role ?? "affiliate";

      const profileInsert: Record<string, unknown> = {
        user_id: newAuthUser.user.id,
        name: payload.name,
        role,
      };
      if (payload.pix_key !== undefined) profileInsert.pix_key = payload.pix_key;
      if (payload.contact_phone !== undefined) profileInsert.contact_phone = payload.contact_phone;
      if (payload.contact_email !== undefined) profileInsert.contact_email = payload.contact_email;

      const { data: profile, error: profileError } = await serviceClient
        .from("profiles")
        .insert(profileInsert)
        .select()
        .single();

      if (profileError || !profile) {
        await serviceClient.auth.admin.deleteUser(newAuthUser.user.id);
        return {
          data: null,
          error: profileError?.message ?? "Failed to create profile",
        };
      }

      let affiliate: Affiliate | null = null;

      if (role === "affiliate") {
        const { data: affiliateData, error: affiliateError } =
          await serviceClient
            .from("affiliates")
            .insert({
              profile_id: profile.id,
              name: payload.name,
            })
            .select()
            .single();

        if (affiliateError) {
          return {
            data: null,
            error: affiliateError.message ?? "Failed to create affiliate",
          };
        }

        affiliate = affiliateData as Affiliate;
      }

      return {
        data: { profile: profile as Profile, affiliate },
        error: null,
      };
    } catch (error) {
      console.error("AuthService.createUser error:", error);
      return { data: null, error: "Erro inesperado ao criar usuário." };
    }
  }

  async getProfile(): Promise<ApiResponse<{ user: User; profile: Profile }>> {
    return getAuthenticatedProfile();
  }
}
