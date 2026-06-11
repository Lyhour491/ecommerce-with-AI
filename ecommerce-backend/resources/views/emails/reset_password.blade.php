<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f7fb;
            color: #334155;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            width: 100% !important;
        }
        .wrapper {
            width: 100%;
            background-color: #f4f7fb;
            padding: 40px 0;
        }
        .container {
            max-width: 570px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #08334f, #075cc8);
            padding: 30px;
            text-align: center;
        }
        .header a {
            color: #ffffff;
            font-size: 24px;
            font-weight: 800;
            text-decoration: none;
            letter-spacing: -0.02em;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 20px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .text {
            font-size: 16px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 30px;
        }
        .button-container {
            text-align: center;
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background-color: #075cc8;
            color: #ffffff !important;
            font-size: 16px;
            font-weight: 700;
            text-decoration: none;
            padding: 14px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 14px rgba(7, 92, 200, 0.25);
            transition: all 0.2s ease;
        }
        .disclaimer {
            font-size: 14px;
            line-height: 1.5;
            color: #64748b;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
            margin-bottom: 20px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            font-size: 13px;
            color: #94a3b8;
            margin: 0;
        }
        .url-break {
            word-break: break-all;
            color: #075cc8;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <a href="http://localhost:5173/">ProShop</a>
            </div>
            <div class="content">
                <h1 class="greeting">Hello {{ $name }},</h1>
                <p class="text">
                    You are receiving this email because we received a password reset request for your account. Click the button below to choose a new password:
                </p>
                <div class="button-container">
                    <a href="{{ $resetUrl }}" class="button" target="_blank">Reset Password</a>
                </div>
                <p class="text" style="font-size: 14px; color: #64748b;">
                    This password reset link will expire in 60 minutes. If you did not request a password reset, no further action is required.
                </p>
                <div class="disclaimer">
                    If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:
                    <br>
                    <a href="{{ $resetUrl }}" class="url-break" target="_blank">{{ $resetUrl }}</a>
                </div>
            </div>
            <div class="footer">
                <p>&copy; {{ date('Y') }} ProShop. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
