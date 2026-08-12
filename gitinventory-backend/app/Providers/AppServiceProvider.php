<?php

namespace App\Providers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->registerTenantScopedRouteBindings();
    }

    private function registerTenantScopedRouteBindings(): void
    {
        $models = [
            'product'  => Product::class,
            'category' => Category::class,
            'customer' => Customer::class,
            'supplier' => Supplier::class,
            'branch'   => Branch::class,
            'sale'     => Sale::class,
            'purchase' => Purchase::class,
            'teamMember' => User::class,
        ];

        foreach ($models as $parameter => $modelClass) {
            Route::bind($parameter, function (string $value) use ($modelClass) {
                $tenantId = auth::user()?->tenant_id;
                abort_unless($tenantId, 401);

                /** @var class-string<Model> $modelClass */
                return $modelClass::where('tenant_id', $tenantId)->findOrFail($value);
            });
        }
    }
}
