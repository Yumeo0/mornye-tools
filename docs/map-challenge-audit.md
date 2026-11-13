# Unresolved challenge markers

Keep these markers generic until native data establishes a player-facing mechanic.
Use localized objectives, device families and explicit gameplay conditions for
classification. A timed label requires a failure timer; nearby chests do not
establish ownership.

| Marker                                                     | Missing evidence                                       |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `8:109800366`                                              | Backflip helper without a localized objective          |
| `8:115000000`                                              | Shared terminal without an identified mechanic         |
| `8:133003516`, `8:142900390`                               | No diagnostic references or objective                  |
| `8:143850344`                                              | No resolvable owner or localized title                 |
| `8:157750005`, `8:157750234`, `8:157750538`, `8:157750542` | Sword devices without a specific objective             |
| `8:200700001`, `8:200750333`, `8:224750452`, `8:316700188` | Internal controllers without a player-facing objective |
| `8:221800113`                                              | Atmosphere controller without a standalone objective   |
| `8:224750445`, `905:150700144`, `905:172700127`            | Insufficient references                                |

Training Dummies are inferred from native group/state and explicit chest-unlock
actions, not per-ID overrides. Regression examples:
`8:118001239` → `8:118001243` and `8:118004465` → `8:146000314`.
Hidden, packed and graph-owned variants remain excluded.
