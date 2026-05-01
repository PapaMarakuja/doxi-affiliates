export interface SyncState {
  id: string;
  source: string;
  last_synced_at: string | null;
  synced_by_user_id: string | null;
  shopify_api_response_status: string | null;
}