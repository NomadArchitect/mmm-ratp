# MMM-RATP

MMM-RATP is a MagicMirror² module that allows you to get waiting times for specific stations, alongside traffic information for the lines you want. This project is not linked to the RATP company, I made it for my own needs and wanted to share it.

It uses the gorgeous [RATP API](https://api-ratp.pierre-grimaud.fr/v4/) from Pierre Grimaud internally, you'll need to check it out to find the identifiers of your stations.

This module comes with two bundled themes, depending on what you use MagicMirror² on. I personally use it as a home dashboard on a real screen!

![](https://i.postimg.cc/D0w0d7kB/mmm-ratp.png)

## Installation

There is only one dependency for this module which is [phin](https://www.npmjs.com/package/phin), an "ultra-lightweight Node.js HTTP client".

```sh
$ cd ~/MagicMirror/modules
$ git clone https://gitlab.com/closingin/MMM-RATP
$ cd MMM-RATP
$ npm i
```

## Usage

```
{
    module: 'MMM-RATP',
    position: 'bottom_right',
    config: {
        theme: 'dashboard',
        timetables: {
            config: [
                { type: 'metro', line: '14', station: 'pyramides', direction: 'A' },
            ]
        },
        traffic: {
            config: [
                { type: 'metro', line: '14' }
            ]
        }
    }
}
```

## Configuration options

### General options

| Property     | Description |
| ------------ | ----------- |
| `theme`      | String. The theme to use on the module (see screenshot above).<br><br>**Possible values:** `mirror`, `dashboard`<br>**Default value:** `mirror` |
| `timetables` | Object. The configuration options for your timetables, see [section](https://gitlab.com/closingin/mmm-ratp#timetables-configuration) below. |
| `traffic`      | Object. The configuration options for your traffic, see [section](https://gitlab.com/closingin/mmm-ratp#traffic-information-configuration) below. |

#### Timetables configuration

The `timetables` option allows you to define the configuration of the timetables you want to display on your screen, it's an object that can contain the options below. Only `config` is mandatory.

| Property           | Description |
| ------------------ | ----------- |
| `title`            | String. The title to display above the timetables section.<br><br>**Default value:** `'Prochains passages'` |
| `updateInterval`   | Number. The time to wait between each timetables refresh, in milliseconds.<br><br>**Default value:** `1 * 60 * 1000` (1 minute) |
| `nextPassesAmount` | Number. The maximum amount of upcoming passes to display (you might actually see less than the amount you ask, it depends on the data that the API provides for your line).<br><br>**Possible values:** `1`, `2`, `3`, or `4`<br>**Default value:** `2` |
| `config`            | Array\<Object>. The definition of the timetables you want. Look at the example usage above to understand how it works. A reference will be available below.<br><br>**Required properties for each object:** `type`, `line`, `station`, `direction` |

#### Traffic information configuration

The `traffic` option allows you to define the configuration of the traffic information you want to display on your screen, it's an object that can contain the options below. Only `config` is mandatory.

| Property | Description |
| ------ | ------ |
| `title` | String. The title to display above the traffic information section.<br><br>**Default value:** `'Infos trafic'` |
| `updateInterval` | Number. The time to wait between each traffic information refresh, in milliseconds.<br><br>**Default value:** `10 * 60 * 1000` (10 minutes) |
| `hideWhenNormal` | Boolean. Whether to hide traffic information for lines that are running normally. A dedicated message will be displayed if all of your lines are running normally.<br><br>**Possible values:** `true` or `false`<br>**Default value:** `false` |
| `config` | Array\<Object>. The definition of the timetables you want. Look at the example usage above to understand how it works. A reference will be available below.<br><br>**Required properties for each object:** `type`, `line` |

### Reference for the timetables and traffic information `config` object

| Property    | Description |
| ----------- | ----------- |
| `type`      | String. The line type.<br><br>**Possible values:** `'metro'`, `'rer'`, `'tramway'`<br><br>Technically the API also supports buses and noctiliens, but this module is not yet ready for it. Soon. |
| `line`      | String. The line identifier.<br><br>**Examples:** `'2'` (metro), `'3b'`(tramway), `'B'` (rer) |
| `station`   | String. The station slug, you have to get it directly from [Pierre's API](https://api-ratp.pierre-grimaud.fr/v4). Here's an example URL that will give you the list of stations for Metro 9 : [https://api-ratp.pierre-grimaud.fr/v4/stations/metros/9](https://api-ratp.pierre-grimaud.fr/v4/stations/metros/9)<br><br>**Examples:** `'place+de+clichy'`, `'porte+de+clichy+++tribunal+de+paris'` |
| `direction` | String. For which direction you want to get the next passes.<br><br>**Possible values:** `'A'`, `'R'` (it stands for Aller / Retour) |

## Troubleshooting

I created this module using `nodejs@14.5.0` (MagicMirror² requires `nodejs@10`), so don't hesitate to open an issue if you have problems setting up this module.