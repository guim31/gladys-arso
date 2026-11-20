# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- The official weather of Slovenia from ARSO (meteo.si) open data, without account or key.
- Station device: the last reading of the nearest ARSO automatic station (or a chosen one), with
  only what it measures: temperature, dew point, humidity, sea-level pressure, wind, gusts,
  direction, rain intensity, snow depth.
- Place device: weather, minimum and maximum of today and tomorrow (regional forecast), tomorrow's
  gusts, and the warning levels in force in the warning area, overall and per type, with a text
  summary.
- Scene trigger "New ARSO warning", with filters on type and level.
- Dashboard widget "ARSO weather": station readings, coming days, warnings, today and tomorrow.
- Configuration actions "List the nearest stations" and "Check the connection" (shown in red on
  failure).
- English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-arso/commits/main
