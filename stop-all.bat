@echo off
for %%P in (5001 5002 5003 5500) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    echo Menghentikan PID %%a di port %%P
    taskkill /F /PID %%a >nul 2>&1
  )
)
echo Selesai.
