# Completion and XP

Hard games require 3 solved players; easy and medium games require 4. For smaller
teams, the requirement is capped at the team's player count. Empty teams cannot win.
Surrender and skipped matches award no XP.

Winning XP remains proportional to solved players, with extra rewards for more
than 80% completion and a perfect team. The full reward, including bonuses, is
multiplied by the server-measured elapsed time:

| Elapsed time | XP multiplier |
| --- | --- |
| Up to 2 minutes | 100% |
| 5 minutes | 80% |
| 10 minutes | 50% |
| 15 minutes or longer | 25% |

Between checkpoints the multiplier decreases linearly. The final reward is rounded
once after applying the multiplier. Resuming a game retains its original start time.
Three out of eleven hard players yield 76 XP within two minutes or 61 XP at five
minutes. Existing stored match rewards are not recalculated.

The historical hard pool uses actual starting lineups from seasons starting in
2013–2015. Imports distribute the selection across seasons and leagues. Raw data
and generated seeds remain outside git; PostgreSQL stores the runtime teams.
