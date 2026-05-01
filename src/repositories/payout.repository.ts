import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { Payout, PayoutSummary } from "@/src/types/payout";

export class PayoutRepository {
  async getPayouts(filters?: { affiliateId?: string; status?: string }): Promise<Payout[]> {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("payouts")
      .select("*, affiliates(*)")
      .order("created_at", { ascending: false });

    if (filters?.affiliateId) {
      query = query.eq("affiliate_id", filters.affiliateId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data as Payout[]) ?? [];
  }

  async getPayoutSummary(): Promise<PayoutSummary> {
    const supabase = await createSupabaseServerClient();
    
    // Get all payouts
    const { data: payouts, error: payoutError } = await supabase
      .from("payouts")
      .select("amount, status");

    if (payoutError) throw new Error("Falha ao buscar resumo de pagamentos");

    const totalPaid = (payouts || [])
      .filter(p => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPending = (payouts || [])
      .filter(p => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Note: pending_commission and pending_achievements need a more complex calculation 
    // involving orders and achievements. For simplicity in the summary card, 
    // we'll return the total pending payouts for now, or 0 if they are not tracked separately here.
    
    return {
      total_paid: totalPaid,
      total_pending: totalPending,
      pending_commission: 0, // Will be filled by the API logic if needed
      pending_achievements: 0  // Will be filled by the API logic if needed
    };
  }

  async createPayout(payout: Omit<Payout, "id" | "created_at">): Promise<Payout | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("payouts")
      .insert([payout])
      .select()
      .single();

    if (error) {
      console.error("Error creating payout:", error);
      return null;
    }
    return data as Payout;
  }

  async updatePayoutStatus(id: string, status: Payout["status"]): Promise<Payout | null> {
    const supabase = await createSupabaseServerClient();
    const updates: Partial<Payout> = { status };
    if (status === "paid") {
      updates.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("payouts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return null;
    return data as Payout;
  }
}
