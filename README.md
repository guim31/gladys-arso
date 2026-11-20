# ARSO Slovenia for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that brings the
official weather of **Slovenia** from [ARSO](https://meteo.arso.gov.si) (Agencija Republike
Slovenije za okolje, the Slovenian Environment Agency, publisher of meteo.si): the readings of the
automatic weather stations, the daily forecast of the regions and the official weather warnings.
Open data, no account, no API key.

> **Not affiliated with ARSO.** This project only reads the open XML files ARSO publishes on
> meteo.arso.gov.si. Source: ARSO.

## Features

- **Station device**: the last reading of the nearest ARSO automatic station (or the one you
  choose), with only what it measures: temperature, dew point, humidity, sea-level pressure, wind
  speed, gusts and direction, rain intensity, snow depth.
- **Place device**: at your house, the weather, minimum and maximum of today and tomorrow (forecast
  of the nearest of the 15 ARSO regions), tomorrow's strongest gust, and the **warning levels** in
  force in its warning area (overall and per type: wind, rain, thunderstorm, snow, glaze, heat,
  cold, forest fire) with a text summary.
- **Scene trigger** _New ARSO warning_: as soon as ARSO issues a yellow, orange or red warning for
  the area, or raises its level, often a day ahead. Filters on type and level; the scene receives
  the type, level, start, end, area and the official English text.
- **Dashboard widget** _ARSO weather_: the station readings, the minimum and maximum of the coming
  days, the warnings in force and announced, today and tomorrow in words; in the language and units
  of the dashboard.
- **Configuration actions**: _List the nearest stations_ (with their distance) and _Check the
  connection_.
- **Read-only**, in English, French, German and Spanish.

## Requirements

- Gladys Assistant **5.3.0** or later (catalog countries; the configuration picks a Gladys house,
  which needs 5.2.0).
- A place in Slovenia, or within 25 km of its border.
- Internet access from Gladys to `meteo.arso.gov.si`.

## Installation

1. In Gladys, open **Integrations → Install from GitHub** and enter
   `https://github.com/guim31/gladys-arso` (or install it from the store).
2. Accept the **location** permission: the integration reads the position of your house to pick
   the nearest station, region and warning area. The position never leaves Gladys: ARSO publishes
   whole files, the choice is made locally.
3. Open the configuration. Every field is optional: by default the first located house and its
   nearest station are used.
4. In the **Discovery** tab, add the two devices to Gladys.

The user documentation, in four languages, is in [`docs/`](docs/en.md).

## How it works

- **Observations**: `observ/surface/text/sl/observationAms_si_latest.xml`, the last reading of
  every automatic station (about 100), every 10 minutes. Fetched compressed (about 30 KB).
- **Forecast**: `fproduct/text/en/forecast_si_latest.xml`, the daily forecast of the 15 regions
  for 6 days (updated twice a day). The region whose centre is nearest to the place is used.
- **Warnings**: `warning/text/sl/warning_SLOVENIA_<area>_latest_CAP.xml`, CAP 1.2 files of the 5
  warning areas, in Slovenian and English, with the area polygon. The area that contains the place
  is used (the nearest one within 25 km for a place just across the border). Awareness level 1
  (green) means no warning; 2, 3 and 4 become yellow, orange and red.
- The container refreshes by itself on a timer (10 minutes by default): observations and the
  warnings of the area at every refresh, forecast once an hour, the five area polygons once a day
  — about 13 requests an hour. The devices also declare a one-minute `onPoll`, which only acts if
  the timer has stalled (GladysAssistant/Gladys#3198).
- Only the changed values are published, with a heartbeat every 6 hours. The warnings already
  announced to the scenes are kept in `/data/state.json`, so a restart does not fire them again.

## Compared with Meteoalarm

ARSO also feeds [Meteoalarm](https://meteoalarm.org), and
[`gladys-meteoalarm`](https://github.com/guim31/gladys-meteoalarm) covers Slovenia. This
integration reads the warnings at the source, picks the area by its polygon, and adds what
Meteoalarm does not carry: the station readings and the regional forecast. Use one or the other
for the warnings, not both, or your scenes will fire twice.

## Limits

- One place and one station per installation.
- The forecast is regional and daily: ARSO's open files have no hourly forecast at a point.
- Solar radiation and soil temperatures are not published as features (no matching Gladys unit).
- The feature names are set when the devices are created, in the configured language.
- These XML files are published for the meteo.si website; ARSO may change them without notice.
- Weather data: © ARSO, free reuse with the mention of the source
  ([reuse terms](https://meteo.arso.gov.si/uploads/meteo/help/sl/copyright.html)). The widget shows
  it.

## Development

```bash
npm ci
npm run format:check
npm run lint
npm test
```

The tests run against the SDK's fake Gladys and the real ARSO files recorded in
[`test/fixtures`](test/fixtures/README.md); they never touch the network.

Versions and releases belong to the **Release** workflow (Actions → Release): never edit the
`version` of `package.json` or of the manifest by hand. See [`CLAUDE.md`](CLAUDE.md) for the
project rules.

## Credits

- [ARSO](https://meteo.arso.gov.si) for the open data and the
  [XML format notes](https://meteo.arso.gov.si/uploads/meteo/help/sl/xml_service.html).
- The structure of this integration follows
  [`gladys-geosphere`](https://github.com/guim31/gladys-geosphere) (Apache-2.0).
- Cover: the ARSO logo, property of ARSO, shown to identify the data source.

## License

[Apache-2.0](LICENSE)
