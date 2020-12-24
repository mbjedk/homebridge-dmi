# Homebridge DMI

This plugin for [Homebridge](https://github.com/nfarina/homebridge) adds meteorological observation, e.g. wind, temperature, and precipitation data, from DMI owned stations located in Denmark and Greenland and exposes them as a thermometer / hygrometer. This plugin is not affiliated with DMI and is for testing-purposes only.

## Requirements:

API-key for DMI metObs - [Instructions](https://confluence.govcloud.dk/pages/viewpage.action?pageId=26476690#UserCreation&AccessManagement-Gettingstartedguide:)

Stationid(s): See list of stations here (NB: Swap INSERTAPIKEY with your own API-key): [https://dmigw.govcloud.dk/metObs/v1/station?type=Synop&api-key=INSERTAPIKEYHERE](https://dmigw.govcloud.dk/metObs/v1/station?type=Synop&api-key=INSERTAPIKEYHERE)

## Configuration

Example config with one station:
```json
{
"platforms": [
  {
      "platform" : "DmiPlatform",
      "apikey" : "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxx",
      "stations": [
        {
          "stationid": "06186",
          "stationname": "Landbohøjskolen"
        }
      ]
    }
]
}
```