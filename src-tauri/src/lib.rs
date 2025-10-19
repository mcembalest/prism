use screenshots::Screen;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Deserialize, Serialize};


struct WindowHide<'a> {
    window: &'a tauri::Window,
    original_opacity: f64,
}

#[cfg(target_os = "macos")]
fn set_window_alpha(window: &tauri::Window, alpha: f64) -> Result<(), String> {
    use cocoa::appkit::NSWindow;
    use cocoa::base::id;
    
    unsafe {
        let ns_window = window.ns_window().map_err(|e| e.to_string())? as id;
        NSWindow::setAlphaValue_(ns_window, alpha);
        Ok(())
    }
}

impl<'a> WindowHide<'a> {
    async fn new(window: &'a tauri::Window) -> Result<Self, String> {
        let original_opacity = 1.0;
        let countdown_steps = vec![0.5, 0.0];
        let step_duration = tokio::time::Duration::from_millis(80);
        for opacity in countdown_steps {
            set_window_alpha(window, opacity)?;
            tokio::time::sleep(step_duration).await;
        }        
        window.hide().map_err(|e| e.to_string())?;
        Ok(Self { window, original_opacity })
    }
    
    async fn restore(&self) {
        let _ = self.window.show();
        let fadein_steps = vec![0.5, 1.0];
        let step_duration = tokio::time::Duration::from_millis(40);
        for opacity in fadein_steps {
            let _ = set_window_alpha(self.window, opacity);
            tokio::time::sleep(step_duration).await;
        }
        let _ = set_window_alpha(self.window, self.original_opacity);
    }
}

#[derive(Clone, Serialize)]
struct FullscreenPayload {
    image: String,
    points: Vec<Point>,
    boxes: Vec<BoundingBox>,
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
    #[serde(rename = "isComplete")]
    is_complete: Option<bool>,
}

#[derive(Clone, Serialize, Deserialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Serialize, Deserialize)]
struct BoundingBox {
    x_min: f64,
    y_min: f64,
    x_max: f64,
    y_max: f64,
}

#[tauri::command]
async fn take_screenshot(window: tauri::Window) -> Result<String, String> {
    // Gradually fade out the window with countdown effect
    let hide = WindowHide::new(&window).await?;

    // Small delay to ensure window is completely hidden and screen settles
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    let screens = Screen::all().map_err(|e| e.to_string())?;

    if screens.is_empty() {
        return Err("No screens found".to_string());
    }

    let screen = &screens[0];
    let screenshot = screen.capture().map_err(|e| e.to_string())?;

    // Encode to PNG bytes
    let mut bytes: Vec<u8> = Vec::new();
    // write_to expects a Write; wrap our Vec in a Cursor
    let mut cursor = std::io::Cursor::new(&mut bytes);
    screenshot
        .write_to(&mut cursor, screenshots::image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let base64 = STANDARD.encode(&bytes);
    
    // Gradually fade the window back in
    hide.restore().await;
    
    Ok(format!("data:image/png;base64,{}", base64))
}

#[tauri::command]
async fn open_fullscreen_viewer(
    app: tauri::AppHandle,
    image: String,
    points: Vec<Point>,
    boxes: Vec<BoundingBox>,
) -> Result<(), String> {
    use tauri::Listener;

    // Close existing viewer window if any
    if let Some(window) = app.get_webview_window("image-viewer") {
        let _ = window.close();
    }

    // Get screen dimensions for sizing
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.get(0).ok_or("No screen found")?;

    let screen_width = screen.display_info.width as f64;
    let screen_height = screen.display_info.height as f64;

    // Use 80% of screen size for the window
    let window_width = screen_width * 0.8;
    let window_height = screen_height * 0.8;

    // Create centered window
    let window = WebviewWindowBuilder::new(
        &app,
        "image-viewer",
        WebviewUrl::App("fullscreen.html".into())
    )
    .title("Image Viewer")
    .inner_size(window_width, window_height)
    .resizable(true)
    .center()
    .focused(true)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    // Clone data for the async block
    let window_clone = window.clone();
    let payload = FullscreenPayload { image, points, boxes };

    // Listen for the "viewer-ready" event from the window
    let (tx, rx) = tokio::sync::oneshot::channel();
    let mut tx_option = Some(tx);

    window.once("viewer-ready", move |_event| {
        if let Some(tx) = tx_option.take() {
            let _ = tx.send(());
        }
    });

    // Spawn a task to wait for ready signal and send data
    tokio::spawn(async move {
        // Wait for ready signal with timeout
        let _ = tokio::time::timeout(
            tokio::time::Duration::from_secs(5),
            rx
        ).await;

        // Send the data
        let _ = window_clone.emit("fullscreen-data", payload);
    });

    Ok(())
}

#[tauri::command]
async fn get_skills_data(app: tauri::AppHandle) -> Result<String, String> {
    use std::path::PathBuf;

    // Get the path to the data directory
    let data_path: PathBuf = if cfg!(debug_assertions) {
        // Development mode - use CARGO_MANIFEST_DIR relative path
        // This assumes we're running from project root
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        PathBuf::from(manifest_dir)
            .parent()
            .ok_or("Failed to get parent of CARGO_MANIFEST_DIR")?
            .join("data")
            .join("skills.yaml")
    } else {
        // Production mode - read from bundled resources
        app.path().resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?
            .join("data")
            .join("skills.yaml")
    };

    // Read the YAML file
    let yaml_content = std::fs::read_to_string(&data_path)
        .map_err(|e| format!("Failed to read skills.yaml from {:?}: {}", data_path, e))?;

    // Parse YAML to serde_json::Value
    let yaml_data: serde_yaml::Value = serde_yaml::from_str(&yaml_content)
        .map_err(|e| format!("Failed to parse YAML: {}", e))?;

    // Convert to JSON string
    let json_string = serde_json::to_string(&yaml_data)
        .map_err(|e| format!("Failed to convert to JSON: {}", e))?;

    Ok(json_string)
}

#[tauri::command]
async fn open_skill_graph_viewer(app: tauri::AppHandle) -> Result<(), String> {
    // Close existing viewer window if any
    if let Some(window) = app.get_webview_window("skill-graph-viewer") {
        let _ = window.close();
    }

    // Create the skill graph viewer window
    let _window = WebviewWindowBuilder::new(
        &app,
        "skill-graph-viewer",
        WebviewUrl::App("skillgraph.html".into())
    )
    .title("Skill Graph Explorer")
    .inner_size(1200.0, 800.0)
    .resizable(true)
    .center()
    .focused(true)
    .always_on_top(false)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
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
    .title("Prism Settings")
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
    is_complete: Option<bool>,
) -> Result<(), String> {
    use tauri::Listener;

    // Close existing overlay window if any
    if let Some(window) = app.get_webview_window("screen-overlay") {
        let _ = window.close();
    }

    // Get screen dimensions for fullscreen
    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens.get(0).ok_or("No screen found")?;

    let screen_width = screen.display_info.width as f64;
    let screen_height = screen.display_info.height as f64;

    // Create fullscreen transparent overlay window
    let window = WebviewWindowBuilder::new(
        &app,
        "screen-overlay",
        WebviewUrl::App("overlay.html".into())
    )
    .title("Screen Overlay")
    .inner_size(screen_width, screen_height)
    .position(0.0, 0.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .build()
    .map_err(|e| e.to_string())?;

    // Make window click-through (ignore cursor events)
    let _ = window.set_ignore_cursor_events(true);

    // Log window creation for debugging
    eprintln!("Created overlay window at 0,0 with size {}x{}", screen_width, screen_height);

    // Clone data for the async block
    let window_clone = window.clone();

    // Listen for the "overlay-ready" event from the window
    let (tx, rx) = tokio::sync::oneshot::channel();
    let mut tx_option = Some(tx);

    window.once("overlay-ready", move |_event| {
        eprintln!("Received overlay-ready event from frontend");
        if let Some(tx) = tx_option.take() {
            let _ = tx.send(());
        }
    });

    // Spawn a task to wait for ready signal and send data
    tokio::spawn(async move {
        eprintln!("Waiting for overlay-ready event...");
        // Wait for ready signal with timeout
        let result = tokio::time::timeout(
            tokio::time::Duration::from_secs(5),
            rx
        ).await;

        match result {
            Ok(_) => eprintln!("overlay-ready signal received"),
            Err(_) => eprintln!("overlay-ready timeout after 5 seconds"),
        }

        // Create payload using proper struct
        let payload = OverlayPayload {
            points,
            boxes,
            walkthrough_steps,
            current_step,
            instruction,
            is_complete,
        };

        eprintln!("Sending overlay-data with {} points, {} boxes", payload.points.len(), payload.boxes.len());

        // Send the data
        let emit_result = window_clone.emit("overlay-data", payload);
        if let Err(e) = emit_result {
            eprintln!("Failed to emit overlay-data: {:?}", e);
        } else {
            eprintln!("overlay-data emitted successfully");
        }
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
    is_complete: Option<bool>,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screen-overlay") {
        let payload = OverlayPayload {
            points,
            boxes,
            walkthrough_steps,
            current_step,
            instruction,
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
    // Close overlay window if it exists
    if let Some(window) = app.get_webview_window("screen-overlay") {
        window.close().map_err(|e| e.to_string())?;
        eprintln!("Closed screen overlay window");
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![take_screenshot, open_fullscreen_viewer, get_skills_data, open_skill_graph_viewer, open_settings_window, open_screen_overlay, update_screen_overlay_data, close_screen_overlay])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(target_os = "macos")]
      {
        use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
        let settings = MenuItemBuilder::new("Settings…")
          .id("settings")
          .accelerator("Cmd+,")
          .build(app)?;
        let app_menu = SubmenuBuilder::new(app, "Prism")
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
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
