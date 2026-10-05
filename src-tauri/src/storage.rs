//! Local JSON storage in the app data dir.
//!
//! Layout:
//!   days/YYYY-MM-DD.json   one file per day (the `Day` shape from src/lib/types.ts)
//!   photos/<id>.<ext>      copies of photos attached to days
//!   wallpaper.<ext>        copy of the chosen wallpaper
//!   settings.json          UI settings
//!
//! Days are passed through as JSON values so fields added by feature panels
//! survive a round trip without the Rust side needing to know about them.

use serde_json::{json, Map, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

type Res<T> = Result<T, String>;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn root(app: &AppHandle) -> Res<PathBuf> {
    let dir = app.path().app_data_dir().map_err(err)?;
    fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

fn subdir(app: &AppHandle, name: &str) -> Res<PathBuf> {
    let dir = root(app)?.join(name);
    fs::create_dir_all(&dir).map_err(err)?;
    Ok(dir)
}

/// Only accept YYYY-MM-DD so a date can never escape the days/ folder.
fn check_date(date: &str) -> Res<()> {
    chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|_| ())
        .map_err(|_| format!("invalid date: {date}"))
}

fn write_atomic(path: &Path, contents: &str) -> Res<()> {
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, contents).map_err(err)?;
    fs::rename(&tmp, path).map_err(err)
}

fn read_json(path: &Path) -> Res<Option<Value>> {
    match fs::read_to_string(path) {
        Ok(s) => serde_json::from_str(&s).map(Some).map_err(err),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(err(e)),
    }
}

fn day_path(app: &AppHandle, date: &str) -> Res<PathBuf> {
    check_date(date)?;
    Ok(subdir(app, "days")?.join(format!("{date}.json")))
}

fn empty_day(date: &str) -> Value {
    json!({ "date": date, "tasks": [], "photos": [] })
}

fn read_day(app: &AppHandle, date: &str) -> Res<Value> {
    let mut day = read_json(&day_path(app, date)?)?.unwrap_or_else(|| empty_day(date));
    let obj = day.as_object_mut().ok_or("day file is not an object")?;
    obj.entry("tasks").or_insert_with(|| json!([]));
    obj.entry("photos").or_insert_with(|| json!([]));
    Ok(day)
}

fn write_day(app: &AppHandle, day: &Value) -> Res<()> {
    let date = day
        .get("date")
        .and_then(Value::as_str)
        .ok_or("day.date is required")?;
    let s = serde_json::to_string_pretty(day).map_err(err)?;
    write_atomic(&day_path(app, date)?, &s)
}

#[tauri::command]
pub fn data_dir(app: AppHandle) -> Res<String> {
    Ok(root(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn load_day(app: AppHandle, date: String) -> Res<Value> {
    read_day(&app, &date)
}

#[tauri::command]
pub fn save_day(app: AppHandle, day: Value) -> Res<()> {
    write_day(&app, &day)
}

/// Dates that have a saved file, oldest first.
#[tauri::command]
pub fn list_days(app: AppHandle) -> Res<Vec<String>> {
    let mut dates: Vec<String> = fs::read_dir(subdir(&app, "days")?)
        .map_err(err)?
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().into_owned();
            let date = name.strip_suffix(".json")?.to_string();
            check_date(&date).ok().map(|_| date)
        })
        .collect();
    dates.sort();
    Ok(dates)
}

fn image_ext(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .filter(|e| e.len() <= 5 && e.chars().all(|c| c.is_ascii_alphanumeric()))
        .unwrap_or_else(|| "img".into())
}

/// Copies the file into photos/ and appends it to the day. Returns the new Photo.
#[tauri::command]
pub fn add_photo(
    app: AppHandle,
    date: String,
    file_path: String,
    caption: Option<String>,
) -> Res<Value> {
    let src = PathBuf::from(&file_path);
    let id = uuid::Uuid::new_v4().to_string();
    let file_name = format!("{id}.{}", image_ext(&src));
    fs::copy(&src, subdir(&app, "photos")?.join(&file_name)).map_err(err)?;

    let mut photo = Map::new();
    photo.insert("id".into(), json!(id));
    photo.insert("fileName".into(), json!(file_name));
    if let Some(c) = caption.filter(|c| !c.trim().is_empty()) {
        photo.insert("caption".into(), json!(c));
    }
    photo.insert("addedAt".into(), json!(chrono::Local::now().to_rfc3339()));
    let photo = Value::Object(photo);

    let mut day = read_day(&app, &date)?;
    day["photos"]
        .as_array_mut()
        .ok_or("day.photos is not a list")?
        .push(photo.clone());
    write_day(&app, &day)?;
    Ok(photo)
}

#[tauri::command]
pub fn delete_photo(app: AppHandle, date: String, photo_id: String) -> Res<()> {
    let mut day = read_day(&app, &date)?;
    let photos = day["photos"].as_array_mut().ok_or("day.photos is not a list")?;
    if let Some(i) = photos.iter().position(|p| p["id"] == json!(photo_id)) {
        let removed = photos.remove(i);
        if let Some(name) = removed["fileName"].as_str() {
            let _ = fs::remove_file(subdir(&app, "photos")?.join(name));
        }
        write_day(&app, &day)?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Res<Value> {
    Ok(read_json(&root(&app)?.join("settings.json"))?.unwrap_or_else(|| json!({})))
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Res<()> {
    let s = serde_json::to_string_pretty(&settings).map_err(err)?;
    write_atomic(&root(&app)?.join("settings.json"), &s)
}

/// Copies the chosen image next to the data so the webview may load it.
/// Returns the stored file name (relative to the data dir).
#[tauri::command]
pub fn set_wallpaper(app: AppHandle, file_path: String) -> Res<String> {
    let src = PathBuf::from(&file_path);
    let dir = root(&app)?;
    // A fresh name each time so the webview does not show a cached image.
    for e in fs::read_dir(&dir).map_err(err)?.flatten() {
        if e.file_name().to_string_lossy().starts_with("wallpaper-") {
            let _ = fs::remove_file(e.path());
        }
    }
    let name = format!(
        "wallpaper-{}.{}",
        chrono::Local::now().timestamp_millis(),
        image_ext(&src)
    );
    fs::copy(&src, dir.join(&name)).map_err(err)?;
    Ok(name)
}

/// Generic JSON files for feature panels, e.g. "study.json". Plain names only.
fn named_json(app: &AppHandle, name: &str) -> Res<PathBuf> {
    let ok = name.ends_with(".json")
        && name.len() <= 64
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        && !name.starts_with('.')
        && name != "settings.json";
    if !ok {
        return Err(format!("invalid file name: {name}"));
    }
    Ok(root(app)?.join(name))
}

#[tauri::command]
pub fn read_json_file(app: AppHandle, name: String) -> Res<Option<Value>> {
    read_json(&named_json(&app, &name)?)
}

#[tauri::command]
pub fn write_json_file(app: AppHandle, name: String, data: Value) -> Res<()> {
    let s = serde_json::to_string_pretty(&data).map_err(err)?;
    write_atomic(&named_json(&app, &name)?, &s)
}
