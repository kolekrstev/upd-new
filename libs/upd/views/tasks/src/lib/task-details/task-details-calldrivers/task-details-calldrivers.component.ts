import { Component, inject, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { I18nFacade } from '@dua-upd/upd/state';
import type { ColumnConfig } from '@dua-upd/upd-components';
import { TasksDetailsFacade } from '../+state/tasks-details.facade';

@Component({
  selector: 'upd-task-details-calldrivers',
  templateUrl: './task-details-calldrivers.component.html',
  styleUrls: ['./task-details-calldrivers.component.css'],
})
export class TaskDetailsCalldriversComponent implements OnInit {
  private i18n = inject(I18nFacade);
  private readonly taskDetailsService = inject(TasksDetailsFacade);

  currentLang$ = this.i18n.currentLang$;

  calldriversTable$ = this.taskDetailsService.calldriversTable$;
  calldriversCols: ColumnConfig[] = [];

  callsByTopic$ = this.taskDetailsService.callsByTopic$;
  callsByTopicConfig$ = this.taskDetailsService.callsByTopicConfig$;

  dateRangeLabel$ = this.taskDetailsService.dateRangeLabel$;
  comparisonDateRangeLabel$ = this.taskDetailsService.comparisonDateRangeLabel$;

  apexCalldriversChart$ = this.taskDetailsService.apexCalldriversChart$;

  dateRange = '';
  comparisonDateRange = '';

  ngOnInit() {
    combineLatest([
      this.currentLang$,
      this.dateRangeLabel$,
      this.comparisonDateRangeLabel$,
    ]).subscribe(([lang, dateRange, comparisonDateRange]) => {
      this.calldriversCols = [
        {
          field: 'name',
          header: this.i18n.service.translate('Inquiry line', lang),
        },
        {
          field: 'currValue',
          header: dateRange,
          pipe: 'number',
        },
        {
          field: 'prevValue',
          header: comparisonDateRange,
          pipe: 'number',
        },
      ];
    });
  }
}
