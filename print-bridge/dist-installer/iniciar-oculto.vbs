Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\PrintBridge"
WshShell.Run "print-bridge.exe", 0, False
