import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Affiliate, Coupon, Profile } from "@/src/types";

export class AffiliateRepository {
  async getProfileByUserId(userId: string): Promise<Profile | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) return null;
    return data as Profile;
  }

  async getAffiliateByProfileId(profileId: string): Promise<Affiliate | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    if (error) return null;
    return data as Affiliate;
  }

  async getAffiliateById(id: string): Promise<Affiliate | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as Affiliate;
  }

  async updateAffiliate(id: string, updates: Partial<Affiliate>): Promise<Affiliate | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return null;
    return data as Affiliate;
  }

  async createAffiliate(affiliate: Omit<Affiliate, "id" | "created_at">): Promise<Affiliate | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .insert([affiliate])
      .select()
      .single();

    if (error) return null;
    return data as Affiliate;
  }

  async getActiveCouponsByAffiliateId(affiliateId: string): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .eq("active", true);

    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  async getCouponByCode(code: string): Promise<Coupon | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .single();

    if (error) return null;
    return data as Coupon;
  }

  async getAllActiveCoupons(): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("active", true);

    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  async getPaginatedAffiliates(
    page: number = 1,
    limit: number = 10,
    searchName?: string,
    orderBy: string = "created_at",
    orderDesc: boolean = true
  ): Promise<{ data: Affiliate[]; count: number }> {
    const supabase = await createSupabaseServerClient();

    let query = supabase.from("affiliates").select("*, coupons(*)", { count: "exact" });

    if (searchName) {
      query = query.ilike("name", `%${searchName}%`);
    }

    query = query.order(orderBy, { ascending: !orderDesc });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], count: 0 };
    }

    return { data: data as Affiliate[], count: count ?? 0 };
  }

  async deleteAffiliate(id: string): Promise<boolean> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("affiliates")
      .delete()
      .eq("id", id);

    return !error;
  }

  async getUnlinkedCoupons(): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .is("affiliate_id", null)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  async getAllCoupons(): Promise<Coupon[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data as Coupon[]) ?? [];
  }

  async createCoupon(coupon: Omit<Coupon, "id" | "created_at">): Promise<Coupon | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .insert([coupon])
      .select()
      .single();

    if (error) return null;
    return data as Coupon;
  }

  async linkCouponToAffiliate(couponId: string, affiliateId: string): Promise<Coupon | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .update({ affiliate_id: affiliateId })
      .eq("id", couponId)
      .select()
      .single();

    if (error) return null;
    return data as Coupon;
  }

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return null;
    return data as Coupon;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id);

    return !error;
  }

  async getProfileById(profileId: string): Promise<Profile | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error) return null;
    return data as Profile;
  }

  async getUnlinkedProfiles(): Promise<Profile[]> {
    const supabase = await createSupabaseServerClient();

    // Get all profile IDs that ARE linked to an affiliate
    const { data: affiliates, error: affError } = await supabase
      .from("affiliates")
      .select("profile_id")
      .not("profile_id", "is", null);

    if (affError) return [];

    const linkedProfileIds = (affiliates ?? [])
      .map((a: { profile_id: string | null }) => a.profile_id)
      .filter(Boolean) as string[];

    let query = supabase
      .from("profiles")
      .select("*")
      .eq("role", "affiliate")
      .order("created_at", { ascending: false });

    if (linkedProfileIds.length > 0) {
      query = query.not("id", "in", `(${linkedProfileIds.join(",")})`);
    }

    const { data, error } = await query;

    if (error) return [];
    return (data as Profile[]) ?? [];
  }

  async linkProfileToAffiliate(affiliateId: string, profileId: string): Promise<Affiliate | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .update({ profile_id: profileId })
      .eq("id", affiliateId)
      .select()
      .single();

    if (error) return null;
    return data as Affiliate;
  }

  async unlinkProfileFromAffiliate(affiliateId: string): Promise<Affiliate | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("affiliates")
      .update({ profile_id: null })
      .eq("id", affiliateId)
      .select()
      .single();

    if (error) return null;
    return data as Affiliate;
  }

  async unlinkCouponFromAffiliate(couponId: string): Promise<Coupon | null> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("coupons")
      .update({ affiliate_id: null })
      .eq("id", couponId)
      .select()
      .single();

    if (error) return null;
    return data as Coupon;
  }
}
