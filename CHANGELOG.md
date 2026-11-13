# Changelog

## [Unreleased]

### Added

- **Team suggestions.** Find the strongest combination of one to five teams from your owned Resonators, comparing pre-made and saved custom rotations by combined estimated damage. Each Resonator, including Rover across all elements, can appear in only one suggested team.
- **Apply recommended teams.** While connected to your game account, choose a suggestion and a saved team to replace its members in-game.

### Improved

- **Clearer saved-team cards.** Larger Resonator portraits and rearranged team controls make equipped weapons, Resonance Chains, and current-team status easier to read.

### Fixed

- Modal dialogs no longer cover or block the title bar and window controls, including in smaller windows.
- Empty replies from the game no longer clear saved teams, unset the current team, or create a phantom "Team 0". Previously saved placeholder teams are removed automatically.

### Good to know

- Suggested-team damage uses your synced Resonance Chains, signature/default weapons, and optimized rotation stats. Equipped gear and character levels are not used in these estimates, and rotations that cannot model your chains are excluded.

## [1.0.0] - 2026-11-13

### Added

- **Changelog after updating.** The app automatically shows the new version's release notes after an update restarts it, and remembers when you dismiss them.
- **Teams page.** Browse synced in-game teams, rename them, change or reorder their members, and switch the active team while connected to your game account.
- **Animated Resonator portraits.** Resonator details use animated character artwork, with matching first-frame images on team cards and when reduced motion is enabled.

### Improved

- **Faster, steadier build details.** Total RV appears immediately. Stats start at 0 or 0% while loading, keep their layout, and reuse cached results when reopening an unchanged build.

### Fixed

- Resonance Chain icons no longer clip at intermediate window widths.

## [0.3.6] - 2026-11-12

### Added

- **Resonator build stats.** View attributes, damage bonuses, and healing stats below equipped Echoes in Resonator details, with recommended stats highlighted for the selected build guide.
- **Total build RV.** Resonator details and optimizer results show total Roll Value alongside the theoretical maximum with perfect substat rolls, keeping the build's main stats and weapon while meeting its Energy Regen requirement.
- **Unequip Echoes from inventory.** Unequip captured Echoes directly from the Echoes tab while connected to the game through an active session.

### Improved

- **More useful optimizer stats.** Result rows include HP and DEF alongside ATK, crit stats, Energy Regen, and total RV. Expanded details below the Echo cards show damage, elemental, and healing bonuses, with 0% stats hidden.
- **Cleaner Echo cards.** A compact layout gives substats more room and groups equipment, lock, and discard controls together. Lock and discard icons stay visible, with inactive states dimmed, and only substats counted toward the displayed RV are highlighted.

### Fixed

- Optimizer results stay visible after equipping a build, with the current build and damage comparisons updated to match.

## [0.3.5] - 2026-11-12

### Added

- **Packet capture exports.** Record game traffic from Settings and export raw PCAP captures or parsed JSON with message names and decoded fields.
- **Game compatibility warning.** A persistent notice shows when the installed game is newer than this build supports, with installed/supported versions and a shortcut to update settings.

### Improved

- **Wuthering Waves 3.8 support.** Updated game data, artwork, and packet decoding for the latest game release.

### Fixed

- Active sign-in now uses the correct protocol checksum fields from the installed game's login metadata.

## [0.3.4] - 2026-11-11

Save upgrade materials, compare team rotations more easily, and browse your collection with a clearer interface.

### Added

- **Release notes in the app.** Read what's new before installing an update, or reopen the notes for your installed version in Settings.
- **Compare Echo RV across Resonators.** Choose which relevant Resonator's Roll Value to show on an Echo card.
- **Rotation damage at a glance.** Compare pre-made rotations by estimated damage, search by team members, and filter for teams you own.
- **Upcoming content previews.** Browse Lily and Lullaby in the Resonator and weapon catalogs, with preview entries clearly marked.

### Improved

- **More economical Echo upgrades.** Bulk upgrades can stop when an Echo's chance of reaching your target RV becomes too low. The default minimum chance is 1%, and it is checked again after every new substat.
- **Less EXP waste.** Bulk upgrades choose discarded Echo fodder more efficiently to save EXP tubes.
- **Reuse failed Echoes.** With automatic discard enabled, Echoes below your minimum success chance can be marked for discard and used as fodder for later upgrades.
- **Easier reading and filtering.** Larger labels, clearer selections, and reorganized filters make it easier to browse your collection and adjust settings. Characters are now called Resonators throughout the interface.
- **More useful Resonator details.** A refreshed layout brings artwork, Resonance Chains, equipped gear, and build recommendations together.
- **Clearer quest and achievement lists.** Entries are grouped by category and completion status, and quest descriptions expand when you need them.
- **Simpler account management.** Game accounts and their player profiles are shown together in Settings, with email addresses hidden until you reveal them.
- **Easier rotation troubleshooting.** Playback and errors appear together, with links that take you to the action that needs attention.

### Fixed

- Echo totals and optimizer inventory counts now include every copy in a stack.
- Rotation errors involving repeated swap-in actions now point to the correct opening action.

## [0.3.3] - 2026-11-10

Plan your team's rotations and find Echo builds that work with the way you play.

### Added

- **Rotation Builder.** Create and save team rotations, arrange actions, and add repeated sequences. Test a rotation and review its playback before using it in the optimizer.

### Improved

- **Optimize around a rotation.** Load a team rotation, choose a Resonator, and search your inventory for Echo builds that improve their damage or the team's total damage.
- **Clearer energy requirements.** The optimizer checks Energy Regen against the selected rotation and shows when a build cannot complete it.
- **More flexible teammate builds.** Choose between a teammate's equipped Echoes and the rotation's suggested stats when comparing builds.

### Good to know

- Damage estimates use the updated combat simulation and may differ from earlier versions. Saved manual Energy Regen settings are replaced by the selected rotation's requirements.
