import { FormSyncPayload, FormSyncType } from 'src/lib/formsync';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class FormSync {
  @PrimaryColumn({
    // generated: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  id: string;

  @Column({
    nullable: false,
  })
  dataSourceId: string;

  @Column({
    nullable: false,
  })
  type: FormSyncType;

  @Column({
    nullable: false,
    type: 'json',
  })
  payload: FormSyncPayload;

  @Column({
    nullable: true,
    type: 'timestamp',
  })
  createdAt: Date;
}

@Entity()
export class DelayedFormSync {
  @PrimaryColumn({
    // generated: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  formSyncId: string;

  @OneToOne(() => FormSync, {
    cascade: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'formSyncId' })
  formsync: FormSync;
}
