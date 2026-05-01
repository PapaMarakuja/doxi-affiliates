export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: "admin" | "affiliate";
  created_at: string;
  pix_key: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}