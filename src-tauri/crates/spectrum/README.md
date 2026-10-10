<p align="center">
    <img src="https://cdn.wuthery.com/images/spectrum/logo.png?">
</p>

---

<div align="center">

<a href="">![Rust](https://img.shields.io/badge/rust-f6dd6a?style=for-the-badge&logo=rust&logoColor=black)</a>
<a href="">![OpenSource](https://img.shields.io/badge/open_source-f6dd6a.svg?style=for-the-badge&logo=github&logoColor=black)</a>
<a href="">![Documented](https://img.shields.io/badge/Documented-f6dd6a?style=for-the-badge&logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmlld0JveD0iMCAwIDE2IDE2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KPHBhdGggZD0iTTUgMEMzLjM0MzE1IDAgMiAxLjM0MzE1IDIgM1YxM0MyIDE0LjY1NjkgMy4zNDMxNSAxNiA1IDE2SDE0VjE0SDRWMTJIMTRWMEg1WiIgZmlsbD0iYmxhY2siLz4NCjwvc3ZnPg==)</a>

</div>

<p align="center">
    Spectrum is a rust crate for processing and parsing waves game packets. Developed by Wuthery team, open-sourced for the community. Works with any packet source.
</p>

---

## Installation

> [!WARNING]  
> We do not publish Protobuf definitions and decryption keys out of caution. With very little effort, you can extract/find everything needed yourself.

This crate will not be published to crates.io, and can not be installed from GitHub. There are currently two options for installation:

### As Git Submodule

1. Add this repository as a submodule to your project:
```bash
git submodule add https://github.com/Wuthery/spectrum
```
2. Put `packetIds.json` and `protos.proto` files in `spectrum/proto/` directory. Your project structure should look like this:
```
your_project
 ┣ spectrum
 ┃ ┗ proto
 ┃   ┣ protos.proto
 ┃   ┗ packetIds.json
 ┣ your_crate
 ┃ ┗ Cargo.toml
 ┗ Cargo.toml
```
3. Use cargo workspace to include Spectrum in your project:
```toml
[workspace]
members = [
    "spectrum",
    "your_crate"
]
```
4. In `your_crate/Cargo.toml`, add:
```toml
[dependencies]
spectrum = { path = "../spectrum" }
```
5. You can now use Spectrum in your crate:
```rust
use use spectrum::Sniffer;

let sniffer = Sniffer::new("...");
```

### As a Local Dependency

1. Clone this repository to any location:
```bash
git clone https://github.com/Wuthery/spectrum
```
2. Put required files in the `proto/` directory of the cloned repository;
3. In your crate's `Cargo.toml`, add:
```toml
[dependencies]
spectrum = { path = "/path/to/spectrum" }
```
4. You can now use Spectrum in your crate:
```rust
use spectrum::Sniffer;

let sniffer = Sniffer::new("...");
```

## Usage

When using the library, you must add `overflow-checks = false` to your dev profile in `Cargo.toml` to avoid errors caused by `kcp` dependency:
```toml
[profile.dev]
overflow-checks = false
```

## Projects using Spectrum

We value community contributions and would love to see your projects that use Spectrum! Hop on board and add your project to the list below!

- [Spectro PCAP Server](https://github.com/Wuthery/spectro-pcap-server) by [Wuthery Team](https://github.com/Wuthery) - API server for parsing capture files into importable JSON game data; used for [Wuthery Website](https://wuthery.com);

## Acknowledgements

Special thanks to [IceDynamix](https://github.com/IceDynamix) and all the [contributors](https://github.com/IceDynamix/reliquary/graphs/contributors) of [reliquary](https://github.com/IceDynamix/reliquary) repo, which was used as a reference for Spectrum's implementation.

[Pktmon](https://github.com/emmachase/pktmon) and [pcap](https://github.com/rust-pcap/pcap) are two great rust crates for sniffing game packets. Kudos to [emmachase](https://github.com/emmachase) and [pcap crate contributors](https://github.com/rust-pcap/pcap/graphs/contributors) for their work.

## License

The project is distributed under [Apache License 2.0 License](LICENSE).
