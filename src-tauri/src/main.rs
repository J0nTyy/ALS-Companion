// Prevents an additional console window from opening on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    als_research_companion_lib::run()
}
