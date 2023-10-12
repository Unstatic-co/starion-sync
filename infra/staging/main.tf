
module "flyio" {
  source = "./flyio"
  providers = {
    fly = fly
  }

  region           = var.fly_region
  api_token        = var.fly_api_token
  redis_password   = var.redis_password
  mongodb_user     = var.mongodb_user
  mongodb_password = var.mongodb_password
}
