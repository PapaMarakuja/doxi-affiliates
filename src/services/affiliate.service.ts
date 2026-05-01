import { AffiliateRepository } from "@/src/repositories/affiliate.repository";
import type {
  Affiliate,
  Coupon,
} from "@/src/types";

export class AffiliateService {
  private readonly affiliateRepo: AffiliateRepository;

  constructor() {
    this.affiliateRepo = new AffiliateRepository();
  }

  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    const profile = await this.affiliateRepo.getProfileByUserId(userId);
    if (!profile) return null;

    return this.affiliateRepo.getAffiliateByProfileId(profile.id);
  }

  async getAffiliateById(id: string): Promise<Affiliate | null> {
    return this.affiliateRepo.getAffiliateById(id);
  }

  async updateAffiliate(id: string, updates: Partial<Affiliate>): Promise<Affiliate | null> {
    return this.affiliateRepo.updateAffiliate(id, updates);
  }

  async createAffiliate(affiliate: Omit<Affiliate, "id" | "created_at">): Promise<Affiliate | null> {
    return this.affiliateRepo.createAffiliate(affiliate);
  }

  async getAffiliateCoupons(id: string): Promise<Coupon[]> {
    return this.affiliateRepo.getActiveCouponsByAffiliateId(id);
  }

  async getPaginatedAffiliates(
    page: number = 1,
    limit: number = 10,
    searchName?: string,
    orderBy: string = "created_at",
    orderDesc: boolean = true
  ): Promise<{ data: Affiliate[]; count: number }> {
    return this.affiliateRepo.getPaginatedAffiliates(
      page,
      limit,
      searchName,
      orderBy,
      orderDesc
    );
  }

  async deleteAffiliate(id: string): Promise<boolean> {
    return this.affiliateRepo.deleteAffiliate(id);
  }
}
