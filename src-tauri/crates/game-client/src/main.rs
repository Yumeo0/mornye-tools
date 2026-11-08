use mornye_game_client::{config, discovery, schema, session};

use anyhow::{bail, ensure, Context, Result};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

fn main() {
    if let Err(error) = execute() {
        eprintln!("mornye-game-client: {error:#}");
        std::process::exit(1);
    }
}

fn execute() -> Result<()> {
    let mut args = std::env::args_os().skip(1);
    let mut config_path = None;
    let mut output = None;
    let mut check = false;
    let mut discover = false;
    let mut list_servers = false;
    let mut game_dir = None;
    let mut server = None;
    let mut bootstrap_url = None;
    while let Some(arg) = args.next() {
        match arg.to_str() {
            Some("--config") => {
                config_path = Some(PathBuf::from(
                    args.next().context("--config requires a local file path")?,
                ))
            }
            Some("--out") => {
                output = Some(PathBuf::from(
                    args.next().context("--out requires a local file path")?,
                ))
            }
            Some("--check") => check = true,
            Some("--discover") => discover = true,
            Some("--list-servers") => list_servers = true,
            Some("--game-dir") => {
                game_dir = Some(PathBuf::from(
                    args.next().context("--game-dir requires a path")?,
                ))
            }
            Some("--server") => {
                server = Some(
                    args.next()
                        .context("--server requires a region, name, or ID")?
                        .into_string()
                        .map_err(|_| anyhow::anyhow!("invalid server name encoding"))?,
                )
            }
            Some("--bootstrap-url") => {
                bootstrap_url = Some(
                    args.next()
                        .context("--bootstrap-url requires an HTTPS URL")?
                        .into_string()
                        .map_err(|_| anyhow::anyhow!("invalid URL encoding"))?,
                )
            }
            Some("--help" | "-h") => {
                println!("mornye-game-client --config <local.json> [--server <region>] [--game-dir <path>] [--out <inventory.local.json>] [--check]\n\nmornye-game-client --discover [--game-dir <path>]\nmornye-game-client --list-servers [--game-dir <path>] [--bootstrap-url <url>]\n\n--discover reads installed versions and public SDK context without networking.\n--list-servers fetches the official public catalogue without logging in.\n--check validates local inputs without networking; server selection is resolved during a real run.\nSee src-tauri/crates/game-client/README.md.");
                return Ok(());
            }
            _ => {
                bail!("unknown argument; use --help (credentials belong in the local config file)")
            }
        }
    }
    if discover || list_servers {
        ensure!(
            !check && config_path.is_none() && output.is_none() && server.is_none(),
            "inspection modes cannot be combined with --config, --out, --server, or --check"
        );
        let installation = discovery::Installation::read(&discovery::Options {
            game_dir,
            bootstrap_url,
            server: None,
        })?;
        if discover {
            println!("{}", serde_json::to_string_pretty(&installation.report())?);
        }
        if list_servers {
            println!(
                "{}",
                serde_json::to_string_pretty(
                    &installation.servers(std::time::Duration::from_secs(20))?
                )?
            );
        }
        return Ok(());
    }
    let config_path = config_path.context("--config is required; use --help")?;
    let mut config = config::Config::read(&config_path)?;
    if game_dir.is_some() || server.is_some() || bootstrap_url.is_some() {
        let options = config.installation.get_or_insert_with(Default::default);
        if game_dir.is_some() {
            options.game_dir = game_dir;
        }
        if server.is_some() {
            options.server = server;
        }
        if bootstrap_url.is_some() {
            options.bootstrap_url = bootstrap_url;
        }
    }
    let installation = config
        .installation
        .as_ref()
        .map(discovery::Installation::read)
        .transpose()?;
    if let Some(installation) = &installation {
        installation.apply(&mut config)?;
    }
    let schema = schema::Schema::load()?;
    config.validate_offline(&schema)?;
    if check {
        println!("Configuration matches the pinned schema. No network connection was made.");
        if config.email_login.is_some()
            && config
                .installation
                .as_ref()
                .is_some_and(|i| i.server.is_some())
        {
            println!(
                "Selected server will be resolved from the public catalogue during a real run."
            );
        }
        return Ok(());
    }
    let output = output.unwrap_or_else(|| {
        config_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("inventory.local.json")
    });
    ensure!(
        !output.exists(),
        "output already exists; choose a new --out path"
    );
    let parent = output
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    ensure!(
        fs::metadata(parent).is_ok_and(|m| m.is_dir()),
        "output parent directory does not exist"
    );
    if let (Some(email), Some(selection)) = (
        &mut config.email_login,
        config
            .installation
            .as_ref()
            .and_then(|i| i.server.as_deref()),
    ) {
        let installation = installation
            .as_ref()
            .context("installation discovery is required for automatic server selection")?;
        let servers =
            installation.servers(std::time::Duration::from_secs(config.timeout_seconds))?;
        let server = discovery::select_server(&servers, selection)?;
        ensure!(email.game_login.url.is_empty() || server.login_urls.contains(&email.game_login.url),
            "explicit game_login.url does not belong to the selected server; omit the URL to discover it automatically");
        if email.game_login.url.is_empty() {
            email.game_login.url = server.login_urls[0].clone();
        }
        eprintln!("Selected server: {} ({})", server.name, server.id);
    }
    config.validate(&schema)?;
    let inventory = session::run(&config, &schema)?;
    let bytes = serde_json::to_vec_pretty(&inventory)?;
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&output)
        .context("could not create inventory output")?;
    file.write_all(&bytes)
        .context("could not write inventory output")?;
    file.write_all(b"\n")?;
    println!("Inventory fetched and saved to {}", output.display());
    Ok(())
}
