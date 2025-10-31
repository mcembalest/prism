use screenshots::Screen;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_decorum::WebviewWindowExt;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIcon};
use tauri::menu::{MenuBuilder, MenuItemBuilder};

// Focused Window State Management
#[derive(Clone, Serialize, Deserialize, Debug)]
struct FocusedWindowInfo {
    owner_name: String,
    window_name: String,
    window_id: i64,
    process_id: i32,
}

struct AppState {
    focused_window: Mutex<Option<FocusedWindowInfo>>,
    selection_mode: Mutex<bool>,
    tray_icon: Mutex<Option<TrayIcon>>,
}

impl AppState {
    fn new() -> Self {
        Self {
            focused_window: Mutex::new(None),
            selection_mode: Mutex::new(false),
            tray_icon: Mutex::new(None),
        }
    }

    fn load_from_disk(app_handle: &tauri::AppHandle) -> Option<FocusedWindowInfo> {
        use std::fs;
        use std::path::PathBuf;

        let data_dir: PathBuf = app_handle.path().app_data_dir()
            .ok()?
            .join("focus_state.json");

        if let Ok(content) = fs::read_to_string(data_dir) {
            serde_json::from_str(&content).ok()
        } else {
            None
        }
    }

    fn save_to_disk(app_handle: &tauri::AppHandle, info: &FocusedWindowInfo) -> Result<(), String> {
        use std::fs;

        let data_dir = app_handle.path().app_data_dir()
            .map_err(|e| e.to_string())?;

        fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

        let file_path = data_dir.join("focus_state.json");
        let json = serde_json::to_string_pretty(info).map_err(|e| e.to_string())?;

        fs::write(file_path, json).map_err(|e| e.to_string())?;

        Ok(())
    }
}

// Helper to wait for a window to emit a ready event
async fn wait_for_window_ready(window: &WebviewWindow, event_name: &str) {
    use tauri::Listener;

    let (tx, rx) = tokio::sync::oneshot::channel();
    let mut tx_option = Some(tx);

    window.once(event_name, move |_event| {
        if let Some(tx) = tx_option.take() {
            let _ = tx.send(());
        }
    });

    // Wait for ready signal with 5 second timeout
    let _ = tokio::time::timeout(
        tokio::time::Duration::from_secs(5),
        rx
    ).await;
}

#[derive(Clone, Serialize)]
struct OverlayPayload {
    points: Vec<Point>,
    boxes: Vec<BoundingBox>,
    #[serde(rename = "walkthroughSteps")]
    walkthrough_steps: Option<u32>,
    #[serde(rename = "currentStep")]
    current_step: Option<u32>,
    instruction: Option<String>,
    caption: Option<String>,
    #[serde(rename = "isComplete")]
    is_complete: Option<bool>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BoundingBox {
    x_min: f64,
    y_min: f64,
    x_max: f64,
    y_max: f64,
}

#[tauri::command]
async fn take_screenshot() -> Result<String, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;

    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    let screen = &screens[0];
    let screenshot = screen.capture().map_err(|e| e.to_string())?;

    // Calculate left 3/4 of screen width
    let screen_width = screenshot.width();
    let screen_height = screenshot.height();
    let crop_width = (screen_width as f64 * 0.75) as u32;

    // Crop to left 3/4 of screen
    use screenshots::image::imageops;
    let cropped = imageops::crop_imm(
        &screenshot,
        0,              // x position
        0,              // y position
        crop_width,     // width (75% of screen)
        screen_height   // height (full height)
    );

    // Encode to PNG bytes
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    cropped
        .to_image()
        .write_to(&mut cursor, screenshots::image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let base64 = STANDARD.encode(&bytes);

    Ok(format!("data:image/png;base64,{}", base64))
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    // Close existing settings window if any
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.close();
    }

    let _window = WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("settings.html".into())
    )
    .title("Lighthouse Settings")
    .inner_size(560.0, 420.0)
    .resizable(true)
    .decorations(false)
    .transparent(true)
    .center()
    .focused(true)
    .always_on_top(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn open_screen_overlay(
    app: tauri::AppHandle,
    points: Vec<Point>,
    boxes: Vec<BoundingBox>,
    walkthrough_steps: Option<u32>,
    current_step: Option<u32>,
    instruction: Option<String>,
    caption: Option<String>,
    is_complete: Option<bool>,
) -> Result<(), String> {

    // Close existing overlay window if any
    if let Some(window) = app.get_webview_window("screen-overlay") {
        let _ = window.close();
    }

    // Get screen dimensions
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.get(0).ok_or("No screen found")?;

    let screen_width = screen.display_info.width as f64;
    let screen_height = screen.display_info.height as f64;

    // Overlay should cover left 3/4 of screen (matching screenshot dimensions)
    let overlay_width = screen_width * 0.75;

    // Create transparent overlay window covering left 3/4 of screen
    let window = WebviewWindowBuilder::new(
        &app,
        "screen-overlay",
        WebviewUrl::App("overlay.html".into())
    )
    .title("Screen Overlay")
    .inner_size(overlay_width, screen_height)
    .position(0.0, 0.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    // Make window click-through (ignore cursor events)
    let _ = window.set_ignore_cursor_events(true);

    // Set window level above popup menus (macOS only)
    #[cfg(target_os = "macos")]
    {
        let _ = window.set_window_level(102);
    }

    let payload = OverlayPayload {
        points,
        boxes,
        walkthrough_steps,
        current_step,
        instruction,
        caption,
        is_complete,
    };

    // Wait for window to be ready, then send data
    let window_clone = window.clone();
    tokio::spawn(async move {
        wait_for_window_ready(&window_clone, "overlay-ready").await;
        let _ = window_clone.emit("overlay-data", payload);
    });

    Ok(())
}

#[tauri::command]
async fn update_screen_overlay_data(
    app: tauri::AppHandle,
    points: Vec<Point>,
    boxes: Vec<BoundingBox>,
    walkthrough_steps: Option<u32>,
    current_step: Option<u32>,
    instruction: Option<String>,
    caption: Option<String>,
    is_complete: Option<bool>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screen-overlay") {
        let payload = OverlayPayload {
            points,
            boxes,
            walkthrough_steps,
            current_step,
            instruction,
            caption,
            is_complete,
        };
        window.emit("overlay-data", payload)
            .map_err(|e| format!("Failed to emit overlay-data: {:?}", e))?;

        Ok(())
    } else {
        Err("No overlay window exists. Use open_screen_overlay first.".to_string())
    }
}

#[tauri::command]
async fn close_screen_overlay(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screen-overlay") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Window Focus and Arrangement Commands
#[cfg(target_os = "macos")]
mod window_management {
    use super::*;

    pub fn get_all_windows() -> Result<Vec<FocusedWindowInfo>, String> {
        // First, check if we can access System Events (this will trigger permission prompt if needed)
        let permission_check = std::process::Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to get name of first process")
            .output()
            .map_err(|e| format!("Failed to check permissions: {}", e))?;

        if !permission_check.status.success() {
            let error_msg = String::from_utf8_lossy(&permission_check.stderr);
            return Err(format!("Accessibility permissions required. Please grant Lighthouse access in System Settings → Privacy & Security → Accessibility. Error: {}", error_msg));
        }

        // Use AppleScript to get window list - iterate through ALL windows for each process
        let script = r#"
            set output to ""
            tell application "System Events"
                set allProcesses to every process whose background only is false
                repeat with proc in allProcesses
                    set procName to name of proc
                    if procName is not "Lighthouse" then
                        set procID to unix id of proc
                        set winList to windows of proc
                        if (count of winList) > 0 then
                            set winIndex to 1
                            repeat with win in winList
                                try
                                    set winName to name of win
                                    set winID to procID * 1000 + winIndex
                                    set output to output & procName & "|" & winName & "|" & procID & "|" & winID & "\n"
                                    set winIndex to winIndex + 1
                                end try
                            end repeat
                        end if
                    end if
                end repeat
            end tell
            return output
        "#;

        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            println!("[Lighthouse] AppleScript stderr: {:?}", stderr);
        }

        if !output.status.success() {
            return Err(format!("AppleScript failed: {}", stderr));
        }

        let result = String::from_utf8_lossy(&output.stdout);
        println!("[Lighthouse] AppleScript output: {:?}", result);

        // Parse the AppleScript result - format is: app1|window1|pid1|winID1\napp2|window2|pid2|winID2\n...
        let mut windows = Vec::new();

        for line in result.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() == 4 {
                let owner_name = parts[0].trim().to_string();
                let window_name = parts[1].trim().to_string();
                let process_id = parts[2].trim().parse::<i32>().unwrap_or(0);
                let window_id = parts[3].trim().parse::<i64>().unwrap_or(0);

                println!("[Lighthouse] Found window: {} - {} (PID: {}, WinID: {})", owner_name, window_name, process_id, window_id);

                windows.push(FocusedWindowInfo {
                    owner_name,
                    window_name,
                    window_id,
                    process_id,
                });
            }
        }

        println!("[Lighthouse] Total windows found: {}", windows.len());
        Ok(windows)
    }

    pub fn arrange_windows(
        focused_window: &FocusedWindowInfo,
        _lighthouse_window: &WebviewWindow
    ) -> Result<(), String> {
        println!("[Lighthouse] Starting window arrangement for: {}", focused_window.owner_name);

        // Get screen dimensions
        let screens = Screen::all().map_err(|e| e.to_string())?;
        let screen = screens.get(0).ok_or("No screen found")?;

        let screen_width = screen.display_info.width as f64;
        let screen_height = screen.display_info.height as f64;

        println!("[Lighthouse] Screen dimensions: {}x{}", screen_width, screen_height);

        // Calculate dimensions
        let focused_width = screen_width * 0.75;
        let lighthouse_width = screen_width * 0.25;

        println!("[Lighthouse] Resizing Lighthouse window to {}x{} at position ({}, 0)", lighthouse_width, screen_height, focused_width);

        // Use AppleScript to move Lighthouse window (same approach that works for Chrome/Cursor)
        let lighthouse_script = format!(
            r#"
            tell application "System Events"
                tell process "Lighthouse"
                    tell window 1
                        set position to {{{}, 0}}
                        set size to {{{}, {}}}
                    end tell
                end tell
            end tell
            "#,
            focused_width as i32,
            lighthouse_width as i32,
            screen_height as i32
        );

        let lighthouse_output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&lighthouse_script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript for Lighthouse: {}", e))?;

        if !lighthouse_output.status.success() {
            let error = String::from_utf8_lossy(&lighthouse_output.stderr);
            println!("[Lighthouse] AppleScript error for Lighthouse window: {}", error);
        } else {
            println!("[Lighthouse] Lighthouse window repositioned via AppleScript");
        }

        // Position focused window (left 3/4)
        // Calculate window index from window_id (format: process_id * 1000 + window_index)
        let window_index = ((focused_window.window_id % 1000) as i32).max(1);
        println!("[Lighthouse] Positioning {} window #{} to {}x{}", focused_window.owner_name, window_index, focused_width as i32, screen_height as i32);

        let script = format!(
            r#"
            tell application "System Events"
                tell process "{}"
                    set frontmost to true
                    tell window {}
                        set position to {{0, 0}}
                        set size to {{{}, {}}}
                    end tell
                end tell
            end tell
            "#,
            focused_window.owner_name,
            window_index,
            focused_width as i32,
            screen_height as i32
        );

        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            println!("[Lighthouse] AppleScript error: {}", error);
            return Err(format!("Failed to position window: {}", error));
        }

        println!("[Lighthouse] Window arrangement completed successfully");
        Ok(())
    }
}

#[tauri::command]
#[cfg(target_os = "macos")]
async fn get_available_windows() -> Result<Vec<FocusedWindowInfo>, String> {
    window_management::get_all_windows()
}

#[tauri::command]
#[cfg(target_os = "macos")]
async fn arrange_windows(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    window_info: FocusedWindowInfo
) -> Result<(), String> {
    let lighthouse_window = app.get_webview_window("main")
        .ok_or("Could not find Lighthouse main window")?;

    window_management::arrange_windows(&window_info, &lighthouse_window)?;

    // Save to state and disk
    *state.focused_window.lock().unwrap() = Some(window_info.clone());
    AppState::save_to_disk(&app, &window_info)?;

    Ok(())
}

#[tauri::command]
async fn start_focus_selection_mode(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>
) -> Result<(), String> {
    *state.selection_mode.lock().unwrap() = true;
    app.emit("selection-mode-changed", true).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn stop_focus_selection_mode(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>
) -> Result<(), String> {
    *state.selection_mode.lock().unwrap() = false;
    app.emit("selection-mode-changed", false).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_focus_selection_mode(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.selection_mode.lock().unwrap())
}

#[tauri::command]
async fn get_focused_window(state: tauri::State<'_, AppState>) -> Result<Option<FocusedWindowInfo>, String> {
    Ok(state.focused_window.lock().unwrap().clone())
}

#[tauri::command]
async fn show_main_window(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        
        // If there's a saved focused window, automatically arrange windows
        #[cfg(target_os = "macos")]
        {
            let focused_window = state.focused_window.lock().unwrap().clone();
            if let Some(window_info) = focused_window {
                println!("[Lighthouse] Auto-arranging with saved window: {:?}", window_info);
                // Try to arrange windows, but don't fail if it doesn't work
                // (e.g., if the window no longer exists)
                if let Err(e) = window_management::arrange_windows(&window_info, &window) {
                    println!("[Lighthouse] Failed to auto-arrange: {}", e);
                    // Clear the saved state since the window probably doesn't exist anymore
                    *state.focused_window.lock().unwrap() = None;
                    // Optionally delete from disk
                    let _ = std::fs::remove_file(
                        app.path().app_data_dir()
                            .ok()
                            .map(|d| d.join("focus_state.json"))
                            .unwrap_or_default()
                    );
                }
            }
        }
        
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .manage(AppState::new())
    .invoke_handler(tauri::generate_handler![
      take_screenshot,
      open_settings_window,
      open_screen_overlay,
      update_screen_overlay_data,
      close_screen_overlay,
      get_available_windows,
      arrange_windows,
      start_focus_selection_mode,
      stop_focus_selection_mode,
      get_focus_selection_mode,
      get_focused_window,
      show_main_window
    ])
    .setup(|app| {
      // Hide Dock icon on macOS
      #[cfg(target_os = "macos")]
      app.set_activation_policy(tauri::ActivationPolicy::Accessory);

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Register global shortcut for Proceed button (Cmd+Enter)
      let handle = app.handle().clone();
      app.global_shortcut().on_shortcut("CmdOrCtrl+Enter", move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
          let _ = handle.emit("proceed-shortcut-triggered", ());
        }
      })?;
      
      #[cfg(target_os = "macos")]
      {
        use tauri::menu::SubmenuBuilder;
        
        // Create application menu (for when app is visible)
        let settings = MenuItemBuilder::new("Settings…")
          .id("settings")
          .accelerator("Cmd+,")
          .build(app)?;
        let app_menu = SubmenuBuilder::new(app, "Lighthouse")
          .item(&settings)
          .build()?;
        let menu = MenuBuilder::new(app)
          .item(&app_menu)
          .build()?;

        app.set_menu(menu)?;

        app.on_menu_event(|app, event| {
          if event.id() == "settings" {
            let handle = app.clone();
            tauri::async_runtime::spawn(async move {
              let _ = open_settings_window(handle).await;
            });
          }
        });

        // ========== TRAY ICON INITIALIZATION WITH DIAGNOSTICS ==========
        println!("[Lighthouse] ====== System Information ======");
        println!("[Lighthouse] macOS version: {:?}", std::env::var("OSTYPE").unwrap_or_else(|_| "unknown".to_string()));
        println!("[Lighthouse] Architecture: {}", std::env::consts::ARCH);
        println!("[Lighthouse] OS: {}", std::env::consts::OS);
        println!("[Lighthouse] ================================");

        println!("[Lighthouse] Attempting to create system tray icon...");

        // Try to get the default window icon with detailed logging
        let icon_result = app.default_window_icon();
        let icon = match icon_result {
            Some(icon) => {
                println!("[Lighthouse] ✓ Default window icon loaded successfully");
                icon.clone()
            }
            None => {
                eprintln!("[Lighthouse] ✗ ERROR: Default window icon not available");
                eprintln!("[Lighthouse] ✗ ERROR: Cannot create tray icon without an icon");
                eprintln!("[Lighthouse] ✗ This usually means:");
                eprintln!("[Lighthouse]   - Icon files are missing from the bundle");
                eprintln!("[Lighthouse]   - Icon files are corrupted");
                eprintln!("[Lighthouse]   - The app bundle was not built correctly");
                eprintln!("[Lighthouse] ✗ Please rebuild the app with: cargo build --release");
                return Err("Failed to load tray icon: no default window icon available".into());
            }
        };

        // Build tray icon with error handling
        println!("[Lighthouse] Building tray icon...");
        let tray_result = TrayIconBuilder::new()
          .icon(icon)
          .icon_as_template(true)
          .tooltip("Lighthouse")
          .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event {
              let app_handle = tray.app_handle().clone();
              tauri::async_runtime::spawn(async move {
                let state = app_handle.state::<AppState>();
                let app_clone = app_handle.clone();
                let _ = show_main_window(app_clone, state).await;
              });
            }
          })
          .build(app);

        match tray_result {
            Ok(tray) => {
                // Keep tray icon alive for the lifetime of the app
                let state = app.state::<AppState>();
                *state.tray_icon.lock().unwrap() = Some(tray);
                println!("[Lighthouse] ✓ System tray icon created successfully!");
                println!("[Lighthouse] ✓ App should be visible in menu bar");
            }
            Err(e) => {
                eprintln!("[Lighthouse] ✗ ERROR: Failed to create tray icon: {:?}", e);
                eprintln!("[Lighthouse] ✗ The app will be invisible without a tray icon!");
                return Err(format!("Failed to build tray icon: {:?}", e).into());
            }
        }
        println!("[Lighthouse] ========================================");

        // Load saved window state but don't auto-arrange
        let app_handle = app.handle().clone();
        let state = app.state::<AppState>();
        if let Some(saved_window) = AppState::load_from_disk(&app_handle) {
          println!("[Lighthouse] Found saved window: {:?}", saved_window);
          *state.focused_window.lock().unwrap() = Some(saved_window.clone());
        }

        // Set up window close handler to hide instead of exit
        if let Some(main_window) = app.get_webview_window("main") {
          let window_clone = main_window.clone();
          main_window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
              // Prevent the window from closing and hide it instead
              api.prevent_close();
              let _ = window_clone.hide();
            }
          });
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
