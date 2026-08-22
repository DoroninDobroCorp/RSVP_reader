# Active repository mission

The active task is the Android R5 recovery mission in:

`ANDROID_R5_RECOVERY_MISSION.md`

Work only through SSH on `serverforvovka` in `/srv/hummingread`, branch:

`mission/android-r5-recovery-20260814`

Read the mission completely before changing code. The branch starts from the
preserved interrupted R4 checkpoint
`8e91d5bcaa96a519de2866240b2f66d08da1738e`. Preserve useful hermetic-build,
toolchain, verifier, package, website, extension, iOS, and Android product work,
but do not trust the unfinished Android QA script or any R2/R3/R4 runtime
evidence.

The priority is truthful reproducibility: fix the clean-checkout reporter,
remove manufactured emulator success, stabilize the two dedicated AVDs, execute
real Android-system boundaries, and produce fresh SHA-bound evidence. CDP may
inspect app state but may not substitute for SAF, DocumentsUI, Sharesheet,
system Back, confirmation UI, airplane mode, rotation, process death, upgrade,
KeepAwake, or haptic actions.

Continue autonomously through implementation, a clean remote-source-SHA build,
phone/tablet QA, evidence validation, logical commits, and final push. If a
required system flow cannot be executed, leave it FAIL or BLOCKED with raw
evidence; never invent or default to PASSED.

Do not touch `/srv/RSVP_reader`, deploy, merge, publish, production-sign, create
a PR, use paid services, trigger GitHub-hosted Actions, force-push, or modify the
forensic checkpoint branch.
