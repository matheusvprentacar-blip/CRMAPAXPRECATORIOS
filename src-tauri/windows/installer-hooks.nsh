!macro NSIS_HOOK_PREINSTALL
  Call RemoveLegacyCrmApxInstalls
!macroend

Function TryUninstallHKCU
  ReadRegStr $R2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
  StrCmp $R2 "" done_hkcu

  StrCmp $R2 "CRMAPAXPRECATORIOS" do_uninstall_hkcu
  StrCpy $R3 $R2 14
  StrCmp $R3 "CRM APAX Precat" do_uninstall_hkcu done_hkcu

do_uninstall_hkcu:
  ReadRegStr $R4 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "QuietUninstallString"
  StrCmp $R4 "" 0 run_quiet_hkcu

  ReadRegStr $R4 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "UninstallString"
  StrCmp $R4 "" done_hkcu

  StrCpy $R5 $R4 7
  StrCmp $R5 "MsiExec" run_msi_hkcu
  StrCmp $R5 "msiexec" run_msi_hkcu

  ExecWait '$R4 /S'
  Goto done_hkcu

run_msi_hkcu:
  StrCpy $R6 $R1 1
  StrCmp $R6 "{" 0 run_quiet_hkcu
  ExecWait 'msiexec.exe /x $R1 /qn /norestart'
  Goto done_hkcu

run_quiet_hkcu:
  ExecWait '$R4'

done_hkcu:
FunctionEnd

Function TryUninstallHKLM
  ReadRegStr $R2 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
  StrCmp $R2 "" done_hklm

  StrCmp $R2 "CRMAPAXPRECATORIOS" do_uninstall_hklm
  StrCpy $R3 $R2 14
  StrCmp $R3 "CRM APAX Precat" do_uninstall_hklm done_hklm

do_uninstall_hklm:
  ReadRegStr $R4 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "QuietUninstallString"
  StrCmp $R4 "" 0 run_quiet_hklm

  ReadRegStr $R4 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "UninstallString"
  StrCmp $R4 "" done_hklm

  StrCpy $R5 $R4 7
  StrCmp $R5 "MsiExec" run_msi_hklm
  StrCmp $R5 "msiexec" run_msi_hklm

  ExecWait '$R4 /S'
  Goto done_hklm

run_msi_hklm:
  StrCpy $R6 $R1 1
  StrCmp $R6 "{" 0 run_quiet_hklm
  ExecWait 'msiexec.exe /x $R1 /qn /norestart'
  Goto done_hklm

run_quiet_hklm:
  ExecWait '$R4'

done_hklm:
FunctionEnd

Function RemoveLegacyCrmApxInstalls
  StrCpy $R0 0
loop_hkcu:
  EnumRegKey $R1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" done_hkcu_loop
  Call TryUninstallHKCU
  IntOp $R0 $R0 + 1
  Goto loop_hkcu
done_hkcu_loop:

  SetRegView 64
  StrCpy $R0 0
loop_hklm_64:
  EnumRegKey $R1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" done_hklm_64
  Call TryUninstallHKLM
  IntOp $R0 $R0 + 1
  Goto loop_hklm_64
done_hklm_64:

  SetRegView 32
  StrCpy $R0 0
loop_hklm_32:
  EnumRegKey $R1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" done_hklm_32
  Call TryUninstallHKLM
  IntOp $R0 $R0 + 1
  Goto loop_hklm_32
done_hklm_32:
  SetRegView 64
FunctionEnd
