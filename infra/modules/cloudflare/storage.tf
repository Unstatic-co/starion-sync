resource "cloudflare_r2_bucket" "sync_data" {
  account_id = var.cf_account_id
  name       =  local.is_production ? "${var.project}-${var.environment}-sync-data" : "${var.project}-${var.environment}-sync-data-new"
  # location   = "enam"
}
