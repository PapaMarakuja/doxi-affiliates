export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: "admin" | "affiliate";
  created_at: string;
  temp_password: string | null;
}