import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
  ColumnConfig,
  callVolumeObjectiveCriteria,
  feedbackKpiObjectiveCriteria,
} from '@dua-upd/upd-components';
import { LocaleId, EN_CA } from '@dua-upd/upd/i18n';
import { I18nFacade } from '@dua-upd/upd/state';
import { GetTableProps } from '@dua-upd/utils-common';
import { combineLatest, Observable, of } from 'rxjs';
import { ProjectsDetailsFacade } from '../+state/projects-details.facade';

type ParticipantTasksColTypes = GetTableProps<
  ProjectDetailsSummaryComponent,
  'participantTasks$'
>;
type DyfTableColTypes = GetTableProps<
  ProjectDetailsSummaryComponent,
  'dyfChart$'
>;
type WhatWasWrongColTypes = GetTableProps<
  ProjectDetailsSummaryComponent,
  'whatWasWrongChart$'
>;

type DocumentsColTypes = GetTableProps<
  ProjectDetailsSummaryComponent,
  'documents$'
>;

@Component({
  selector: 'upd-project-details-summary',
  templateUrl: './project-details-summary.component.html',
  styleUrls: ['./project-details-summary.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailsSummaryComponent implements OnInit {
  currentLang!: LocaleId;
  currentLang$ = this.i18n.currentLang$;
  langLink = 'en';

  feedbackKpiObjectiveCriteria = feedbackKpiObjectiveCriteria;

  apexCallDrivers$ = this.projectsDetailsService.apexCallDrivers$;
  apexKpiFeedback$ = this.projectsDetailsService.apexKpiFeedback$;

  documents$ = this.projectsDetailsService.documents$;
  documentsCols: ColumnConfig<DocumentsColTypes>[] = [];

  callPerVisits$ = this.projectsDetailsService.callPerVisits$;
  apexCallPercentChange$ = this.projectsDetailsService.apexCallPercentChange$;
  apexCallDifference$ = this.projectsDetailsService.apexCallDifference$;

  currentKpiFeedback$ = this.projectsDetailsService.currentKpiFeedback$;
  kpiFeedbackPercentChange$ =
    this.projectsDetailsService.kpiFeedbackPercentChange$;
  kpiFeedbackDifference$ = this.projectsDetailsService.kpiFeedbackDifference$;

  avgTaskSuccessFromLastTest$ =
    this.projectsDetailsService.avgTaskSuccessFromLastTest$;
  avgSuccessPercentChange$ =
    this.projectsDetailsService.avgSuccessPercentChange$;
  dateFromLastTest$ = this.projectsDetailsService.dateFromLastTest$;
  taskSuccessByUxTest$ = this.projectsDetailsService.taskSuccessByUxTest$;

  visits$ = this.projectsDetailsService.visits$;
  visitsPercentChange$ = this.projectsDetailsService.visitsPercentChange$;

  participantTasks$ = this.projectsDetailsService.projectTasks$;

  dyfChart$ = this.projectsDetailsService.dyfData$;
  whatWasWrongChart$ = this.projectsDetailsService.whatWasWrongData$;

  dyfChartApex$ = this.projectsDetailsService.dyfDataApex$;
  dyfChartLegend: string[] = [];

  whatWasWrongChartLegend: string[] = [];
  whatWasWrongChartApex$ = this.projectsDetailsService.whatWasWrongDataApex$;

  totalCalldriver$ = this.projectsDetailsService.totalCalldriver$;
  totalCalldriverPercentChange$ =
    this.projectsDetailsService.totalCalldriverPercentChange$;

  callVolumeObjectiveCriteria = callVolumeObjectiveCriteria;
  callVolumeKpiConfig = {
    pass: { message: 'kpi-met-volume' },
    fail: { message: 'kpi-not-met-volume' },
  };

  memberList$ = this.projectsDetailsService.members$;
  memberListCols: ColumnConfig[] = [];

  description$ = this.projectsDetailsService.description$;

  startDate$ = this.projectsDetailsService.startDate$;
  launchDate$ = this.projectsDetailsService.launchDate$;

  constructor(
    private readonly projectsDetailsService: ProjectsDetailsFacade,
    private i18n: I18nFacade
  ) {}

  participantTasksCols: ColumnConfig<ParticipantTasksColTypes>[] = [];
  dyfTableCols: ColumnConfig<DyfTableColTypes>[] = [];
  whatWasWrongTableCols: ColumnConfig<WhatWasWrongColTypes>[] = [];

  ngOnInit(): void {
    this.i18n.service.onLangChange(({ lang }) => {
      this.currentLang = lang as LocaleId;
    });

    this.currentLang$.subscribe((lang) => {
      this.langLink = lang === EN_CA ? 'en' : 'fr';

      this.documentsCols = [
        {
          field: 'filename',
          header: this.i18n.service.translate('Documents', lang),
          type: 'link',
          typeParams: { link: 'url', external: true },
        },
      ];

      this.dyfChartLegend = [
        this.i18n.service.translate('yes', lang),
        this.i18n.service.translate('no', lang),
      ];

      this.whatWasWrongChartLegend = [
        this.i18n.service.translate('d3-cant-find-info', lang),
        this.i18n.service.translate('d3-other', lang),
        this.i18n.service.translate('d3-hard-to-understand', lang),
        this.i18n.service.translate('d3-error', lang),
      ];

      this.participantTasksCols = [
        {
          field: 'title',
          header: this.i18n.service.translate('Task list', lang),
          type: 'link',
          typeParams: { preLink: '/' + this.langLink + '/tasks', link: '_id' },
        },
        // {
        //   field: 'calls',
        //   header: this.i18n.service.translate('Calls / 100 Visits', lang),
        //   pipe: 'number',
        // },
        // {
        //   field: 'dyfNo',
        //   header: this.i18n.service.translate(
        //     '"No clicks" / 1,000 Visits',
        //     lang
        //   ),
        //   pipe: 'number',
        // },
        // {
        //   field: 'uxTest2Years',
        //   header: this.i18n.service.translate('UX Test in Past 2 Years?', lang),
        // },
        // {
        //   field: 'successRate',
        //   header: this.i18n.service.translate(
        //     'Latest UX Task Success Rate',
        //     lang
        //   ),
        //   pipe: 'percent',
        // },
      ];
      this.dyfTableCols = [
        {
          field: 'name',
          header: this.i18n.service.translate('Selection', lang),
        },
        {
          field: 'value',
          header: this.i18n.service.translate('visits', lang),
          pipe: 'number',
        },
      ];
      this.whatWasWrongTableCols = [
        { field: 'name', header: this.i18n.service.translate('d3-www', lang) },
        {
          field: 'value',
          header: this.i18n.service.translate('visits', lang),
          pipe: 'number',
        },
      ];
    });

    combineLatest([this.currentLang$]).subscribe(([lang]) => {
      this.memberListCols = [
        {
          field: 'name',
          header: this.i18n.service.translate('Name', lang),
        },
        {
          field: 'role',
          header: this.i18n.service.translate('Role', lang),
        },
      ];
    });
  }
}
