# System Tray Icon Debugging Guide

## Problem
The Lighthouse system tray icon appears on one machine but not on another.

## Root Cause
The tray icon creation was failing silently due to:
1. No error logging around icon loading and tray creation
2. Use of `.unwrap()` which could panic if icon wasn't available
3. App using `ActivationPolicy::Accessory` (menu bar only, no Dock icon)
4. When tray failed, app became completely invisible

## What We Fixed

### 1. Added Comprehensive Logging
The app now logs:
- System information (macOS version, architecture, OS)
- Icon loading attempts (both default and fallback)
- Tray creation success/failure
- Clear error messages with ✓, ⚠, and ✗ symbols

### 2. Improved Error Handling
- Replaced `.unwrap()` with proper `match` statements
- Added fallback icon loading from `icons/icon.icns`
- Returns clear errors instead of silent failures
- App now fails fast with descriptive error if tray can't be created

### 3. Added Fallback Icon Loading
If the default window icon isn't available:
1. Attempts to load `icons/icon.icns` from the bundle
2. Logs warning and success/failure
3. Returns error with guidance if both fail

## Testing on Your Colleague's Machine

### Step 1: Rebuild the App
From the project root:
```bash
cd src-tauri
cargo build --release
```

### Step 2: Run and Check Console Output
Run the app and look for these log messages:

**Success looks like:**
```
[Lighthouse] ====== System Information ======
[Lighthouse] macOS version: "darwin"
[Lighthouse] Architecture: aarch64
[Lighthouse] OS: macos
[Lighthouse] ================================
[Lighthouse] Attempting to create system tray icon...
[Lighthouse] ✓ Default window icon loaded successfully
[Lighthouse] Building tray icon...
[Lighthouse] ✓ System tray icon created successfully!
[Lighthouse] ✓ App should be visible in menu bar
[Lighthouse] ========================================
```

**Failure looks like:**
```
[Lighthouse] ⚠ WARNING: Default window icon not available, attempting fallback...
[Lighthouse] ✗ ERROR: Failed to load fallback icon: ...
[Lighthouse] ✗ ERROR: Cannot create tray icon without an icon file
[Lighthouse] ✗ Please ensure icons/icon.icns exists in the bundle
```

### Step 3: Run from Terminal to See Logs
To see all console output:

```bash
# For development build
cd src-tauri
cargo run

# For release build (after building)
./target/release/lighthouse
```

### Step 4: Check macOS Console App
If running the .app bundle directly:
1. Open Console.app (Applications → Utilities → Console)
2. Search for "Lighthouse"
3. Look for the log messages above
4. Check for any crash reports

### Step 5: Verify Icon Files
Check that icon files exist in the bundle:

```bash
# If you have a .app bundle
ls -lh Lighthouse.app/Contents/Resources/icons/

# Should see:
# - icon.icns (~285KB)
# - 32x32.png
# - 128x128.png
# - 128x128@2x.png
```

If icons are missing, the build process might not be copying them correctly.

### Step 6: Compare System Environments
Run on BOTH machines and compare:

```bash
# Check macOS version
sw_vers

# Check architecture
uname -m

# Check if running under Rosetta (Apple Silicon only)
sysctl sysctl.proc_translated
```

**Important differences to note:**
- macOS version (Ventura vs Sonoma vs Sequoia)
- Architecture (arm64 vs x86_64)
- Running under Rosetta translation

### Step 7: Check Security Settings
On the colleague's machine:

1. **System Settings → Privacy & Security → Accessibility**
   - Is Lighthouse listed?
   - Is it enabled?

2. **Check if app is quarantined:**
   ```bash
   xattr -l Lighthouse.app
   # If you see "com.apple.quarantine", the app is quarantined

   # To remove quarantine (for testing only):
   xattr -d com.apple.quarantine Lighthouse.app
   ```

3. **Check Gatekeeper:**
   ```bash
   spctl --assess --verbose Lighthouse.app
   ```

## Common Issues & Solutions

### Issue 1: Icon File Missing
**Symptom:** Error log shows "Failed to load fallback icon"

**Solution:**
```bash
# Verify icons exist in source
ls -lh src-tauri/icons/

# Rebuild to ensure icons are bundled
cd src-tauri
cargo clean
cargo build --release
```

### Issue 2: Different macOS Versions
**Symptom:** Works on macOS 14 but not macOS 13 (or vice versa)

**Solution:** Check Tauri version compatibility. Current version (2.8.5) should support macOS 11+.

### Issue 3: Architecture Mismatch
**Symptom:** Built on Apple Silicon, doesn't work on Intel Mac

**Solution:** Build universal binary:
```bash
cd src-tauri
rustup target add x86_64-apple-darwin
cargo build --release --target x86_64-apple-darwin
# Or use cargo-bundle to create universal binary
```

### Issue 4: Permissions Issue
**Symptom:** App launches but tray doesn't appear, no error logs

**Solution:**
1. Grant Accessibility permissions (System Settings → Privacy & Security)
2. Remove and re-add app to permissions list
3. Restart Mac

### Issue 5: Corrupted Bundle
**Symptom:** App worked before, stopped working after copy/transfer

**Solution:**
```bash
# Remove quarantine
xattr -dr com.apple.quarantine Lighthouse.app

# Verify code signing
codesign --verify --verbose Lighthouse.app
```

## What the Logs Tell You

| Log Message | Meaning | Action |
|-------------|---------|--------|
| ✓ Default window icon loaded | Icon found in bundle | Normal operation |
| ⚠ WARNING: Default window icon not available | Trying fallback | Check bundle structure |
| ✓ Fallback icon loaded | Fallback worked | Normal operation (but investigate why default failed) |
| ✗ Failed to load fallback icon | No icon available | Icon files missing from bundle |
| ✓ System tray icon created | Success! | Tray should be visible |
| ✗ Failed to create tray icon | Tray creation failed | Check error details and system compatibility |

## Quick Diagnostic Checklist

Run through this list on the colleague's machine:

- [ ] Run app from terminal to see console output
- [ ] Check logs show system information section
- [ ] Verify icon file exists: `ls src-tauri/icons/icon.icns`
- [ ] Compare macOS version with working machine
- [ ] Compare architecture (Intel vs Apple Silicon)
- [ ] Check Console.app for crash reports
- [ ] Verify Accessibility permissions granted
- [ ] Check if app is quarantined (`xattr -l`)
- [ ] Try removing quarantine if present
- [ ] Rebuild app with `cargo clean && cargo build`
- [ ] Compare log output between working and non-working machines

## Getting More Help

If the issue persists after trying the above:

1. **Capture full logs:** Run from terminal and save all output
   ```bash
   cargo run 2>&1 | tee lighthouse-debug.log
   ```

2. **Compare environments:** Document differences between working and non-working machines

3. **Check Tauri issues:** Search for similar issues at https://github.com/tauri-apps/tauri/issues

4. **System information to include:**
   - macOS version (`sw_vers`)
   - Architecture (`uname -m`)
   - Tauri version (in `Cargo.toml`)
   - Rust version (`rustc --version`)
   - Full console output from app startup

## Code Changes Summary

**File:** `src-tauri/src/lib.rs`
**Lines:** 631-698

**Changes:**
- Added system environment logging
- Replaced `.unwrap()` with `match` statement for icon loading
- Added fallback icon loading from `icons/icon.icns`
- Added comprehensive logging with clear success/failure indicators
- Added error handling for tray creation
- Returns descriptive errors instead of panicking

**Result:** App now fails fast with clear error messages instead of failing silently, making it easy to diagnose tray icon issues.
