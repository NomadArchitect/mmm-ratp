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
 * @property {Boolean} [notify=true] Whether to send a notification on the socket after fetching
 */
const fetchOptions = {
  notify: true
};

const NodeHelper = require('node_helper');
const RATPHelper = require('./js/RATPHelper.js');

module.exports = NodeHelper.create({
  /**
   * start - See https://docs.magicmirror.builders/development/node-helper.html#start
   *
   * @returns {void} This function doesn't return anything
   */
  start () {
    this.prevData = {};
    this.currData = {};
  },

  /**
   * fetchTraffic - Fetches the timetables asked by the user
   *
   * @param {Object[]}     config  Definition of the data to fetch
   * @param {FetchOptions} options Fetch options
   *
   * @returns {Promise<Object[]>} A promise resolving with the fetched data
   */
  fetchTimetables (config, options = fetchOptions) {
    const requests = [];

    config.forEach((entry) => {
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
      this.prevData.timetables = this.currData.timetables;
      this.currData.timetables = timetables.map((station, idx) => {
        // NOTE: If for some unforeseen circumstances it's impossible to get a
        //       timetable, let's try to estimate it based on the last fetched
        //       one
        if (!RATPHelper.isTimetableAvailable(station.timetable)
          && this.prevData.timetables
          && RATPHelper.isTimetableAvailable(this.prevData.timetables[idx].timetable)
        ) {
          station.timetable = [];
          station.requestedAt = this.prevData.timetables[idx].requestedAt;
          station.estimation = true;

          this.prevData.timetables[idx].timetable.forEach((nextPass) => {
            const waitingTime = Math.round(nextPass.waitingTime - ((Date.now() - this.prevData.timetables[idx].requestedAt) / 60000));
            station.timetable.push({ ...nextPass, waitingTime });
          });
        }

        // NOTE: Filter out values that are below zero in some cases:
        //         - when estimating next passes
        //         - when the api returns an invalid value (it can happen apparently)
        station.timetable = station.timetable.filter((nextPass) => RATPHelper.isWaitingTimeValid(nextPass.waitingTime));

        return station;
      });

      if (options.notify) {
        this.sendSocketNotification('DATA_TIMETABLES', this.currData.timetables);
      }

      return this.currData.timetables;
    });
  },

  /**
   * fetchTraffic - Fetches the traffic asked by the user
   *
   * @param {Object[]}     config  Definition of the data to fetch
   * @param {FetchOptions} options Fetch options
   *
   * @returns {Promise<Object[]>} A promise resolving with the fetched data
   */
  fetchTraffic (config, options = fetchOptions) {
    const requests = [];

    config.forEach((entry) => {
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
      this.prevData.traffic = this.currData.traffic;
      this.currData.traffic = traffic;

      if (options.notify) {
        this.sendSocketNotification('DATA_TRAFFIC', this.currData.traffic);
      }

      return this.currData.traffic;
    });
  },

  /**
   * fetchAll - Fetches all the data that the user asked for and notifies back
   *
   * @param {Object}   payload            An object containing the data configuration
   * @param {Object[]} payload.timetables   The timetables configuration
   * @param {Object[]} payload.traffic      The traffic configuration
   *
   * @returns {Promise} A promise resolving with nothing on success
   */
  fetchAll (payload) {
    return Promise.all([
      this.fetchTimetables(payload.timetables, { notify: false }),
      this.fetchTraffic(payload.traffic, { notify: false })
    ]).then(([timetables, traffic]) => {
      this.sendSocketNotification('DATA_ALL', { timetables, traffic });
    });
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
