// -----------------------------------------------------------------------------
// Every text the integration produces, in the four languages of the Gladys
// interface: English, French, German (informal "du") and Spanish (formal
// "usted"). Feature names follow the `language` of the configuration (they are
// frozen once the device is created); widget texts follow the language of the
// dashboard. test/i18n.test.js checks every table. Brand names (ARSO) are
// never translated.
// -----------------------------------------------------------------------------

import { LANGUAGES } from './config.js';

/** Feature names, by language then feature key. */
export const FEATURE_NAMES = {
  en: {
    temperature: 'Temperature',
    dew_point: 'Dew point',
    humidity: 'Humidity',
    pressure: 'Pressure (sea level)',
    wind_speed: 'Wind speed',
    wind_gust: 'Wind gusts',
    wind_direction: 'Wind direction',
    rain_rate: 'Rain intensity',
    snow_depth: 'Snow depth',
    condition: 'Weather today',
    today_min: 'Minimum today',
    today_max: 'Maximum today',
    tomorrow_condition: 'Weather tomorrow',
    tomorrow_min: 'Minimum tomorrow',
    tomorrow_max: 'Maximum tomorrow',
    tomorrow_gust: 'Gusts tomorrow',
    warning_level: 'Warning level',
    warning_wind: 'Wind warning',
    warning_rain: 'Rain warning',
    warning_thunderstorm: 'Thunderstorm warning',
    warning_snow_ice: 'Snow warning',
    warning_ice: 'Glaze warning',
    warning_heat: 'Heat warning',
    warning_cold: 'Cold warning',
    warning_forest_fire: 'Forest fire warning',
    warnings: 'Weather warnings',
  },
  fr: {
    temperature: 'Température',
    dew_point: 'Point de rosée',
    humidity: 'Humidité',
    pressure: 'Pression (niveau de la mer)',
    wind_speed: 'Vitesse du vent',
    wind_gust: 'Rafales',
    wind_direction: 'Direction du vent',
    rain_rate: 'Intensité de pluie',
    snow_depth: 'Hauteur de neige',
    condition: "Temps aujourd'hui",
    today_min: "Minimale aujourd'hui",
    today_max: "Maximale aujourd'hui",
    tomorrow_condition: 'Temps demain',
    tomorrow_min: 'Minimale demain',
    tomorrow_max: 'Maximale demain',
    tomorrow_gust: 'Rafales demain',
    warning_level: "Niveau d'avertissement",
    warning_wind: 'Avertissement vent',
    warning_rain: 'Avertissement pluie',
    warning_thunderstorm: 'Avertissement orage',
    warning_snow_ice: 'Avertissement neige',
    warning_ice: 'Avertissement verglas',
    warning_heat: 'Avertissement canicule',
    warning_cold: 'Avertissement grand froid',
    warning_forest_fire: 'Avertissement feux de forêt',
    warnings: 'Avertissements météo',
  },
  de: {
    temperature: 'Temperatur',
    dew_point: 'Taupunkt',
    humidity: 'Luftfeuchtigkeit',
    pressure: 'Luftdruck (Meeresniveau)',
    wind_speed: 'Windgeschwindigkeit',
    wind_gust: 'Windböen',
    wind_direction: 'Windrichtung',
    rain_rate: 'Regenintensität',
    snow_depth: 'Schneehöhe',
    condition: 'Wetter heute',
    today_min: 'Minimum heute',
    today_max: 'Maximum heute',
    tomorrow_condition: 'Wetter morgen',
    tomorrow_min: 'Minimum morgen',
    tomorrow_max: 'Maximum morgen',
    tomorrow_gust: 'Böen morgen',
    warning_level: 'Warnstufe',
    warning_wind: 'Windwarnung',
    warning_rain: 'Regenwarnung',
    warning_thunderstorm: 'Gewitterwarnung',
    warning_snow_ice: 'Schneewarnung',
    warning_ice: 'Glatteiswarnung',
    warning_heat: 'Hitzewarnung',
    warning_cold: 'Kältewarnung',
    warning_forest_fire: 'Waldbrandwarnung',
    warnings: 'Wetterwarnungen',
  },
  es: {
    temperature: 'Temperatura',
    dew_point: 'Punto de rocío',
    humidity: 'Humedad',
    pressure: 'Presión (nivel del mar)',
    wind_speed: 'Velocidad del viento',
    wind_gust: 'Ráfagas',
    wind_direction: 'Dirección del viento',
    rain_rate: 'Intensidad de lluvia',
    snow_depth: 'Espesor de nieve',
    condition: 'Tiempo hoy',
    today_min: 'Mínima hoy',
    today_max: 'Máxima hoy',
    tomorrow_condition: 'Tiempo mañana',
    tomorrow_min: 'Mínima mañana',
    tomorrow_max: 'Máxima mañana',
    tomorrow_gust: 'Ráfagas mañana',
    warning_level: 'Nivel de alerta',
    warning_wind: 'Alerta de viento',
    warning_rain: 'Alerta de lluvia',
    warning_thunderstorm: 'Alerta de tormenta',
    warning_snow_ice: 'Alerta de nieve',
    warning_ice: 'Alerta de hielo',
    warning_heat: 'Alerta de calor',
    warning_cold: 'Alerta de frío',
    warning_forest_fire: 'Alerta de incendio forestal',
    warnings: 'Alertas meteorológicas',
  },
};

/** Warning types, by language then type key (ARSO glaze = "ice"). */
export const WARNING_TYPE_NAMES = {
  en: {
    wind: 'Wind',
    rain: 'Rain',
    thunderstorm: 'Thunderstorm',
    snow_ice: 'Snow',
    ice: 'Glaze',
    heat: 'Heat',
    cold: 'Cold',
    forest_fire: 'Forest fire',
    fog: 'Fog',
    avalanche: 'Avalanche',
    coastal: 'Coastal event',
    flood: 'Flood',
    other: 'Weather',
  },
  fr: {
    wind: 'Vent',
    rain: 'Pluie',
    thunderstorm: 'Orage',
    snow_ice: 'Neige',
    ice: 'Verglas',
    heat: 'Canicule',
    cold: 'Grand froid',
    forest_fire: 'Feux de forêt',
    fog: 'Brouillard',
    avalanche: 'Avalanche',
    coastal: 'Submersion',
    flood: 'Inondation',
    other: 'Météo',
  },
  de: {
    wind: 'Wind',
    rain: 'Regen',
    thunderstorm: 'Gewitter',
    snow_ice: 'Schnee',
    ice: 'Glatteis',
    heat: 'Hitze',
    cold: 'Kälte',
    forest_fire: 'Waldbrand',
    fog: 'Nebel',
    avalanche: 'Lawinen',
    coastal: 'Küstenereignis',
    flood: 'Hochwasser',
    other: 'Wetter',
  },
  es: {
    wind: 'Viento',
    rain: 'Lluvia',
    thunderstorm: 'Tormenta',
    snow_ice: 'Nieve',
    ice: 'Hielo',
    heat: 'Calor',
    cold: 'Frío',
    forest_fire: 'Incendio forestal',
    fog: 'Niebla',
    avalanche: 'Aludes',
    coastal: 'Fenómeno costero',
    flood: 'Inundación',
    other: 'Tiempo',
  },
};

/** Warning levels, by language then level key. */
export const WARNING_LEVEL_NAMES = {
  en: { yellow: 'Yellow', orange: 'Orange', red: 'Red' },
  fr: { yellow: 'Jaune', orange: 'Orange', red: 'Rouge' },
  de: { yellow: 'Gelb', orange: 'Orange', red: 'Rot' },
  es: { yellow: 'Amarilla', orange: 'Naranja', red: 'Roja' },
};

/** Sky cover of the ARSO icons (`nn_icon`). */
export const SKY_NAMES = {
  en: {
    clear: 'Clear',
    mostClear: 'Mostly clear',
    slCloudy: 'Slightly cloudy',
    partCloudy: 'Partly cloudy',
    modCloudy: 'Moderately cloudy',
    prevCloudy: 'Mostly cloudy',
    overcast: 'Overcast',
    FG: 'Fog',
  },
  fr: {
    clear: 'Ciel clair',
    mostClear: 'Peu nuageux',
    slCloudy: 'Légèrement nuageux',
    partCloudy: 'Partiellement nuageux',
    modCloudy: 'Assez nuageux',
    prevCloudy: 'Très nuageux',
    overcast: 'Couvert',
    FG: 'Brouillard',
  },
  de: {
    clear: 'Wolkenlos',
    mostClear: 'Heiter',
    slCloudy: 'Leicht bewölkt',
    partCloudy: 'Wolkig',
    modCloudy: 'Mäßig bewölkt',
    prevCloudy: 'Stark bewölkt',
    overcast: 'Bedeckt',
    FG: 'Nebel',
  },
  es: {
    clear: 'Despejado',
    mostClear: 'Poco nuboso',
    slCloudy: 'Ligeramente nuboso',
    partCloudy: 'Parcialmente nuboso',
    modCloudy: 'Nuboso',
    prevCloudy: 'Muy nuboso',
    overcast: 'Cubierto',
    FG: 'Niebla',
  },
};

/** Weather phenomena of the ARSO icons (`wwsyn_icon`, METAR-like codes). */
export const WEATHER_NAMES = {
  en: {
    FG: 'Fog',
    DZ: 'Drizzle',
    FZDZ: 'Freezing drizzle',
    RA: 'Rain',
    FZRA: 'Freezing rain',
    RASN: 'Rain and snow',
    SN: 'Snow',
    SHRA: 'Showers',
    SHRASN: 'Rain and snow showers',
    SHSN: 'Snow showers',
    SHGR: 'Hail showers',
    TS: 'Thunderstorm',
    TSRA: 'Thunderstorm with rain',
    TSRASN: 'Thunderstorm with sleet',
    TSSN: 'Thunderstorm with snow',
    TSGR: 'Thunderstorm with hail',
  },
  fr: {
    FG: 'Brouillard',
    DZ: 'Bruine',
    FZDZ: 'Bruine verglaçante',
    RA: 'Pluie',
    FZRA: 'Pluie verglaçante',
    RASN: 'Pluie et neige',
    SN: 'Neige',
    SHRA: 'Averses',
    SHRASN: 'Averses de pluie et neige',
    SHSN: 'Averses de neige',
    SHGR: 'Averses de grêle',
    TS: 'Orage',
    TSRA: 'Orage avec pluie',
    TSRASN: 'Orage avec pluie et neige',
    TSSN: 'Orage avec neige',
    TSGR: 'Orage avec grêle',
  },
  de: {
    FG: 'Nebel',
    DZ: 'Nieselregen',
    FZDZ: 'Gefrierender Nieselregen',
    RA: 'Regen',
    FZRA: 'Gefrierender Regen',
    RASN: 'Schneeregen',
    SN: 'Schneefall',
    SHRA: 'Regenschauer',
    SHRASN: 'Schneeregenschauer',
    SHSN: 'Schneeschauer',
    SHGR: 'Hagelschauer',
    TS: 'Gewitter',
    TSRA: 'Gewitter mit Regen',
    TSRASN: 'Gewitter mit Schneeregen',
    TSSN: 'Gewitter mit Schnee',
    TSGR: 'Gewitter mit Hagel',
  },
  es: {
    FG: 'Niebla',
    DZ: 'Llovizna',
    FZDZ: 'Llovizna helada',
    RA: 'Lluvia',
    FZRA: 'Lluvia helada',
    RASN: 'Aguanieve',
    SN: 'Nieve',
    SHRA: 'Chubascos',
    SHRASN: 'Chubascos de aguanieve',
    SHSN: 'Chubascos de nieve',
    SHGR: 'Chubascos de granizo',
    TS: 'Tormenta',
    TSRA: 'Tormenta con lluvia',
    TSRASN: 'Tormenta con aguanieve',
    TSSN: 'Tormenta con nieve',
    TSGR: 'Tormenta con granizo',
  },
};

/** Intensity of a phenomenon (`light`, `mod`, `heavy` prefixes); moderate says nothing. */
export const INTENSITY_NAMES = {
  en: { light: 'light', heavy: 'heavy' },
  fr: { light: 'faible', heavy: 'fort' },
  de: { light: 'leicht', heavy: 'stark' },
  es: { light: 'débil', heavy: 'fuerte' },
};

/** Fixed messages, each a multi-language object. */
export const TEXT = {
  noWarning: {
    en: 'No warning',
    fr: 'Aucun avertissement',
    de: 'Keine Warnung',
    es: 'Ninguna alerta',
  },
  initFailed: {
    en: 'Initialization failed, check the integration logs.',
    fr: "L'initialisation a échoué, consultez les journaux de l'intégration.",
    de: 'Die Initialisierung ist fehlgeschlagen, sieh in den Protokollen der Integration nach.',
    es: 'La inicialización ha fallado, consulte los registros de la integración.',
  },
  notConfigured: {
    en: 'No location: set the coordinates of a Gladys house, or pick a house, coordinates or a station.',
    fr: "Aucun lieu : renseignez la position d'une maison Gladys, ou choisissez une maison, des coordonnées ou une station.",
    de: 'Kein Ort: Lege die Position eines Gladys-Zuhauses fest oder wähle ein Zuhause, Koordinaten oder eine Station.',
    es: 'Ningún lugar: defina la posición de una casa de Gladys, o elija una casa, coordenadas o una estación.',
  },
  coordinatesInvalid: {
    en: 'The latitude and longitude are not readable: type two numbers, such as 46.05 and 14.51.',
    fr: 'Latitude et longitude illisibles : saisissez deux nombres, comme 46,05 et 14,51.',
    de: 'Breiten- und Längengrad sind nicht lesbar: Gib zwei Zahlen ein, etwa 46,05 und 14,51.',
    es: 'La latitud y la longitud no son legibles: escriba dos números, como 46,05 y 14,51.',
  },
  stationIdInvalid: {
    en: 'The station id looks like LJUBL-ANA_BEZIGRAD: use the "List the nearest stations" action.',
    fr: "L'identifiant de station ressemble à LJUBL-ANA_BEZIGRAD : utilisez l'action « Lister les stations proches ».",
    de: 'Die Stations-ID sieht aus wie LJUBL-ANA_BEZIGRAD: Nutze die Aktion „Nächste Stationen anzeigen“.',
    es: 'El identificador de estación se parece a LJUBL-ANA_BEZIGRAD: use la acción «Listar las estaciones cercanas».',
  },
  houseNotFound: {
    en: 'The chosen house no longer exists or has no position: pick it again, or set its position in Gladys.',
    fr: "La maison choisie n'existe plus ou n'a pas de position : choisissez-la de nouveau, ou placez-la dans Gladys.",
    de: 'Das gewählte Zuhause gibt es nicht mehr oder es hat keine Position: Wähle es erneut oder lege seine Position in Gladys fest.',
    es: 'La casa elegida ya no existe o no tiene posición: elíjala de nuevo, o defina su posición en Gladys.',
  },
  outsideArea: {
    en: 'This location is outside Slovenia: ARSO forecasts and warnings only cover Slovenia.',
    fr: 'Ce lieu est hors de Slovénie : les prévisions et avertissements de l’ARSO ne couvrent que la Slovénie.',
    de: 'Dieser Ort liegt außerhalb Sloweniens: Vorhersagen und Warnungen der ARSO gelten nur für Slowenien.',
    es: 'Este lugar está fuera de Eslovenia: las previsiones y alertas de ARSO solo cubren Eslovenia.',
  },
  stationUnknown: {
    en: 'This station id is not among the ARSO automatic stations: use the "List the nearest stations" action.',
    fr: "Cet identifiant ne correspond à aucune station automatique de l'ARSO : utilisez l'action « Lister les stations proches ».",
    de: 'Diese ID gehört zu keiner automatischen ARSO-Station: Nutze die Aktion „Nächste Stationen anzeigen“.',
    es: 'Este identificador no corresponde a ninguna estación automática de ARSO: use la acción «Listar las estaciones cercanas».',
  },
  unreachable: {
    en: 'ARSO does not answer: the values will be updated when it is back.',
    fr: "L'ARSO ne répond pas : les valeurs seront mises à jour à son retour.",
    de: 'Die ARSO antwortet nicht: Die Werte werden aktualisiert, sobald der Dienst zurück ist.',
    es: 'ARSO no responde: los valores se actualizarán cuando vuelva.',
  },
};

/** Texts of the widget, by language. */
export const WIDGET_TEXT = {
  en: {
    humidity: 'Humidity',
    wind: 'Wind',
    gusts: 'Gusts',
    temperature: 'Temperature',
    forecastChart: 'Coming days',
    minimum: 'Minimum',
    maximum: 'Maximum',
    warnings: 'Warnings',
    none: 'None',
    today: 'Today',
    tomorrow: 'Tomorrow',
    until: 'until',
    from: 'from',
    source: 'Source: ARSO',
    notConfigured: 'Set the location in the integration configuration.',
    waiting: 'Waiting for the first ARSO data…',
  },
  fr: {
    humidity: 'Humidité',
    wind: 'Vent',
    gusts: 'Rafales',
    temperature: 'Température',
    forecastChart: 'Prochains jours',
    minimum: 'Minimale',
    maximum: 'Maximale',
    warnings: 'Avertissements',
    none: 'Aucun',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    until: "jusqu'à",
    from: 'à partir de',
    source: 'Source : ARSO',
    notConfigured: "Indiquez le lieu dans la configuration de l'intégration.",
    waiting: "En attente des premières données de l'ARSO…",
  },
  de: {
    humidity: 'Feuchte',
    wind: 'Wind',
    gusts: 'Böen',
    temperature: 'Temperatur',
    forecastChart: 'Nächste Tage',
    minimum: 'Minimum',
    maximum: 'Maximum',
    warnings: 'Warnungen',
    none: 'Keine',
    today: 'Heute',
    tomorrow: 'Morgen',
    until: 'bis',
    from: 'ab',
    source: 'Quelle: ARSO',
    notConfigured: 'Lege den Ort in der Konfiguration der Integration fest.',
    waiting: 'Warte auf die ersten ARSO-Daten…',
  },
  es: {
    humidity: 'Humedad',
    wind: 'Viento',
    gusts: 'Ráfagas',
    temperature: 'Temperatura',
    forecastChart: 'Próximos días',
    minimum: 'Mínima',
    maximum: 'Máxima',
    warnings: 'Alertas',
    none: 'Ninguna',
    today: 'Hoy',
    tomorrow: 'Mañana',
    until: 'hasta',
    from: 'desde',
    source: 'Fuente: ARSO',
    notConfigured: 'Indique el lugar en la configuración de la integración.',
    waiting: 'Esperando los primeros datos de ARSO…',
  },
};

/** Texts of the configuration actions, by language. */
export const ACTION_TEXT = {
  en: {
    nearest: (where) => `Nearest ARSO stations to ${where}:`,
    station: (s) => `${s.id} ${s.name} (${s.altitude} m) — ${s.distance} km`,
    copy: 'Copy an id into "Station" and save, or leave it empty for the nearest one.',
    checkOk: (parts) => `ARSO answers. ${parts}`,
    observation: (label, value, time) => `${label}: ${value} °C at ${time}.`,
    forecastOk: (region) => `Forecast: ${region}.`,
    warningsCount: (area, count) => `${area}: ${count} warning(s) in force or announced.`,
    failed: (what, reason) => `${what} failed: ${reason}.`,
    stationPart: 'Station',
    forecastPart: 'Forecast',
    warningsPart: 'Warnings',
    yourHouse: (name) => `the house “${name}”`,
    coordinates: 'the configured coordinates',
  },
  fr: {
    nearest: (where) => `Stations ARSO les plus proches de ${where} :`,
    station: (s) => `${s.id} ${s.name} (${s.altitude} m) — ${s.distance} km`,
    copy: 'Copiez un identifiant dans « Station » et enregistrez, ou laissez vide pour la plus proche.',
    checkOk: (parts) => `L'ARSO répond. ${parts}`,
    observation: (label, value, time) => `${label} : ${value} °C à ${time}.`,
    forecastOk: (region) => `Prévisions : ${region}.`,
    warningsCount: (area, count) => `${area} : ${count} avertissement(s) en cours ou annoncé(s).`,
    failed: (what, reason) => `${what} : échec (${reason}).`,
    stationPart: 'Station',
    forecastPart: 'Prévisions',
    warningsPart: 'Avertissements',
    yourHouse: (name) => `la maison « ${name} »`,
    coordinates: 'les coordonnées saisies',
  },
  de: {
    nearest: (where) => `Nächste ARSO-Stationen – ${where}:`,
    station: (s) => `${s.id} ${s.name} (${s.altitude} m) — ${s.distance} km`,
    copy: 'Kopiere eine ID in „Station“ und speichere, oder lass das Feld leer für die nächste.',
    checkOk: (parts) => `Die ARSO antwortet. ${parts}`,
    observation: (label, value, time) => `${label}: ${value} °C um ${time}.`,
    forecastOk: (region) => `Vorhersage: ${region}.`,
    warningsCount: (area, count) => `${area}: ${count} Warnung(en) aktiv oder angekündigt.`,
    failed: (what, reason) => `${what} fehlgeschlagen: ${reason}.`,
    stationPart: 'Station',
    forecastPart: 'Vorhersage',
    warningsPart: 'Warnungen',
    yourHouse: (name) => `Zuhause „${name}“`,
    coordinates: 'eingegebene Koordinaten',
  },
  es: {
    nearest: (where) => `Estaciones de ARSO más cercanas a ${where}:`,
    station: (s) => `${s.id} ${s.name} (${s.altitude} m) — ${s.distance} km`,
    copy: 'Copie un identificador en «Estación» y guarde, o déjelo vacío para la más cercana.',
    checkOk: (parts) => `ARSO responde. ${parts}`,
    observation: (label, value, time) => `${label}: ${value} °C a las ${time}.`,
    forecastOk: (region) => `Previsión: ${region}.`,
    warningsCount: (area, count) => `${area}: ${count} alerta(s) en vigor o anunciada(s).`,
    failed: (what, reason) => `${what}: error (${reason}).`,
    stationPart: 'Estación',
    forecastPart: 'Previsión',
    warningsPart: 'Alertas',
    yourHouse: (name) => `la casa «${name}»`,
    coordinates: 'las coordenadas indicadas',
  },
};

/** The language to use, English for anything Gladys may send we do not know. */
export const pickLanguage = (language) => (LANGUAGES.includes(language) ? language : 'en');

/**
 * Localized weather of a forecast day: the phenomenon when there is one
 * ("Rain (light)"), the sky cover otherwise; null when unknown.
 * @param {{ sky: string | null, intensity: string | null, weather: string | null }} condition
 */
export function conditionName(condition, language) {
  const lang = pickLanguage(language);
  const weather = condition?.weather ? WEATHER_NAMES[lang][condition.weather] : null;
  if (weather) {
    const intensity = INTENSITY_NAMES[lang][condition.intensity];
    return intensity ? `${weather} (${intensity})` : weather;
  }
  return (condition?.sky && SKY_NAMES[lang][condition.sky]) || null;
}

/** A decimal number with the separator of the language: 8.6 → "8,6" in French. */
export const formatNumber = (value, language, digits = 1) =>
  new Intl.NumberFormat(pickLanguage(language), { maximumFractionDigits: digits }).format(value);

/** "Orange · Wind" */
export function warningLabel(warning, language) {
  const lang = pickLanguage(language);
  const level = WARNING_LEVEL_NAMES[lang][['', 'yellow', 'orange', 'red'][warning.level]];
  return `${level} · ${WARNING_TYPE_NAMES[lang][warning.type] ?? WARNING_TYPE_NAMES[lang].other}`;
}

/** A short local date and time: "Tue 18:00" in the Gladys time zone. */
export function formatWhen(time, language, timeZone, now) {
  const lang = pickLanguage(language);
  const sameDay =
    new Date(time).toLocaleDateString('en-CA', { timeZone }) ===
    new Date(now).toLocaleDateString('en-CA', { timeZone });
  return new Intl.DateTimeFormat(lang, {
    timeZone,
    ...(sameDay ? {} : { weekday: 'short' }),
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time));
}

/** A short local day: "Mon 23" (a forecast date, YYYY-MM-DD). */
export function formatDay(date, language) {
  return new Intl.DateTimeFormat(pickLanguage(language), {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
}
