use screenshots::Screen;
use std::io::Cursor;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct QueryResult {
    answer: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PointResult {
    points: Vec<Point>,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
}

#[tauri::command]
fn take_screenshot() -> Result<String, String> {
    let screens = Screen::all().map_err(|e| e.to_string())?;
    
    if screens.is_empty() {
        return Err("No screens found".to_string());
    }
    
    let screen = &screens[0];
    let screenshot = screen.capture().map_err(|e| e.to_string())?;
    
    let mut buffer = Cursor::new(Vec::new());
    screenshot.write_to(&mut buffer, screenshots::image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    
    let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, buffer.get_ref());
    
    Ok(format!("data:image/png;base64,{}", base64))
}

#[tauri::command]
async fn moondream_query(image_data_url: String, question: String, api_key: String) -> Result<QueryResult, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.moondream.ai/v1/query")
        .header("Content-Type", "application/json")
        .header("X-Moondream-Auth", api_key)
        .json(&serde_json::json!({
            "image_url": image_data_url,
            "question": question
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let status = response.status();
    let response_text = response.text().await.map_err(|e| e.to_string())?;
    
    if !status.is_success() {
        return Err(format!("API error: {} - {}", status, response_text));
    }
    
    log::info!("Moondream API response: {}", response_text);
    
    let result: QueryResult = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {} - Response was: {}", e, response_text))?;
    Ok(result)
}

#[tauri::command]
async fn moondream_point(image_data_url: String, object: String, api_key: String) -> Result<PointResult, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.moondream.ai/v1/point")
        .header("Content-Type", "application/json")
        .header("X-Moondream-Auth", api_key)
        .json(&serde_json::json!({
            "image_url": image_data_url,
            "object": object
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }
    
    let result: PointResult = response.json().await.map_err(|e| e.to_string())?;
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![take_screenshot, moondream_query, moondream_point])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
