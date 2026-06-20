<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dispute extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'user_id',
        'reason',
        'statement',
        'amount',
        'status',
        'seller_requested_refund',
        'seller_refund_requested_at',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'seller_requested_refund' => 'boolean',
        'seller_refund_requested_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
