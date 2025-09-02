@echo off
echo Setting up n8n Job Extraction System...

echo.
echo 1. Starting Docker containers...
docker-compose up -d

echo.
echo 2. Waiting for services to start...
timeout /t 30

echo.
echo 3. Downloading Ollama models (this may take a few minutes)...
docker exec job-tracker-ollama ollama pull llama3.2:3b
docker exec job-tracker-ollama ollama pull phi3:mini

echo.
echo 4. Setup complete!
echo.
echo Access n8n at: http://localhost:5678
echo Username: admin
echo Password: password123
echo.
echo Ollama API: http://localhost:11434
echo.
echo Press any key to continue...
pause