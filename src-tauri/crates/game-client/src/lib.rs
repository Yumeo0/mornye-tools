//! Active game client. The desktop application and inventory CLI use
//! the same authentication, discovery and session implementation.
pub mod auth;
pub mod config;
pub mod discovery;
pub mod echo_equip;
pub mod echo_mark;
pub mod echo_upgrade;
mod live_inventory;
pub mod schema;
pub mod session;
mod wire;

/// Shared game-frame codec for active sessions and passive capture.
/// These functions only transform bytes; they never open a connection.
pub mod codec {
    pub use crate::wire::{decode, encode, frame_size, Packet};
}
