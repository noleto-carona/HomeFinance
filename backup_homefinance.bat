@echo off
setlocal
set SRC=C:\Users\nolet\HomeFinance
set DEST=F:\backup_HomeFinance
if not exist "%DEST%" mkdir "%DEST%"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TS=%%i
set DEST_TS=%DEST%\%TS%
mkdir "%DEST_TS%"
robocopy "%SRC%" "%DEST_TS%" /MIR /FFT /Z /XA:SH /R:2 /W:5 /XJ
robocopy "%SRC%" "%DEST%\latest" /MIR /FFT /Z /XA:SH /R:2 /W:5 /XJ
endlocal
