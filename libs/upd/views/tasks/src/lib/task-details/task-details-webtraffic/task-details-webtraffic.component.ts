import { Component, inject, OnInit } from '@angular/core';
import type { ColumnConfig } from '@dua-upd/upd-components';
import { I18nFacade } from '@dua-upd/upd/state';
import { TasksDetailsFacade } from '../+state/tasks-details.facade';
import { EN_CA } from '@dua-upd/upd/i18n';
import { combineLatest } from 'rxjs';
import { createCategoryConfig } from '@dua-upd/upd/utils';

@Component({
  selector: 'upd-task-details-webtraffic',
  templateUrl: './task-details-webtraffic.component.html',
  styleUrls: ['./task-details-webtraffic.component.css'],
})
export class TaskDetailsWebtrafficComponent implements OnInit {
  private i18n = inject(I18nFacade);
  private readonly taskDetailsService = inject(TasksDetailsFacade);

  langLink = 'en';

  visitsByPage$ = this.taskDetailsService.visitsByPageWithPercentChange$;

  visits$ = this.taskDetailsService.visits$;
  visitsPercentChange$ = this.taskDetailsService.visitsPercentChange$;

  visitsByPageCols: ColumnConfig[] = [];

  ngOnInit(): void {
    combineLatest([this.visitsByPage$, this.i18n.currentLang$]).subscribe(
      ([data, lang]) => {
        this.langLink = lang === EN_CA ? 'en' : 'fr';
        this.visitsByPageCols = [
          {
            field: 'title',
            header: this.i18n.service.translate('page-title', lang),
            type: 'link',
            typeParams: {
              preLink: '/' + this.langLink + '/pages',
              link: '_id',
            },
          },
          {
            field: 'language',
            header: this.i18n.service.translate('Search term language', lang),
            filterConfig: {
              type: 'category',
              categories: createCategoryConfig({
                i18n: this.i18n.service,
                data,
                field: 'language',
              }),
            },
          },
          {
            field: 'url',
            header: this.i18n.service.translate('URL', lang),
            type: 'link',
            typeParams: { link: 'url', external: true },
          },
          {
            field: 'visits',
            header: this.i18n.service.translate('visits', lang),
            pipe: 'number',
          },
          {
            field: 'percentChange',
            header: this.i18n.service.translate('%-change', lang),
            pipe: 'percent',
            type: 'comparison',
          },
        ];
      },
    );
  }
}
