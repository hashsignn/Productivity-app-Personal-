mod storage;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            storage::data_dir,
            storage::load_day,
            storage::save_day,
            storage::list_days,
            storage::add_photo,
            storage::delete_photo,
            storage::load_settings,
            storage::save_settings,
            storage::set_wallpaper,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Glass Planner");
}
