//! macOS Services provider: adds a "Read with Stratos House" item to the
//! right-click / Services menu for selected text, speaking it via `crate::tts`.
//!
//! The menu item + handler selector are declared in `Info.plist` (`NSServices`);
//! here we register an Obj-C provider object whose method matches the declared
//! `NSMessage` (`readWithStratos`) so the system can deliver the selection.

use log::{info, warn};
use objc2::rc::Retained;
use objc2::runtime::{AnyObject, NSObject};
use objc2::{define_class, msg_send, AllocAnyThread};
use objc2_app_kit::{
    NSApplication, NSPasteboard, NSPasteboardTypeString, NSUpdateDynamicServices,
};
use objc2_foundation::{MainThreadMarker, NSString};
use once_cell::sync::OnceCell;
use tauri::AppHandle;

/// Stashed so the Obj-C callback can reach app settings (voice/rate).
static APP: OnceCell<AppHandle> = OnceCell::new();

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "StratServicesProvider"]
    struct ServicesProvider;

    impl ServicesProvider {
        /// Backs the `readWithStratos` NSMessage:
        /// `- (void)readWithStratos:(NSPasteboard*)pboard userData:(NSString*)u error:(NSString**)e`
        #[unsafe(method(readWithStratos:userData:error:))]
        fn read_with_stratos(
            &self,
            pboard: &NSPasteboard,
            _user_data: *mut NSString,
            _error: *mut *mut NSString,
        ) {
            let Some(text) = (unsafe { pboard.stringForType(NSPasteboardTypeString) }) else {
                return;
            };
            let text = text.to_string();
            let trimmed = text.trim();
            if trimmed.is_empty() {
                return;
            }
            if let Some(app) = APP.get() {
                let settings = crate::settings::get_settings(app);
                let rate = if settings.tts_rate > 0 {
                    Some(settings.tts_rate)
                } else {
                    None
                };
                crate::tts::speak(trimmed, settings.tts_voice.as_deref(), rate);
            }
        }
    }
);

/// Register the Services provider. Must run on the main thread (Tauri `setup`).
pub fn register(app: &AppHandle) {
    if APP.set(app.clone()).is_err() {
        return; // already registered
    }
    let Some(mtm) = MainThreadMarker::new() else {
        warn!("services_provider: not on the main thread; skipping registration");
        return;
    };

    let this = ServicesProvider::alloc().set_ivars(());
    let provider: Retained<ServicesProvider> = unsafe { msg_send![super(this), init] };

    let ns_app = NSApplication::sharedApplication(mtm);
    let provider_ref: &AnyObject = &provider;
    unsafe { ns_app.setServicesProvider(Some(provider_ref)) };
    // setServicesProvider does not retain the provider; keep it alive forever.
    std::mem::forget(provider);

    NSUpdateDynamicServices();
    info!("services_provider: registered 'Read with Stratos House'");
}
