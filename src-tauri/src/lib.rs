//! Desktop app wiring. Backend subsystems compile as separate workspace crates.
use tauri::Manager;

pub use mornye_connection::dangerous;
pub use mornye_overlay::{capture, echo_panel, input, ocr, overlay, scan_region, AppState};
pub use mornye_sync::{account, sniffer};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // MCP bridge for AI automation (debug builds only)
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build());
    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    builder
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir).ok();

            app.manage(account::AccountState::new(data_dir.clone()));
            app.manage(dangerous::DangerousState::new(data_dir.clone()));
            let sniffer_state = sniffer::SnifferState::new(app.handle(), data_dir);
            app.manage(sniffer_state);
            app.manage(overlay::OverlayState::default());
            sniffer::start(app.handle());
            overlay::start(app.handle());
            Ok(())
        })
        .manage(AppState::default())
        .on_window_event(|window, event| {
            if window.label() == "settings" && matches!(event, tauri::WindowEvent::Destroyed) {
                window.state::<dangerous::DangerousState>().shutdown();
            }
        })
        .invoke_handler(tauri::generate_handler![
            mornye_overlay::commands::set_scan_region,
            mornye_overlay::commands::get_scan_region,
            mornye_overlay::commands::set_scan_regions,
            mornye_overlay::commands::get_scan_regions,
            mornye_overlay::commands::set_show_scan_region,
            mornye_overlay::commands::get_show_scan_region,
            overlay::set_show_menu_debug,
            overlay::assistant_queue_discard,
            overlay::assistant_cancel_discard,
            mornye_overlay::commands::scan_region_for_text,
            mornye_overlay::commands::get_capture_origin,
            account::account_get_snapshot,
            account::account_get_view,
            account::backup::account_preview_import,
            account::backup::account_import_backup,
            account::account_list_profiles,
            account::account_select_profile,
            account::account_identify_profile,
            account::account_add_manual_echo,
            account::account_remove_manual_echo,
            account::account_set_equipped_override,
            sniffer::sniffer_get_status,
            sniffer::position::sniffer_get_player_position,
            sniffer::sniffer_import_pcap,
            sniffer::recording::sniffer_set_recording,
            sniffer::recording::sniffer_clear_recording,
            sniffer::recording::sniffer_export_capture,
            dangerous::dangerous_status,
            dangerous::dangerous_set_enabled,
            dangerous::dangerous_servers,
            dangerous::dangerous_select_server,
            dangerous::dangerous_select_account,
            dangerous::dangerous_link_profile,
            dangerous::profiles::dangerous_discover_profiles,
            dangerous::profiles::dangerous_add_profile,
            dangerous::profiles::dangerous_remove_profile,
            dangerous::dangerous_login,
            dangerous::dangerous_connect,
            dangerous::dangerous_echo_upgrade,
            dangerous::dangerous_echo_discard,
            dangerous::dangerous_echo_mark,
            dangerous::dangerous_echo_equip,
            dangerous::dangerous_disconnect,
            dangerous::dangerous_sign_out,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
