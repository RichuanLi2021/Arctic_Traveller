@echo off
echo Setting up NASA SMS Service...
echo.

echo Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo.
echo Dependencies installed successfully!
echo.
echo Starting SMS service on http://localhost:5000
echo Press Ctrl+C to stop the service
echo.

python sms_service.py