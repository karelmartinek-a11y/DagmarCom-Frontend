@echo off
set  REPO=C:\github\dagmarcom-frontend
call %REPO%\venv\Scripts\activate.bat
pushd %REPO%
python -m http.server 5174
popd
