import { Field, InputType, Int } from '@nestjs/graphql';
import { AutomationTriggerType } from './automation.enums';

@InputType()
export class AutomationTriggerInput {
  @Field(() => AutomationTriggerType, {
    description: 'Jenis trigger automation: delay atau schedule.',
  })
  type!: AutomationTriggerType;

  @Field(() => Int, {
    nullable: true,
    description: 'Delay dalam milidetik. Wajib untuk trigger type delay.',
  })
  delayMs?: number;

  @Field({
    nullable: true,
    description: 'Waktu eksekusi ISO string. Wajib untuk trigger type schedule.',
  })
  runAt?: string;

  @Field({
    nullable: true,
    description: 'Tanggal berakhir automation (ISO string).',
  })
  endDate?: string;

  @Field({
    nullable: true,
    description: 'Waktu berakhir automation (HH:mm).',
  })
  endTime?: string;

  @Field({
    nullable: true,
    description: 'Apakah automation akan diulang.',
  })
  repeat?: boolean;

  @Field(() => [Int], {
    nullable: true,
    description: 'Hari pengulangan (0-6, 0=Minggu).',
  })
  days?: number[];

  @Field({
    nullable: true,
    description: 'ID perangkat sensor yang menjadi pemicu.',
  })
  sensorId?: string;

  @Field({
    nullable: true,
    description: 'Operator perbandingan (gt, lt, eq).',
  })
  operator?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Nilai ambang batas sensor.',
  })
  value?: number;
}
