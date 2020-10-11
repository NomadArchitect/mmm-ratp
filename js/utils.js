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

/**
 * debug - Displays a given text in the console if debug mode is enabled
 *
 * @param {Boolean} isDebugEnabled   Whether debug mode is enabled or not
 * @param {String}  moduleIdentifier The module identifier
 * @param {...*}    data             A variable amount of data to display in the message
 *
 * @returns {void} This function doesn't return anything
 */
function debug (isDebugEnabled, moduleIdentifier, ...data) {
  if (!isDebugEnabled) {
    return;
  }

  console.debug(`[MMM-RATP][DEBUG][${moduleIdentifier}]`, ...data);
}

/**
 * notificationTypeToLower - Retrieve a notification type and transform it to lower case
 *
 * @param {String} notification The notification
 *
 * @returns {String} The notification type, in lower case
 */
function notificationTypeToLower (notification) {
  return notification.split('_')[1].toLowerCase();
}

/**
 * notificationTypeToSentence - Retrieve a notification type and transform it to sentence case
 *
 * @param {String} notification The notification
 *
 * @returns {String} The notification type, in sentence case
 */
function notificationTypeToSentence (notification) {
  const type = notification.split('_')[1];

  return `${type.slice(0, 1)}${type.slice(1).toLowerCase()}`;
}

/**
 * isConfigurationEmpty - Check if the module config contains a valid timetables/traffic config
 *
 * @param {String} type The type to check (possible values: timetables, traffic)
 *
 * @returns {Boolean} true if the configuration is empty or invalid, false otherwise
 */
function isConfigurationEmpty(type, config) {
  if (!config[type] ||
      !Array.isArray(config[type].config) ||
      !config[type].config.length
  ) {
    return true;
  }

  return false;
}

if (typeof exports !== 'undefined') {
  exports.debug = debug;
}
