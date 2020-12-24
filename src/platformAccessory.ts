import { Service, PlatformAccessory, CharacteristicGetCallback } from 'homebridge';
import { DmiHomebridgePlatform } from './platform';
import fetch from 'node-fetch';

/**
 * DMI Parameters
 * https://confluence.govcloud.dk/pages/viewpage.action?pageId=26476616
 */
type DmiMetObsParameters = 'temp_dry' | 'temp_dew' | 'temp_mean_past1h' | 'temp_max_past1h' |
 'temp_min_past1h' | 'temp_max_past12h' | 'temp_min_past12h' | 'temp_grass' | 'temp_grass_max_past1h' | 
 'temp_grass_mean_past1h' | 'temp_grass_min_past1h' | 'temp_soil' | 'temp_soil_max_past1h' |
 'temp_soil_mean_past1h' | 'temp_soil_min_past1h' | 'humidity' | 'humidity_past1h' | 'pressure' |
 'pressure_at_sea' | 'wind_dir' | 'wind_dir_past1h' | 'wind_speed' | 'wind_speed_past1h' |
 'wind_gust_always_past1h' | 'wind_max' | 'wind_min_past1h' | 'wind_min' | 'wind_max_per10min_past1h' |
 'precip_past1h' | 'precip_past10min' | 'precip_past1min' | 'precip_past24h*' | 'precip_dur_past10min' |
 'precip_dur_past1h' | 'snow_depth_man' | 'snow_cover_man' | 'visibility' | 'visib_mean_last10min' |
 'cloud_cover' | 'cloud_height' | 'weather' | 'radia_glob' | 'radia_glob_past1h' | 'sun_last10min_glob' |
 'sun_last1h_glob' | 'leav_hum_dur_past10min' | 'leav_hum_dur_past1h';

 interface DmiMetObsResponse {
    '_id': string;
    'parameterId': DmiMetObsParameters;
    'stationId': string;
    'timeCreated': number;
    'timeObserved': number;
    'value': number;
 }

export class DmiPlatformAccessory {
  private apiurl = 'https://dmigw.govcloud.dk/metObs/v1/observation';
  private temperatureSensor: Service;
  private humiditySensor: Service;

  private weatherState = {};

  constructor(
    private readonly platform: DmiHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly stationid: number,
    private readonly stationname: string,
  ) {

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Homebridge DMI')
      .setCharacteristic(this.platform.Characteristic.Model, 'Weather-plugin')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '4A-33-A2-7F-B2-BA')
      .setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.DisplayName);
    

    // Temperature Sensor service
    this.temperatureSensor = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
     this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.temperatureSensor.setCharacteristic(this.platform.Characteristic.Name, `Temperatur - ${this.accessory.displayName}`);

    this.updateMetObs('temp_dry').then(() => {
      this.platform.log.info('Fetched initial temp_dry value, adding getCharacteristic');
      this.temperatureSensor.getCharacteristic(this.platform.Characteristic.CurrentTemperature).setProps({
        minValue: -100,
        maxValue: 100,
      }).on('get', this.handleCurrentParameter.bind(this, 'temp_dry'));
    });
    

    // Humidity Sensor service
    this.humiditySensor = this.accessory.getService(this.platform.Service.HumiditySensor) ||
          this.accessory.addService(this.platform.Service.HumiditySensor);

    this.humiditySensor.setCharacteristic(this.platform.Characteristic.Name, `Fugtighed - ${this.accessory.displayName}`);
    // Fetch initial
    this.updateMetObs('humidity').then(() => {
      this.platform.log.info('Fetched initial humidity value, adding getCharacteristic');
      this.humiditySensor.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .on('get', this.handleCurrentParameter.bind(this, 'humidity'));
    });

    // Update observations every 10 minute
    setInterval(() => {
      this.updateMetObs('humidity');
      this.updateMetObs('temp_dry');
    }, 600000); // DMI only updates data every 10 minutes - avoid hammering
  }

  /**
   * Returns latest observation for a specific parameter
   * @param parameter DmiMetObsResponse
   */
  async updateMetObs(parameter: DmiMetObsParameters): Promise<void | DmiMetObsResponse> {
    return fetch(`${this.apiurl}?latest=&parameterId=${parameter}&stationId=${this.stationid}&api-key=${this.platform.config.apikey}`)
      .then(res => res.json())
      .then((res: DmiMetObsResponse[]) => {
        if (!res.length || !('value' in res[0])) {
          throw new Error('Value does not exist in response. Check stationid and api-key.');
        } else {
          this.weatherState[parameter] = res[0].value;
          this.platform.log.info(`Successfully updated '${parameter}' using stationid: ${this.stationid}`);
          return res[0];
        }
      }).catch(e => {
        this.platform.log.error('Error fetching from DMI MetObs API', e);
      });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the sensors
   */
  handleCurrentParameter(parameter: DmiMetObsParameters, callback: CharacteristicGetCallback) {
    let error: Error | null = null;
    let value = null;
    if (parameter in this.weatherState) {
      value = this.weatherState[parameter];
    } else {
      error = new Error(`Cannot fetch parameter: ${parameter}`);
    }
    callback(error, value);
  }
}
