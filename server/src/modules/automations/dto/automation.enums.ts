import { registerEnumType } from '@nestjs/graphql';

export enum AutomationTriggerType {
  Delay = 'delay',
  Schedule = 'schedule',
  Sensor = 'sensor',
}

export enum AutomationCommand {
  AllDevicesOn = 'allDevicesOn',
  AllDevicesOff = 'allDevicesOff',
  SetAwayMode = 'setAwayMode',
  ToggleDevices = 'toggleDevices',
}

registerEnumType(AutomationTriggerType, {
  name: 'AutomationTriggerType',
});

registerEnumType(AutomationCommand, {
  name: 'AutomationCommand',
});