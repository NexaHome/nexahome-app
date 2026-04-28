import { registerEnumType } from '@nestjs/graphql';

export enum AutomationTriggerType {
  Delay = 'delay',
  Schedule = 'schedule',
}

export enum AutomationCommand {
  AllDevicesOn = 'allDevicesOn',
  AllDevicesOff = 'allDevicesOff',
  SetAwayMode = 'setAwayMode',
}

registerEnumType(AutomationTriggerType, {
  name: 'AutomationTriggerType',
});

registerEnumType(AutomationCommand, {
  name: 'AutomationCommand',
});