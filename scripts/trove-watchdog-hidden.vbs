' Inicia o watchdog Trove em segundo plano (sem janela)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\Guimi\meusprojeto\techdrop-us"
sh.Run "node --env-file=.env.local scripts\ads-dashboard-watchdog.mjs", 0, False
