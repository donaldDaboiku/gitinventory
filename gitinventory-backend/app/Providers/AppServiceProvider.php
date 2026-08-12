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
            Route::bind($parameter, function (string $value) use ($modelClass, $parameter) {
                $tenantId = Auth::user()?->tenant_id;
                abort_unless($tenantId, 401);

                /** @var class-string<Model> $modelClass */
                // Users are not BelongsToTenant-scoped (login looks up globally).
                if ($parameter === 'teamMember') {
                    return $modelClass::where('tenant_id', $tenantId)->findOrFail($value);
                }

                return $modelClass::findOrFail($value);
            });
        }
    }
}
