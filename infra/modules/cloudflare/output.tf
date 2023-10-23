output "s3_endpoint" {
  value = "https://${cloudflare_r2_bucket.sync_data.account_id}.r2.cloudflarestorage.com"
}

output "s3_bucket_name" {
  value = cloudflare_r2_bucket.sync_data.name
}

output "s3_bucket_endpoint" {
  value = "https://${cloudflare_r2_bucket.sync_data.account_id}.r2.cloudflarestorage.com/${cloudflare_r2_bucket.sync_data.name}"
}
