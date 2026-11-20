// -----------------------------------------------------------------------------
// The dashboard widget "ARSO weather": the station's readings, the minimum and
// maximum of the coming days, the warnings and the forecast in words. Built
// from what the last refresh read (no request of its own), in the language and
// the unit system of the dashboard: the core caches the content per language
// and units, pre-localizing it here is the expected design.
//
// Budget of the core: 8 components at most, 2 texts, 6 tiles, 1 focal, 1
// status list. This content uses 8: heading, 4 tiles, chart, status, caption.
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { forecastDays, warningsAhead } from './arso/model.js';
import {
  TEXT,
  WIDGET_TEXT,
  conditionName,
  formatNumber,
  formatWhen,
  pickLanguage,
  warningLabel,
} from './i18n.js';

/** Widget key: forever. */
export const WIDGET_KEY = 'weather';

// Content lifetime: the data moves every 10 minutes; the service also nudges
// the widget after each refresh that changed something.
const TTL_SECONDS = 600;

const LEVEL_COLORS = {
  1: WIDGET_COLORS.WARNING,
  2: WIDGET_COLORS.WARNING,
  3: WIDGET_COLORS.DANGER,
};

const round = (value) => Math.round(value * 10) / 10;

/** Metric values, converted for a dashboard in US units. */
function unitsOf(units) {
  const us = units === 'us';
  return {
    temperature: (celsius) => (us ? round((celsius * 9) / 5 + 32) : celsius),
    temperatureUnit: us ? '°F' : '°C',
    speed: (kmh) => (us ? round(kmh / 1.609344) : kmh),
    speedUnit: us ? 'mph' : 'km/h',
  };
}

const textOnly = (text) => ({
  ttl_seconds: 60,
  components: [{ type: 'text', variant: 'body', text }],
});

/** "Rain (light) · 3 – 12 °C" */
function dayLine(day, convert, lang) {
  if (!day) {
    return null;
  }
  const n = (value) => formatNumber(convert.temperature(value), lang);
  const parts = [];
  const condition = conditionName(day.condition, lang);
  if (condition) {
    parts.push(condition);
  }
  if (day.min !== null && day.max !== null) {
    parts.push(`${n(day.min)} – ${n(day.max)} ${convert.temperatureUnit}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * @param {ReturnType<ReturnType<import('./service.js').createService>['snapshot']>} snapshot
 * @param {{ language: string, units: string, now: number, timeZone?: string }} context
 */
export function buildWeatherContent(snapshot, { language, units, now, timeZone }) {
  const lang = pickLanguage(language);
  const t = WIDGET_TEXT[lang];
  const { target, observation, region, warnings, title } = snapshot;
  if (!target || (!target.station && !target.place)) {
    return textOnly(
      target?.problem && TEXT[target.problem] ? TEXT[target.problem][lang] : t.notConfigured,
    );
  }
  if (!observation && !region && !warnings) {
    return textOnly(t.waiting);
  }
  const convert = unitsOf(units);
  const components = [
    {
      type: 'text',
      variant: 'heading',
      text: String(title ?? target.place?.name ?? target.station.name).slice(0, 40),
    },
  ];

  const values = observation?.values ?? {};
  const tile = (label, value, unit, icon) =>
    value === undefined ? null : { type: 'value', label, value, unit, icon };
  components.push(
    ...[
      tile(
        t.temperature,
        values.temperature === undefined ? undefined : convert.temperature(values.temperature),
        convert.temperatureUnit,
        'thermometer',
      ),
      tile(
        t.humidity,
        values.humidity === undefined ? undefined : Math.round(values.humidity),
        '%',
        'droplet',
      ),
      tile(
        t.wind,
        values.wind_speed === undefined ? undefined : convert.speed(values.wind_speed),
        convert.speedUnit,
        'wind',
      ),
      tile(
        t.gusts,
        values.wind_gust === undefined ? undefined : convert.speed(values.wind_gust),
        convert.speedUnit,
        'wind',
      ),
    ].filter(Boolean),
  );

  const days = region ? forecastDays(region, now, timeZone) : null;
  const coming = (days?.all ?? []).filter(
    (day) => day.date >= (days.today?.date ?? '') && day.min !== null && day.max !== null,
  );
  if (coming.length > 1) {
    const series = (name, key) => ({
      name,
      points: coming.map((day) => ({
        t: `${day.date}T12:00:00.000Z`,
        v: convert.temperature(day[key]),
      })),
    });
    components.push({
      type: 'chart',
      chart_type: 'line',
      title: t.forecastChart,
      unit: convert.temperatureUnit,
      series: [series(t.maximum, 'max'), series(t.minimum, 'min')],
    });
  }

  const items = [];
  if (warnings) {
    const ahead = warningsAhead(warnings.warnings, now);
    for (const warning of ahead.slice(0, 6)) {
      const inForce = warning.start <= now;
      items.push({
        label: warningLabel(warning, lang).slice(0, 40),
        value:
          `${inForce ? t.until : t.from} ${formatWhen(inForce ? warning.end : warning.start, lang, timeZone, now)}`.slice(
            0,
            40,
          ),
        color: LEVEL_COLORS[warning.level],
        icon: 'alert-triangle',
      });
    }
    if (ahead.length === 0) {
      items.push({
        label: t.warnings,
        value: t.none,
        color: WIDGET_COLORS.SUCCESS,
        icon: 'check-circle',
      });
    }
  }
  if (days) {
    const today = dayLine(days.today, convert, lang);
    if (today) {
      items.push({ label: t.today, value: today.slice(0, 40), icon: 'sun' });
    }
    const tomorrow = dayLine(days.tomorrow, convert, lang);
    if (tomorrow) {
      items.push({ label: t.tomorrow, value: tomorrow.slice(0, 40), icon: 'calendar' });
    }
  }
  if (items.length > 0) {
    components.push({ type: 'status', items: items.slice(0, 10) });
  }

  // Attribution required by ARSO's reuse terms ("Vir: ARSO").
  const time = observation?.time ? ` · ${formatWhen(observation.time, lang, timeZone, now)}` : '';
  components.push({ type: 'text', variant: 'caption', text: `${t.source}${time}` });
  return { ttl_seconds: TTL_SECONDS, components };
}
