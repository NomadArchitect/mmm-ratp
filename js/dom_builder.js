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
 * DOMBuilder - Dedicated methods to build the DOM of this MagicMirror module
 */
class DOMBuilder {
  /**
   * @static createTimetables - Create a timetables block element
   *
   * @param {Object}   _         An object containing the timetables information
   * @param {Object[]} _.entries   The current timetables
   * @param {Object}   _.status    Additional information about the timetables
   * @param {Object}   config    The module configuration
   *
   * @returns {HTMLElement} The newly created timetables block
   */
  static createTimetables ({ entries, status }, config) {
    const section = DOMBuilder.createSection('timetables', status, config);

    entries.forEach((station) => {
      const card = DOMBuilder.createCard(
        DOMBuilder.createLine(station.lineType, station.lineName),
        {
          title: station.stationName,
          subtitle: `&gt; ${station.timetable[0].destination}`
        },
        DOMBuilder.createTimetable(station.timetable.slice(0, config.timetables.nextPassesAmount), station.isEstimation)
      );

      section.appendChild(card);
    });

    return section;
  }

  /**
   * @static createTraffic - Create a traffic block element
   *
   * @param {Object}   _         An object containing the traffic information
   * @param {Object[]} _.entries   The current traffic
   * @param {Object}   _.status    Additional information about the traffic
   * @param {Object}   config    The module configuration
   *
   * @returns {HTMLElement} The newly created traffic block
   */
  static createTraffic ({ entries, status }, config) {
    const section = DOMBuilder.createSection('traffic', status, config);

    entries.forEach((info) => {
      if (info.lineStatus === 'normal' && config.traffic.hideWhenNormal) {
        return;
      }

      const card = DOMBuilder.createCard(
        DOMBuilder.createLine(info.lineType, info.lineName, info.lineStatus),
        {
          title: info.title,
          content: info.message
        }
      );

      section.appendChild(card);
    });

    if (section.children.length === 1) {
      section.appendChild(DOMBuilder.createCard(null, { content: 'Trafic normal sur l\'ensemble des lignes spécifiées' }));
    }

    return section;
  }

  /**
   * @static createSection - Create a section element
   *
   * @param {String} type   The type of content that will be in the section
   * @param {Object} status Additional information about the content
   * @param {Object} config The module configuration
   *
   * @returns {HTMLElement} The newly created section
   */
  static createSection (type, status, config) {
    const element = document.createElement('div');

    element.className = `MMM-RATP__section MMM-RATP__${type}`;
    element.innerHTML = `<h3 class="MMM-RATP__section__title">${config[type].title}</h3>`;

    if (status.isUpdating && config.showUpdateAnimation) {
      const spinner = document.createElement('span');

      spinner.className = 'MMM-RATP__spinner';
      element.querySelector('.MMM-RATP__section__title').appendChild(spinner);
    }

    return element;
  }

  /**
   * @static createCard - Create a card element
   *
   * @param {HTMLElement} [prepend=null] The element to prepend to the card (a line logo)
   * @param {Object}      [text=null]    The text to put in the middle of the card
   * @param {String}      text.title       The title of the card
   * @param {String}      text.subtitle    The subtitle of the card
   * @param {String}      text.content     The content of the card
   * @param {HTMLElement} [append=null]  The element to append to the card (a timetable for example)
   *
   * @returns {HTMLElement} The newly created card
   */
  static createCard (prepend = null, text = null, append = null) {
    const element = document.createElement('div');
    element.className = 'MMM-RATP__card';

    if (prepend) {
      prepend.classList.add('MMM-RATP__card__prepend');
      element.appendChild(prepend);
    }

    if (text) {
      const textElement = document.createElement('div');

      textElement.className = 'MMM-RATP__card__text';
      textElement.innerHTML = `
        ${(text.title)    ? `<h4 class="MMM-RATP__card__text__title">${text.title}</h4>` : ''}
        ${(text.subtitle) ? `<h5 class="MMM-RATP__card__text__subtitle">${text.subtitle}</h5>` : ''}
        ${(text.content)  ? `<p class="MMM-RATP__card__text__content">${text.content}</p>` : ''}
      `;

      element.appendChild(textElement);
    }

    if (append) {
      append.classList.add('MMM-RATP__card__append');
      element.appendChild(append);
    }

    return element;
  }

  /**
   * @static createLine - Create a line element
   *
   * @param {String} type          The type of the line (metro, tramway, ...)
   * @param {String} name          The name of the line (1, A, 3b, ...)
   * @param {String} [status=null] The current traffic status on the line
   *
   * @returns {HTMLElement} The newly created line
   */
  static createLine (type, name, status = null) {
    const element = document.createElement('div');

    element.className = `MMM-RATP__line MMM-RATP__line--${type}`;
    element.innerHTML = name;
    element.setAttribute('data-line', name.toLowerCase());

    if (status) {
      element.classList.add('MMM-RATP__line--badge');
      element.classList.add(`MMM-RATP__line--badge-${status}`);
    }

    return element;
  }

  /**
   * @static createTimetable - Create a timetable element
   *
   * @param {Object[]} timetable    The timetable data
   * @param {Boolean}  isEstimation Whether the times in the timetable are an estimation or not
   *
   * @returns {HTMLElement} The newly created timetable
   */
  static createTimetable (timetable, isEstimation) {
    const element = document.createElement('div');
    element.className = 'MMM-RATP__timer-container';

    timetable.forEach((timetableEntry) => {
      const timer = DOMBuilder.createTimer(
        timetableEntry.waitingTime,
        isEstimation
      );

      element.appendChild(timer);
    });

    return element;
  }

  /**
   * @static createTimer - Create a timer element
   *
   * @param {String}  time         The timer's content
   * @param {Boolean} isEstimation Whether the given time is an estimation or not
   *
   * @returns {HTMLElement} The newly created timer
   */
  static createTimer (time, isEstimation) {
    const element = document.createElement('div');

    element.className = 'MMM-RATP__timer';
    element.innerHTML = time || '?';

    if (time === '0') element.classList.add('MMM-RATP__timer--incoming');
    if (isEstimation) element.innerHTML += '*';

    return element;
  }
}
