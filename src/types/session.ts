export interface SessionPayload {
  userId: string;
  affiliateId: string;
  role: "admin" | "affiliate";
  expiresAt: Date;
}
