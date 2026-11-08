<p align="center">
  <img src="docs/assets/banner.png" alt="Mornye chibi artwork">
</p>

Desktop companion for Wuthering Waves. It reads the game's own network traffic to
keep your account data live, rates your echoes, and follows along in an overlay
while you upgrade them.

## Download

<table>
  <tr>
    <th colspan="2" align="center">Windows 10/11</th>
    <th colspan="3" align="center">Linux</th>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/Yumeo0/mornye-tools/releases/latest/download/mornye-tools-windows-x86_64-setup.exe">
        <img src="docs/assets/windows.svg" width="44" alt=""><br>
        <b>Installer</b><br>
        <sub>.exe · x64</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Yumeo0/mornye-tools/releases/latest/download/mornye-tools-windows-x86_64.msi">
        <img src="docs/assets/windows.svg" width="44" alt=""><br>
        <b>MSI package</b><br>
        <sub>.msi · x64</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Yumeo0/mornye-tools/releases/latest/download/mornye-tools-linux-x86_64.AppImage">
        <img src="docs/assets/appimage.svg" width="44" alt=""><br>
        <b>AppImage</b><br>
        <sub>portable · x86_64</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Yumeo0/mornye-tools/releases/latest/download/mornye-tools-linux-x86_64.deb">
        <img src="docs/assets/debian.svg" width="44" alt=""><br>
        <b>.deb</b><br>
        <sub>Debian · Ubuntu</sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Yumeo0/mornye-tools/releases/latest/download/mornye-tools-linux-x86_64.rpm">
        <img src="docs/assets/redhat.svg" width="44" alt=""><br>
        <b>.rpm</b><br>
        <sub>Fedora · RHEL</sub>
      </a>
    </td>
  </tr>
</table>

<p align="center">
  <a href="https://github.com/Yumeo0/mornye-tools/releases">
    <img src="docs/assets/github.svg" width="18" alt="">
    <b>All releases</b>
  </a>
</p>

## Features

- **Overview** - your selected profile's portrait, levels, signature and collection
  totals, with a click-to-reveal UID.
- **Live account sync** - separate profiles per account and server keep your
  resonators, weapons, echoes and inventory current as you play.
- **Characters, Echoes, Weapons** - browse your inventory, with substat ratings,
  lock/discard marks and stack counts (×N) on each echo card. Filter echoes by
  minimum and maximum level, including an exact level such as +0.
- **Build calculator** - evaluates a build's damage.
- **Optimizer** - finds the best loadout for a target from your echo inventory.
- **Overlay echo scan** - shows substat value while upgrading the echo in-game.
- **Echo Upgrade Assistant** - re-rates an echo after each upgrade or tuning and
  marks it for discard once it can no longer reach your threshold.
- **Automatic echo upgrades** - select echoes in **Tools → Echo Upgrader**, then level and tune them through
  the active connection until their rating threshold becomes unreachable. Uses
  your choice of discard-marked echoes and EXP tube rarities, with optional
  discard marking when an echo can no longer reach the threshold.
- **Exploration map** - chests, Tidal Heritage, collectible, quest and
  gathering placements across all maps, with your live progress and a GHZS
  import (WIP) for marks you already have.
- **Achievements** - the client's achievement snapshot and live updates, with
  search, group filters and a hidden-achievement toggle.
- **Dangerous Features (optional)** - sign in to a global Kuro account, select
  a server and explicitly connect to the game world; the session fills that
  account/server profile with the same data the passive scan captures.

## Documentation

- [Development, releases and architecture](docs/DEVELOPMENT.md) - build and test
  commands, how releases are cut and self-updated, the packet-capture internals,
  the exploration-map data pipeline, the overlay protocol and the source layout.
- [Dangerous Features](docs/DANGEROUS_FEATURES.md) - activation, account login,
  server selection, account profiles, connection controls and credential
  handling.

## Support

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F7WLWGA)
[![Support me on Patreon](https://img.shields.io/badge/Support_me_on_Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/yumeo0)
