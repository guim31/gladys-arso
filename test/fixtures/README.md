# Test fixtures

Real ARSO files, read from `meteo.arso.gov.si` on 20 November 2026 around 21:15 UTC, used by the
tests instead of the network. They hold no personal data (public weather data).

| File                        | Source                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observations.xml`          | `observ/surface/text/sl/observationAms_si_latest.xml`, cut to 9 of its 104 stations (Babno Polje: no wind nor pressure; Koper Kapitanija: no rain) |
| `forecast.xml`              | `fproduct/text/en/forecast_si_latest.xml`, cut to 4 of its 15 regions                                                                              |
| `warnings-<AREA>.xml`       | `warning/text/sl/warning_SLOVENIA_<AREA>_latest_CAP.xml`, unchanged; South-West and North-East hold real yellow warnings for 22 November           |
| `gladys-feature-table.json` | Category/type couples, units and poll frequencies the Gladys core knows (from the core code)                                                       |

The tests re-date the observation time to the test clock (`test/helpers/fakeArso.js`).
