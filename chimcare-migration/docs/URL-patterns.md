# URL patterns

- **Source:** WordPress `chimcare_local`, `job_listing` where `post_status='publish'`
- **Published URLs:** 229,621
- **Families:** 5, accounting for 229,621 URLs (exhaustive)
- **Service names:** 420 distinct, from family A
- **Generated:** 2026-09-11T04:21:34.822964+00:00
- **Regenerate:** `python3 scripts/list_url_patterns.py`

Every URL lives under `/location/{slug}/`. The slug is what varies, and it varies in five
shapes. The counts below add up to the total, which is the only reason to trust the split.

## Families

|  | shape | URLs | share | example | what it is |
| --- | --- | --- | --- | --- | --- |
| A | `{service}-in-{city}-{st}` | 213,766 | 93.1% | `chimney-sweep-repair-in-boston-ma` | The modern form. Almost every published URL is one of these. |
| B | `{service}-{city}-in-{st}` | 4,012 | 1.7% | `freestanding-stoves-worcester-in-ma` | The same three parts with `in` before the state. Splitting on the first `-in-` misreads these. |
| C | `{service}-{city}-{st}` | 11,491 | 5.0% | `chimney-sweep-bellevue-wa` | The oldest form, with no `in` at all. These are the earliest posts by ID. |
| D | `{service}-{city}-{statename}` | 16 | 0.0% | `chimney-sweep-portland-oregon` | The state spelled out instead of abbreviated. |
| E | `irregular` | 336 | 0.1% | `cleveland-oh-chimney-sweep-repair` | Marketing tails, city-first ordering and one-offs. No shared shape. |

### Why families A and B have to be told apart

```
air-duct-cleaning-in-acton-ca      A   service=air-duct-cleaning   city=acton     state=ca
air-duct-cleaning-airport-in-ca    B   service=air-duct-cleaning   city=airport   state=ca
```

Both contain `-in-`. Splitting on the first one reads family B's city as part of its service
name, which invents thousands of services that do not exist. The service list below is
therefore derived from family A alone.

## States

18 states, taken from the two-letter tail.

| code | state | URLs | stage 1 pattern |
| --- | --- | --- | --- |
| ca | California | 56,356 | `%-ca` |
| ma | Massachusetts | 34,014 | `%-ma` |
| wa | Washington | 32,857 | `%-wa` |
| or | Oregon | 31,388 | `%-or` |
| il | Illinois | 19,795 | `%-il` |
| mn | Minnesota | 19,014 | `%-mn` |
| ct | Connecticut | 12,345 | `%-ct` |
| oh | Ohio | 6,614 | `%-oh` |
| co | Colorado | 2,602 | `%-co` |
| wi | Wisconsin | 2,493 | `%-wi` |
| ga | Georgia | 2,024 | `%-ga` |
| id | Idaho | 279 | `%-id` |
| ut | Utah | 279 | `%-ut` |
| pa | Pennsylvania | 92 | `%-pa` |
| in | Indiana | 92 | `%-in` |
| mi | Michigan | 92 | `%-mi` |
| tn | Tennessee | 92 | `%-tn` |
| az | Arizona | 23 | `%-az` |

A further 13 URLs end in two letters that are not a state code — an ordinary word
that happens to end that way. They are not counted as states here.

## Services

420 distinct service names appear in family A. The 247 listed below each
cover 10 URLs or more, and together account for 213,486 of family A's 213,766 URLs
(99.9%). The remainder are long-tail names used on a handful of pages each.

| service | URLs | stage 1 pattern |
| --- | --- | --- |
| `chimney-sweep-repair` | 2,726 | `chimney-sweep-repair-in-%` |
| `chimney-flashing-repair` | 2,509 | `chimney-flashing-repair-in-%` |
| `chimney-inspection` | 1,996 | `chimney-inspection-in-%` |
| `dryer-vent-cleaning` | 1,974 | `dryer-vent-cleaning-in-%` |
| `gas-fireplace-repair` | 1,970 | `gas-fireplace-repair-in-%` |
| `chimney-flue-repair` | 1,963 | `chimney-flue-repair-in-%` |
| `chimney-nest-removal` | 1,932 | `chimney-nest-removal-in-%` |
| `chimney-siding-repair` | 1,924 | `chimney-siding-repair-in-%` |
| `fireplace-installation` | 1,918 | `fireplace-installation-in-%` |
| `fireplace-repair` | 1,918 | `fireplace-repair-in-%` |
| `chimney-cleaning` | 1,917 | `chimney-cleaning-in-%` |
| `chimney-damper-repair` | 1,914 | `chimney-damper-repair-in-%` |
| `chimney-cap-installation` | 1,907 | `chimney-cap-installation-in-%` |
| `chimney-vent-installation` | 1,897 | `chimney-vent-installation-in-%` |
| `chimney-liner-installation` | 1,885 | `chimney-liner-installation-in-%` |
| `chimney-liner-repair` | 1,876 | `chimney-liner-repair-in-%` |
| `chimney-crown-repair` | 1,862 | `chimney-crown-repair-in-%` |
| `chimney-cap-repair` | 1,852 | `chimney-cap-repair-in-%` |
| `chimney-animal-removal` | 1,846 | `chimney-animal-removal-in-%` |
| `chimney-relining` | 1,846 | `chimney-relining-in-%` |
| `fireplace-cleaning` | 1,844 | `fireplace-cleaning-in-%` |
| `chimney-rebuild` | 1,837 | `chimney-rebuild-in-%` |
| `fireplace-damper-repair` | 1,825 | `fireplace-damper-repair-in-%` |
| `chimney-tuckpointing` | 1,772 | `chimney-tuckpointing-in-%` |
| `chimney-repair` | 1,720 | `chimney-repair-in-%` |
| `chimney-caps` | 1,547 | `chimney-caps-in-%` |
| `fireplace-gas-valve-replace` | 1,404 | `fireplace-gas-valve-replace-in-%` |
| `dryer-duct-cleaning` | 1,145 | `dryer-duct-cleaning-in-%` |
| `wood-burning-stove-installation` | 1,126 | `wood-burning-stove-installation-in-%` |
| `gas-fireplace-repair-service` | 1,086 | `gas-fireplace-repair-service-in-%` |
| `pellet-stove-repair` | 1,085 | `pellet-stove-repair-in-%` |
| `gas-fireplace-installation` | 1,079 | `gas-fireplace-installation-in-%` |
| `spark-arrestor-installation` | 1,075 | `spark-arrestor-installation-in-%` |
| `chimney-cleaning-maintenance-services` | 1,069 | `chimney-cleaning-maintenance-services-in-%` |
| `gas-fireplace-maintenance-cleaning` | 1,068 | `gas-fireplace-maintenance-cleaning-in-%` |
| `chimney-masonry-repair` | 1,066 | `chimney-masonry-repair-in-%` |
| `fireplace-panels-repair` | 1,065 | `fireplace-panels-repair-in-%` |
| `fireplace-panels-replace` | 1,065 | `fireplace-panels-replace-in-%` |
| `chimney-cricket-installation` | 1,063 | `chimney-cricket-installation-in-%` |
| `electric-fireplace-installation` | 1,061 | `electric-fireplace-installation-in-%` |
| `gas-fireplace-service` | 1,061 | `gas-fireplace-service-in-%` |
| `wood-burning-fireplace-installation` | 1,060 | `wood-burning-fireplace-installation-in-%` |
| `chimney-sweep-services` | 1,055 | `chimney-sweep-services-in-%` |
| `duct-cleaning` | 1,055 | `duct-cleaning-in-%` |
| `chimney-inspections` | 1,052 | `chimney-inspections-in-%` |
| `chimney-repair-reconstruction` | 1,049 | `chimney-repair-reconstruction-in-%` |
| `fireplace-gas-valve-repair` | 1,049 | `fireplace-gas-valve-repair-in-%` |
| `gas-fireplace-cleaning` | 1,049 | `gas-fireplace-cleaning-in-%` |
| `vented-gas-logs-installation` | 1,045 | `vented-gas-logs-installation-in-%` |
| `ventless-gas-logs-installation` | 1,044 | `ventless-gas-logs-installation-in-%` |
| `electric-fireplace-repair` | 1,043 | `electric-fireplace-repair-in-%` |
| `smoke-chamber-cleaning` | 1,043 | `smoke-chamber-cleaning-in-%` |
| `fireplace-remote-control-troubleshooting` | 1,042 | `fireplace-remote-control-troubleshooting-in-%` |
| `smoke-chamber-repair` | 1,039 | `smoke-chamber-repair-in-%` |
| `wood-burning-fireplace-inserts` | 1,039 | `wood-burning-fireplace-inserts-in-%` |
| `fireplace-remodeling` | 1,037 | `fireplace-remodeling-in-%` |
| `pilot-assembly-replacement` | 1,034 | `pilot-assembly-replacement-in-%` |
| `chimney-siding-replace` | 1,033 | `chimney-siding-replace-in-%` |
| `pellet-stove-service` | 1,033 | `pellet-stove-service-in-%` |
| `remote-control-for-a-pilot-light` | 1,033 | `remote-control-for-a-pilot-light-in-%` |
| `chimney-sweep` | 1,032 | `chimney-sweep-in-%` |
| `pilot-light-installation` | 1,032 | `pilot-light-installation-in-%` |
| `gas-fireplace-inserts` | 1,029 | `gas-fireplace-inserts-in-%` |
| `masonry-repair-construction` | 1,025 | `masonry-repair-construction-in-%` |
| `fireplace-gas-burner-installation` | 1,024 | `fireplace-gas-burner-installation-in-%` |
| `outdoor-fireplace-building` | 1,024 | `outdoor-fireplace-building-in-%` |
| `fireplace-inserts` | 1,022 | `fireplace-inserts-in-%` |
| `chimney-fireplace-repair` | 1,021 | `chimney-fireplace-repair-in-%` |
| `chimney-chase-covering` | 1,020 | `chimney-chase-covering-in-%` |
| `pellet-stove-inspection` | 1,020 | `pellet-stove-inspection-in-%` |
| `leaking-chimney-repair` | 1,019 | `leaking-chimney-repair-in-%` |
| `chimney-bricks-repair` | 1,018 | `chimney-bricks-repair-in-%` |
| `chimney-rebuilding` | 1,018 | `chimney-rebuilding-in-%` |
| `chimney-chase-restoration` | 1,016 | `chimney-chase-restoration-in-%` |
| `exterior-wood-replacement` | 1,013 | `exterior-wood-replacement-in-%` |
| `chimney-deep-cleaning-pcr` | 1,009 | `chimney-deep-cleaning-pcr-in-%` |
| `flexible-chimney-liner-installation` | 1,009 | `flexible-chimney-liner-installation-in-%` |
| `chimney-fan-installation` | 1,008 | `chimney-fan-installation-in-%` |
| `fireplace-masonry-repair` | 1,007 | `fireplace-masonry-repair-in-%` |
| `chimney-framing-rebuild` | 1,003 | `chimney-framing-rebuild-in-%` |
| `apartment-chimney-services` | 1,000 | `apartment-chimney-services-in-%` |
| `local-chimney-sweep-and-cleaning` | 1,000 | `local-chimney-sweep-and-cleaning-in-%` |
| `chimney-flue-installation` | 995 | `chimney-flue-installation-in-%` |
| `smoke-chamber-rebuild` | 994 | `smoke-chamber-rebuild-in-%` |
| `vented-gas-logs` | 994 | `vented-gas-logs-in-%` |
| `chimney-restoration` | 992 | `chimney-restoration-in-%` |
| `commercial-bbq-smoker-cleaning-service` | 987 | `commercial-bbq-smoker-cleaning-service-in-%` |
| `chimney-sweep-near-me` | 986 | `chimney-sweep-near-me-in-%` |
| `stainless-steel-liners` | 983 | `stainless-steel-liners-in-%` |
| `chimney-framing-repair` | 980 | `chimney-framing-repair-in-%` |
| `fireplace-flue-installation` | 978 | `fireplace-flue-installation-in-%` |
| `vent-free-gas-logs` | 978 | `vent-free-gas-logs-in-%` |
| `fireplace-refacing-mantel-replacement` | 977 | `fireplace-refacing-mantel-replacement-in-%` |
| `downdraft-repair` | 976 | `downdraft-repair-in-%` |
| `gas-line-installation-service` | 975 | `gas-line-installation-service-in-%` |
| `fireplace-brick-repair` | 974 | `fireplace-brick-repair-in-%` |
| `masonry-repair` | 972 | `masonry-repair-in-%` |
| `wood-burning-inserts` | 972 | `wood-burning-inserts-in-%` |
| `chimney-maintenance` | 970 | `chimney-maintenance-in-%` |
| `top-mount-dampers` | 970 | `top-mount-dampers-in-%` |
| `waterproofing-bricks` | 966 | `waterproofing-bricks-in-%` |
| `chimney-construction` | 956 | `chimney-construction-in-%` |
| `gas-log-sets` | 948 | `gas-log-sets-in-%` |
| `commercial-pizza-oven-cleaning-service` | 944 | `commercial-pizza-oven-cleaning-service-in-%` |
| `firebox-repair` | 937 | `firebox-repair-in-%` |
| `custom-chimney-caps` | 931 | `custom-chimney-caps-in-%` |
| `chimney-chase-repair` | 904 | `chimney-chase-repair-in-%` |
| `chimney-liner-replacement` | 903 | `chimney-liner-replacement-in-%` |
| `chimney-structural-repair` | 902 | `chimney-structural-repair-in-%` |
| `chimney-throat-repair` | 902 | `chimney-throat-repair-in-%` |
| `chimney-draft-repair` | 899 | `chimney-draft-repair-in-%` |
| `chimney-crack-repair` | 898 | `chimney-crack-repair-in-%` |
| `chimney-vent-repair` | 898 | `chimney-vent-repair-in-%` |
| `chimney-ash-pit-cleaning` | 897 | `chimney-ash-pit-cleaning-in-%` |
| `chimney-fire-damage-repair` | 897 | `chimney-fire-damage-repair-in-%` |
| `chimney-smoke-chamber-cleaning` | 897 | `chimney-smoke-chamber-cleaning-in-%` |
| `chimney-smoke-chamber-repair` | 897 | `chimney-smoke-chamber-repair-in-%` |
| `chimney-crown-sealing` | 895 | `chimney-crown-sealing-in-%` |
| `chimney-spalling-repair` | 895 | `chimney-spalling-repair-in-%` |
| `chimney-stucco-repair` | 895 | `chimney-stucco-repair-in-%` |
| `chimney-exterior-repair` | 894 | `chimney-exterior-repair-in-%` |
| `chimney-sealing-service` | 894 | `chimney-sealing-service-in-%` |
| `chimney-firebox-repair` | 893 | `chimney-firebox-repair-in-%` |
| `chimney-flashing-sealing` | 893 | `chimney-flashing-sealing-in-%` |
| `chimney-heat-shield-installation` | 893 | `chimney-heat-shield-installation-in-%` |
| `chimney-insulation-installation` | 892 | `chimney-insulation-installation-in-%` |
| `chimney-mortar-repair` | 892 | `chimney-mortar-repair-in-%` |
| `chimney-blockage-removal` | 891 | `chimney-blockage-removal-in-%` |
| `chimney-damper-replacement` | 891 | `chimney-damper-replacement-in-%` |
| `chimney-interior-repair` | 891 | `chimney-interior-repair-in-%` |
| `chimney-liner-maintenance` | 891 | `chimney-liner-maintenance-in-%` |
| `chimney-concrete-repair` | 890 | `chimney-concrete-repair-in-%` |
| `chimney-flashing-installation` | 890 | `chimney-flashing-installation-in-%` |
| `chimney-flue-replacement` | 890 | `chimney-flue-replacement-in-%` |
| `chimney-tile-repair` | 890 | `chimney-tile-repair-in-%` |
| `chimney-masonry-restoration` | 888 | `chimney-masonry-restoration-in-%` |
| `chimney-roof-repair` | 888 | `chimney-roof-repair-in-%` |
| `chimney-spark-arrestor-repair` | 888 | `chimney-spark-arrestor-repair-in-%` |
| `chimney-throat-replacement` | 888 | `chimney-throat-replacement-in-%` |
| `chimney-crown-replacement` | 887 | `chimney-crown-replacement-in-%` |
| `chimney-tile-replacement` | 887 | `chimney-tile-replacement-in-%` |
| `chimney-liner-cleaning` | 886 | `chimney-liner-cleaning-in-%` |
| `chimney-spark-arrestor-cleaning` | 886 | `chimney-spark-arrestor-cleaning-in-%` |
| `chimney-vent-replacement` | 885 | `chimney-vent-replacement-in-%` |
| `chimney-firebox-replacement` | 883 | `chimney-firebox-replacement-in-%` |
| `chimney-spark-arrestor-installation` | 883 | `chimney-spark-arrestor-installation-in-%` |
| `chimney-liner-inspection` | 882 | `chimney-liner-inspection-in-%` |
| `chimney-vent-cleaning` | 882 | `chimney-vent-cleaning-in-%` |
| `chimney-brick-replacement` | 881 | `chimney-brick-replacement-in-%` |
| `chimney-cap-replacement` | 879 | `chimney-cap-replacement-in-%` |
| `wood-burning-insert-removal` | 876 | `wood-burning-insert-removal-in-%` |
| `chimney-flue-waterproofing` | 874 | `chimney-flue-waterproofing-in-%` |
| `chimney-preventive-maintenance` | 874 | `chimney-preventive-maintenance-in-%` |
| `chimney-smoke-problem-repair` | 874 | `chimney-smoke-problem-repair-in-%` |
| `chimney-flue-sealing` | 871 | `chimney-flue-sealing-in-%` |
| `chimney-waterproof-coating` | 870 | `chimney-waterproof-coating-in-%` |
| `chimney-footing-repair` | 867 | `chimney-footing-repair-in-%` |
| `masonry-chimney-repair` | 865 | `masonry-chimney-repair-in-%` |
| `chimney-leak-repair` | 863 | `chimney-leak-repair-in-%` |
| `chimney-moisture-control` | 859 | `chimney-moisture-control-in-%` |
| `chimney-odor-removal` | 856 | `chimney-odor-removal-in-%` |
| `wood-inserts` | 847 | `wood-inserts-in-%` |
| `fireplace-inspection` | 827 | `fireplace-inspection-in-%` |
| `air-duct-cleaning` | 823 | `air-duct-cleaning-in-%` |
| `fireplace-damper-installation` | 820 | `fireplace-damper-installation-in-%` |
| `fireplace-smoke-repair` | 817 | `fireplace-smoke-repair-in-%` |
| `fireplace-doors` | 811 | `fireplace-doors-in-%` |
| `chimney-camera-inspection` | 804 | `chimney-camera-inspection-in-%` |
| `fireplace-restoration` | 787 | `fireplace-restoration-in-%` |
| `coal-stove-service` | 785 | `coal-stove-service-in-%` |
| `chimney-waterproofing` | 782 | `chimney-waterproofing-in-%` |
| `fireplace-insert-installation` | 780 | `fireplace-insert-installation-in-%` |
| `electric-fireplaces` | 779 | `electric-fireplaces-in-%` |
| `cleaning-sweeping` | 763 | `cleaning-sweeping-in-%` |
| `level-3-chimney-inspection` | 761 | `level-3-chimney-inspection-in-%` |
| `gas-stoves-repair` | 760 | `gas-stoves-repair-in-%` |
| `chimney-inspection-level-1` | 710 | `chimney-inspection-level-1-in-%` |
| `top-sealing-damper` | 686 | `top-sealing-damper-in-%` |
| `chimney-chase-cover` | 683 | `chimney-chase-cover-in-%` |
| `chimney-inspection-level-2` | 678 | `chimney-inspection-level-2-in-%` |
| `chimney-inspection-level-3` | 665 | `chimney-inspection-level-3-in-%` |
| `outdoor-fireplaces` | 647 | `outdoor-fireplaces-in-%` |
| `caps-rain-pans` | 640 | `caps-rain-pans-in-%` |
| `wood-fireplaces` | 640 | `wood-fireplaces-in-%` |
| `chimney-leaks-repair` | 637 | `chimney-leaks-repair-in-%` |
| `damaged-chimneys-repair` | 621 | `damaged-chimneys-repair-in-%` |
| `restoration-relining` | 615 | `restoration-relining-in-%` |
| `gas-fireplaces` | 604 | `gas-fireplaces-in-%` |
| `chimney-crowns` | 589 | `chimney-crowns-in-%` |
| `chimney-sweep-fireplace` | 588 | `chimney-sweep-fireplace-in-%` |
| `wood-stoves-repair` | 561 | `wood-stoves-repair-in-%` |
| `smelly-chimneys-repair` | 549 | `smelly-chimneys-repair-in-%` |
| `glass-door-fireplace` | 544 | `glass-door-fireplace-in-%` |
| `smoky-chimneys-repair` | 538 | `smoky-chimneys-repair-in-%` |
| `pellet-stoves` | 502 | `pellet-stoves-in-%` |
| `freestanding-stoves-repair` | 488 | `freestanding-stoves-repair-in-%` |
| `heatshield-repair` | 430 | `heatshield-repair-in-%` |
| `freestanding-stoves` | 385 | `freestanding-stoves-in-%` |
| `smelly-chimneys` | 362 | `smelly-chimneys-in-%` |
| `chimney-inspection-level1` | 360 | `chimney-inspection-level1-in-%` |
| `chimney-crowns-repair` | 356 | `chimney-crowns-repair-in-%` |
| `pellet-stoves-repair` | 353 | `pellet-stoves-repair-in-%` |
| `wood-stoves` | 352 | `wood-stoves-in-%` |
| `chimney-inspection-level2` | 348 | `chimney-inspection-level2-in-%` |
| `chimney-flashing` | 347 | `chimney-flashing-in-%` |
| `chimney-leaks` | 345 | `chimney-leaks-in-%` |
| `chimney-inspection-level3` | 344 | `chimney-inspection-level3-in-%` |
| `gas-fireplace-insert` | 333 | `gas-fireplace-insert-in-%` |
| `glass-door-fireplace-repair` | 305 | `glass-door-fireplace-repair-in-%` |
| `chimney-caps-repair` | 277 | `chimney-caps-repair-in-%` |
| `damaged-chimneys` | 275 | `damaged-chimneys-in-%` |
| `smoky-chimneys` | 273 | `smoky-chimneys-in-%` |
| `outdoor-fireplaces-repair` | 268 | `outdoor-fireplaces-repair-in-%` |
| `gas-fireplaces-repair` | 255 | `gas-fireplaces-repair-in-%` |
| `caps-and-rain-pans` | 252 | `caps-and-rain-pans-in-%` |
| `gas-stoves` | 213 | `gas-stoves-in-%` |
| `liners` | 212 | `liners-in-%` |
| `electric-fireplaces-repair` | 173 | `electric-fireplaces-repair-in-%` |
| `wood-fireplaces-repair` | 142 | `wood-fireplaces-repair-in-%` |
| `heatshield` | 122 | `heatshield-in-%` |
| `chimney-tuckpointing-chimney-tuckpointing-chimney-mortar-repair-tuckpointing-chimney-near-me-chimney-joint-repair` | 112 | `chimney-tuckpointing-chimney-tuckpointing-chimney-mortar-repair-tuckpointing-chimney-near-me-chimney-joint-repair-in-%` |
| `top-sealing-damper-top-sealing-damper-installation-chimney-damper-replacement-chimney-damper-upgrade-top-mount-damper` | 108 | `top-sealing-damper-top-sealing-damper-installation-chimney-damper-replacement-chimney-damper-upgrade-top-mount-damper-in-%` |
| `fireplace-doors-repair` | 104 | `fireplace-doors-repair-in-%` |
| `liners-sweep-repair` | 99 | `liners-sweep-repair-in-%` |
| `level-3-chimney-inspection-level-3-chimney-inspection-advanced-chimney-inspection-chimney-inspection-after-fire-structural-chimney-inspection` | 86 | `level-3-chimney-inspection-level-3-chimney-inspection-advanced-chimney-inspection-chimney-inspection-after-fire-structural-chimney-inspection-in-%` |
| `wood-fireplaces-sweep-repair` | 78 | `wood-fireplaces-sweep-repair-in-%` |
| `fireplace-restoration-fireplace-restoration-fireplace-rebuild-historic-fireplace-restoration-fireplace-renovation` | 72 | `fireplace-restoration-fireplace-restoration-fireplace-rebuild-historic-fireplace-restoration-fireplace-renovation-in-%` |
| `fireplace-insert-installation-fireplace-insert-installation-wood-stove-insert-installation-gas-fireplace-insert-installation` | 67 | `fireplace-insert-installation-fireplace-insert-installation-wood-stove-insert-installation-gas-fireplace-insert-installation-in-%` |
| `chimney-waterproofing-chimney-waterproofing-chimney-water-sealing-chimney-waterproofing-near-me-chimney-moisture-protection` | 58 | `chimney-waterproofing-chimney-waterproofing-chimney-water-sealing-chimney-waterproofing-near-me-chimney-moisture-protection-in-%` |
| `chimney-chase-cover-installation-chimney-chase-cover-replacement-chimney-chase-cover-repair-stainless-steel-chimney-chase-cover` | 54 | `chimney-chase-cover-installation-chimney-chase-cover-replacement-chimney-chase-cover-repair-stainless-steel-chimney-chase-cover-in-%` |
| `chimney-animal-removal-chimney-animal-removal-bird-removal-from-chimney-raccoon-removal-chimney-chimney-wildlife-removal` | 52 | `chimney-animal-removal-chimney-animal-removal-bird-removal-from-chimney-raccoon-removal-chimney-chimney-wildlife-removal-in-%` |
| `chimney-chase-cover-chimney-chase-cover-installation-chimney-chase-cover-replacement-chimney-chase-cover-repair-stainless-steel-chimney-chase-cover` | 49 | `chimney-chase-cover-chimney-chase-cover-installation-chimney-chase-cover-replacement-chimney-chase-cover-repair-stainless-steel-chimney-chase-cover-in-%` |
| `chimney-sweep-fireplace-services` | 43 | `chimney-sweep-fireplace-services-in-%` |
| `coal-stove-service-coal-stove-service-coal-stove-repair-coal-stove-cleaning-coal-stove-maintenance` | 40 | `coal-stove-service-coal-stove-service-coal-stove-repair-coal-stove-cleaning-coal-stove-maintenance-in-%` |
| `chimney-camera-inspection-chimney-camera-inspection-video-chimney-inspection-chimney-inspection-camera-flue-camera-inspection` | 34 | `chimney-camera-inspection-chimney-camera-inspection-video-chimney-inspection-chimney-inspection-camera-flue-camera-inspection-in-%` |
| `fireplace-damper-repair-fireplace-damper-repair-chimney-damper-repair-damper-replacement-fireplace-stuck-fireplace-damper` | 29 | `fireplace-damper-repair-fireplace-damper-repair-chimney-damper-repair-damper-replacement-fireplace-stuck-fireplace-damper-in-%` |
| `fireplace-damper-installation-fireplace-damper-installation-chimney-damper-installation-top-mount-damper-installation` | 25 | `fireplace-damper-installation-fireplace-damper-installation-chimney-damper-installation-top-mount-damper-installation-in-%` |
| `fireplace-smoke-repair-fireplace-smoke-repair-fireplace-smoke-backup-fireplace-draft-repair-smoke-issues-fireplace` | 23 | `fireplace-smoke-repair-fireplace-smoke-repair-fireplace-smoke-backup-fireplace-draft-repair-smoke-issues-fireplace-in-%` |
| `heat-shield-repair` | 19 | `heat-shield-repair-in-%` |
| `liners-repair` | 19 | `liners-repair-in-%` |
| `caps-rain-pans-repair` | 18 | `caps-rain-pans-repair-in-%` |
| `gas-fireplace-insert-repair` | 16 | `gas-fireplace-insert-repair-in-%` |
| `chimney-nest-removal-chimney-nest-removal-bird-nest-removal-chimney-chimney-nest-cleaning-animal-nest-chimney-removal` | 13 | `chimney-nest-removal-chimney-nest-removal-bird-nest-removal-chimney-chimney-nest-cleaning-animal-nest-chimney-removal-in-%` |
| `wood-stoves-installation` | 13 | `wood-stoves-installation-in-%` |
| `chimney-liner-repair-chimney-liner-repair-chimney-liner-damage-repair-chimney-flue-liner-repair-chimney-liner-crack-repair` | 12 | `chimney-liner-repair-chimney-liner-repair-chimney-liner-damage-repair-chimney-flue-liner-repair-chimney-liner-crack-repair-in-%` |
| `top-sealing-damper-installation-chimney-damper-replacement-chimney-damper-upgrade-top-mount-damper` | 11 | `top-sealing-damper-installation-chimney-damper-replacement-chimney-damper-upgrade-top-mount-damper-in-%` |
| `fireplace-inserts-repair` | 10 | `fireplace-inserts-repair-in-%` |

## Using a pattern

Stage 1 takes any SQL `LIKE` pattern against the slug, so any row above can be pasted in:

```bash
python3 scripts/stage1_select_urls.py --pattern 'chimney-sweep-repair-in-%' --limit 25
python3 scripts/stage1_select_urls.py --pattern '%-mn' --limit 25          # one state
python3 scripts/stage1_select_urls.py --pattern 'chimney-inspection-in-%-ca' --limit 25
```

Combining a service and a state narrows to one cell of the grid, which is usually the right
size for a trial run.
