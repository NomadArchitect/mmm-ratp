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
 * @typedef FetchOptions
 * @type {Object}
 *
 * @property {Boolean} [notifyOnStart=true]  Whether to send a notification on the socket before fetching
 * @property {Boolean} [notifyOnFinish=true] Whether to send a notification on the socket after fetching
 */
const defaultFetchOptions = {
  notifyOnStart: true,
  notifyOnFinish: true
};

const NodeHelper = require('node_helper');
const RATPHelper = require('./js/ratp_helper');
const {
  debug
} = require('./js/utils');

module.exports = NodeHelper.create({
  /**
   * initializeHelper - Sets up the datastore for the given module
   *
   * @param {String} moduleIdentifier The module that requested the fetch
   * @param {Object} moduleConfig     The module's config object
   *
   * @returns {void} This function doesn't return anything
   */
  initializeHelper (moduleIdentifier, moduleConfig) {
    debug(moduleConfig.debug, moduleIdentifier, 'Initializing helper');

    this[moduleIdentifier] = {
      config: moduleConfig,
      prevData: {},
      currData: {}
    };

    this.sendSocketNotification('HELPER_INITIALIZED', { target: moduleIdentifier });
  },

  /**
   * mergeFetchOptions - Adds missing properties to the given options object
   *
   * @param {FetchOptions} options The fetch options
   *
   * @returns {void} This function doesn't return anything
   */
  mergeFetchOptions (options) {
    Object.keys(defaultFetchOptions).forEach((key) => {
      if (!(key in options)) {
        options[key] = defaultFetchOptions[key];
      }
    });
  },

  /**
   * fetchTimetables - Fetches the timetables asked by the user
   *
   * @param {String}       moduleIdentifier The module that requested the fetch
   * @param {FetchOptions} options          Fetch options
   *
   * @returns {Promise<Object[]>} A promise resolving with the fetched data
   */
  fetchTimetables (moduleIdentifier, options = defaultFetchOptions) {
    this.mergeFetchOptions(options);

    const scope = this[moduleIdentifier];
    const requests = [];

    debug(scope.config.debug, moduleIdentifier, 'Fetching timetables with options', options);

    if (options.notifyOnStart) {
      this.sendSocketNotification('UPDATING_TIMETABLES', { target: moduleIdentifier });
    }

    scope.config.timetables.config.forEach((entry) => {
      const station = RATPHelper.apiRequest(`/stations/${entry.type}s/${entry.line}`)
        .then((stations) => stations.result.stations)
        .then((stations) => stations.find((s) => s.slug === entry.station));

      const timetable = RATPHelper.apiRequest(`/schedules/${entry.type}s/${entry.line}/${entry.station}/${entry.direction}`)
        .then((timetable) => timetable.result.schedules)
        .then((timetable) => timetable.map((nextPass) => ({
          waitingTime: RATPHelper.parseWaitingTime(nextPass.message),
          destination: nextPass.destination
        })));

      requests.push(Promise.all([
        station,
        timetable
      ]).then(([station, timetable]) => ({
        timetable,
        lineType: entry.type,
        lineName: entry.line,
        stationName: station.name,
        requestedAt: Date.now()
      })));
    });

    return Promise.all(requests).then((timetables) => {
      scope.prevData.timetables = scope.currData.timetables;
      scope.currData.timetables = timetables.map((station, idx) => {
        // NOTE: If for some unforeseen circumstances it's impossible to get a
        //       timetable, let's try to estimate it based on the last fetched
        //       one
        if (!RATPHelper.isTimetableAvailable(station.timetable)
          && scope.prevData.timetables
          && RATPHelper.isTimetableAvailable(scope.prevData.timetables[idx].timetable)
        ) {
          station.timetable = [];
          station.requestedAt = scope.prevData.timetables[idx].requestedAt;
          station.isEstimation = true;

          scope.prevData.timetables[idx].timetable.forEach((nextPass) => {
            const waitingTime = Math.round(nextPass.waitingTime - ((Date.now() - scope.prevData.timetables[idx].requestedAt) / 60000));
            station.timetable.push({ ...nextPass, waitingTime });
          });
        }

        // NOTE: Filter out values that are below zero in some cases:
        //         - when estimating next passes
        //         - when the api returns an invalid value (it can happen apparently)
        station.timetable = station.timetable.filter((nextPass) => RATPHelper.isWaitingTimeValid(nextPass.waitingTime));

        if (!station.timetable.length) {
          station.timetable.push({ waitingTime: null, destination: 'Horaires non disponibles' });
        }

        return station;
      });

      if (options.notifyOnFinish) {
        this.sendSocketNotification('DATA_TIMETABLES', {
          target: moduleIdentifier,
          payload: scope.currData.timetables
        });
      }

      return scope.currData.timetables;
    });
  },

  /**
   * fetchTraffic - Fetches the traffic asked by the user
   *
   * @param {String}       moduleIdentifier The module that requested the fetch
   * @param {FetchOptions} options          Fetch options
   *
   * @returns {Promise<Object[]>} A promise resolving with the fetched data
   */
  fetchTraffic (moduleIdentifier, options = defaultFetchOptions) {
    this.mergeFetchOptions(options);

    const scope = this[moduleIdentifier];
    const requests = [];

    debug(scope.config.debug, moduleIdentifier, 'Fetching traffic information with options', options);

    if (options.notifyOnStart) {
      this.sendSocketNotification('UPDATING_TRAFFIC', { target: moduleIdentifier });
    }

    scope.config.traffic.config.forEach((entry) => {
      requests.push(
        RATPHelper.apiRequest(`/traffic/${entry.type}s/${entry.line}`)
          .then((traffic) => traffic.result)
          .then((traffic) => ({
            lineType: entry.type,
            lineName: entry.line,
            lineStatus: RATPHelper.parseTrafficStatus(traffic.slug),
            title: traffic.title,
            message: traffic.message
          }))
      );
    });

    return Promise.all(requests).then((traffic) => {
      scope.prevData.traffic = scope.currData.traffic;
      scope.currData.traffic = traffic;

      if (options.notifyOnFinish) {
        this.sendSocketNotification('DATA_TRAFFIC', {
          target: moduleIdentifier,
          payload: scope.currData.traffic
        });
      }

      return scope.currData.traffic;
    });
  },

  /**
   * fetchAll - Fetches all the data that the user asked for and notifies back
   *
   * @param {String} moduleIdentifier The module that requested the fetch
   *
   * @returns {Promise<Array[]>} A promise resolving with the fetched data on success
   */
  fetchAll (moduleIdentifier) {
    debug(this[moduleIdentifier].config.debug, moduleIdentifier, 'Fetching everything');

    return Promise.all([
      this.fetchTimetables(moduleIdentifier),
      this.fetchTraffic(moduleIdentifier)
    ]);
  },

  /**
   * socketNotificationReceived - See https://docs.magicmirror.builders/development/node-helper.html#socketnotificationreceived-function-notification-payload
   *
   * @param {String} notification The notification identifier
   * @param {*}      payload      The payload attached to the socket message
   *
   * @returns {void} This function doesn't return anything
   */
  socketNotificationReceived (notification, payload) {
    switch (notification) {
      case 'INITIALIZE_HELPER':
        this.initializeHelper(payload.identifier, payload.config);
        break;
      case 'FETCH_ALL':
        this.fetchAll(payload);
        break;
      case 'FETCH_TIMETABLES':
        this.fetchTimetables(payload);
        break;
      case 'FETCH_TRAFFIC':
        this.fetchTraffic(payload);
        break;
      default:
    }
  }
});
