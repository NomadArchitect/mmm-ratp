/*
 * This file is part of MMM-RATP (https://gitlab.com/closingin/mmm-ratp)
 * Copyright (C) 2020 Rémi Weislinger
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const phin = require('phin');

/**
 * apiRequest - Wrapper to use for API calls
 *
 * @param {String} path The path to add at the end of the API endpoint
 *
 * @returns {Promise<(Object|Array)>} A promise resolving with the data returned from the API, parsed as JSON
 */
exports.apiRequest = function (path) {
  const url = `https://api-ratp.pierre-grimaud.fr/v4${path}`;

  return phin({
    parse: 'json',
    method: 'GET',
    url
  }).then((resp) => resp.body);
};

/**
 * parseWaitingTime - Transform the raw waiting time from the API to a usable one
 *
 * @param {String} text The text to parse
 *
 * @returns {?String} The parsed waiting time, or null if the timetable is unavailable
 */
exports.parseWaitingTime = function (text) {
  if (text === 'Schedules unavailable') return null;

  // NOTE: Yep, sometimes there's an accent on the "a", and sometimes not...
  if (/^Train (a|à) (quai|l'approche)$/i.test(text)) return 0;

  // NOTE: This format is the most common one, where the waiting time is just
  //       formatted as minutes until pass.
  if (/^[0-9]+ mn$/i.test(text)) return Number(text.replace(/ mn/gi, ''));

  // NOTE: This format can be found on RERs, where the waiting time is formatted
  //       as HH:mm, which is the time at which the train will arrive.
  if (text.indexOf(':') !== -1) {
    const now = new Date();
    const passingTime = new Date(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${text.split(' ')[0]}`);

    return Math.round((passingTime - now) / 60000);
  }

  return null;
};

/**
 * parseTrafficStatus - Transform the raw traffic status from the API to a usable one
 *
 * @param {String} text The text to parse
 *
 * @returns {String} The parsed traffic status
 */
exports.parseTrafficStatus = function (text) {
  switch (text) {
    case 'normal_trav':
      return 'work';
    case 'alerte':
      return 'protest';
    case 'critical':
      return 'incident';
    default:
      return text;
  }
};

/**
 * isWaitingTimeValid - Check if a given waiting time is valid or not
 *
 * @param {?String} time The time to check
 *
 * @returns {Boolean} true if the given time is valid, false otherwise
 */
exports.isWaitingTimeValid = function (time) {
  return time === null || time >= 0;
};

/**
 * isTimetableAvailable - Check if a given timetable is available or not
 *
 * @param {Object[]} timetable The timetable to check
 *
 * @returns {Boolean} true if the given timetable is valid, false otherwise
 */
exports.isTimetableAvailable = function (timetable) {
  return timetable.length && timetable[0].waiting !== null;
};

/**
 * formatLineType - Transform the given line type to an api-compatible type
 *
 * @param {String} type The line type (ex: bus, rer, ...)
 *
 * @returns {String} An api-compatible line type
 */
exports.formatLineType = function (type) {
  switch (type) {
    case 'bus':
      return 'buses';
    case 'metro':
      return 'metros';
    case 'rer':
      return 'rers';
    case 'tramway':
      return 'tramways';
  }
};
