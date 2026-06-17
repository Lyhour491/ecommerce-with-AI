<?php

return [
    'roles' => [
        'admin' => ['*'],

        'seller' => [
            'seller.access',
            'products.create',
            'products.update.own',
            'products.delete.own',
            'orders.view.seller',
            'orders.update.seller',
            'payouts.view.own',
            'payouts.create',
            'ai.use',
            'ai.product.generate',
        ],

        'customer' => [
            'cart.manage',
            'checkout.create',
            'orders.view.own',
            'reviews.create',
            'wishlist.manage',
            'seller.apply',
            'ai.use',
        ],
    ],
];
