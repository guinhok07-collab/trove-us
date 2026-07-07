@echo off
title Trove Autopilot Painel
cd /d "C:\Users\Guimi\meusprojeto\techdrop-us"
set ADS_DASHBOARD_OPEN=1
node --env-file=.env.local scripts/ads-dashboard-server.mjs
pause
