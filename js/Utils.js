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

function debug (isDebugEnabled, moduleIdentifier, ...text) {
  if (!isDebugEnabled) {
    return;
  }

  console.debug(`[MMM-RATP][DEBUG][${moduleIdentifier}]`, ...text);
}

function notificationTypeToLower (notification) {
  return notification.split('_')[1].toLowerCase();
}

function notificationTypeToSentence (notification) {
  const type = notification.split('_')[1];

  return `${type.slice(0, 1)}${type.slice(1).toLowerCase()}`;
}

if (typeof exports !== 'undefined') {
  exports.debug = debug;
}
