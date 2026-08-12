#!/bin/sh
set -e

cd /var/www/html

if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:GENERATE_WITH_php_artisan_key_generate" ]; then
  echo "ERROR: APP_KEY is missing or still a placeholder. Generate one and set it in .env"
  echo "  cd gitinventory-backend && php artisan key:generate --show"
  exit 1
fi

ROLE="${CONTAINER_ROLE:-backend}"

case "$ROLE" in
  backend)
    php artisan config:clear
    php artisan migrate --force
    php artisan db:seed --class=RolesAndPermissionsSeeder --force
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    exec php artisan serve --host=0.0.0.0 --port=8000
    ;;
  queue)
    exec php artisan queue:work --sleep=1 --tries=3 --timeout=90
    ;;
  scheduler)
    exec php artisan schedule:work
    ;;
  *)
    echo "Unknown CONTAINER_ROLE: $ROLE"
    exit 1
    ;;
esac
