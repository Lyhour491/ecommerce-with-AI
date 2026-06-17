<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MarketAI API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        :root {
            color-scheme: light;
            --ink: #0f172a;
            --muted: #475569;
            --line: #dbe3ef;
            --blue: #2563eb;
            --bg: #f6f8fb;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: var(--bg);
            color: var(--ink);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .docs-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 22px 32px;
            border-bottom: 1px solid var(--line);
            background: #ffffff;
        }

        .docs-header h1 {
            margin: 0;
            font-size: 24px;
            line-height: 1.2;
        }

        .docs-header p {
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 14px;
        }

        .docs-header a {
            display: inline-flex;
            align-items: center;
            min-height: 40px;
            padding: 0 14px;
            border: 1px solid var(--line);
            border-radius: 8px;
            color: var(--blue);
            background: #ffffff;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
        }

        #swagger-ui {
            max-width: 1280px;
            margin: 0 auto;
            padding: 18px 20px 40px;
        }

        .swagger-ui .topbar {
            display: none;
        }

        .swagger-ui .info {
            margin: 18px 0;
        }

        .swagger-ui .scheme-container {
            border-radius: 8px;
            box-shadow: none;
            border: 1px solid var(--line);
        }

        @media (max-width: 720px) {
            .docs-header {
                align-items: flex-start;
                flex-direction: column;
                padding: 18px;
            }

            #swagger-ui {
                padding: 12px 8px 28px;
            }
        }
    </style>
</head>
<body>
    <header class="docs-header">
        <div>
            <h1>MarketAI API Documentation</h1>
            <p>Use Authorize with a Laravel Sanctum bearer token for protected routes.</p>
        </div>
        <a href="{{ $specUrl }}">OpenAPI YAML</a>
    </header>

    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.addEventListener('load', function () {
            window.ui = SwaggerUIBundle({
                url: @json($specUrl),
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                layout: 'BaseLayout',
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: 'none',
                filter: true
            });
        });
    </script>
</body>
</html>
