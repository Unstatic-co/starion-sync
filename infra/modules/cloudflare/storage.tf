resource "cloudflare_r2_bucket" "sync_data" {
  account_id = var.cf_account_id
  name       =  "${var.project}-${var.environment}-sync-data"
  # location   = "enam"
}
