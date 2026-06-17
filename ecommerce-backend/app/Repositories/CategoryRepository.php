<?php

namespace App\Repositories;

use App\Models\Category;
use Illuminate\Support\Collection;

class CategoryRepository
{
    public function names(): array
    {
        return Category::query()->orderBy('name')->pluck('name')->all();
    }

    public function all(): Collection
    {
        return Category::query()->orderBy('name')->get();
    }
}
