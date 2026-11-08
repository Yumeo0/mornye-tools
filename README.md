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

- Live account sync with separate profiles for each account and server.
- Character, echo and weapon inventory with ratings, filters and build evaluation.
- Loadout optimizer and captured team presets.
- In-game echo overlay and optional automatic leveling/tuning.
- Exploration map with progress tracking and GHZS imports.
- Quest and achievement tracking.

## Getting started

Run Mornye Tools **as Administrator on Windows**, then log into the game.
Open the Character, Echo and Weapon menus to sync inventory.
Start capture before login to receive quests, achievements and saved teams.

Select the player profile in the sidebar. On the map, press **C** to toggle a
selected item's collected state. Use **Settings → Import → Start import** to
bring in GHZS marks, or **Settings → Export** to back up the selected profile.

Optional **Dangerous Features** connects directly to your account for syncing,
echo marks and bulk upgrades. See the [connection guide](docs/DANGEROUS_FEATURES.md)
before connecting; it can disconnect your running game.

## Documentation

- [Development](docs/DEVELOPMENT.md): setup, checks, releases and architecture.
- [Active connections](docs/DANGEROUS_FEATURES.md): login, profiles and echo upgrades.

## Support

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F7WLWGA)
[![Support me on Patreon](https://img.shields.io/badge/Support_me_on_Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/yumeo0)
