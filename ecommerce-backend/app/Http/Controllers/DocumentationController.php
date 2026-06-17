<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class DocumentationController extends Controller
{
    public function swagger()
    {
        return response()->view('docs.swagger', [
            'specUrl' => url('/docs/openapi.yaml'),
        ]);
    }

    public function openApi(Request $request)
    {
        $path = resource_path('docs/openapi.yaml');

        abort_unless(File::exists($path), 404);

        $yaml = File::get($path);
        $yaml = str_replace('{{API_BASE_URL}}', $request->getSchemeAndHttpHost() . '/api', $yaml);

        return response($yaml, 200, [
            'Content-Type' => 'application/yaml; charset=UTF-8',
            'Cache-Control' => 'no-store',
        ]);
    }
}
