<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['message' => 'Restaurante TxTech API', 'version' => '1.0.0']);
});
