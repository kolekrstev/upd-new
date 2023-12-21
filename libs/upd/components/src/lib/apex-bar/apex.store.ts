import { inject, Injectable } from '@angular/core';
import { formatPercent } from '@angular/common';
import { ComponentStore } from '@ngrx/component-store';
import { I18nFacade } from '@dua-upd/upd/state';
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexOptions,
  ApexYAxis,
} from 'ng-apexcharts';
import { mergeDeepRight } from 'rambdax';
import { EN_CA } from '@dua-upd/upd/i18n';
import { sum } from '@dua-upd/utils-common';
import { createBaseConfig } from '../apex-base/apex.config.base';

export interface ChartOptions extends ApexOptions {
  chart: ApexChart;
  yaxis?: ApexYAxis;
  added?: {
    type?: string;
    isPercent?: boolean;
  };
}

@Injectable()
export class ApexStore extends ComponentStore<ChartOptions> {
  private i18n: I18nFacade = inject(I18nFacade);

  constructor() {
    super({
      ...createBaseConfig((val: number) =>
        val.toLocaleString(this.i18n.service.currentLang, {
          maximumFractionDigits: 0,
        }),
      ),
      added: {
        isPercent: false,
      },
    } as ChartOptions);
  }

  readonly setColours = this.updater(
    (state, value: string[]): ChartOptions => ({
      ...state,
      colors: value ? value : [],
    }),
  );

  readonly setSeries = this.updater(
    (state, value: ApexAxisChartSeries): ChartOptions => {
      if (value[0]?.data?.length > 31) {
        return {
          ...state,
          chart: {
            ...state.chart,
            type: 'line',
          },
          series: value ? value : [],
          stroke: { width: [3, 3, 3, 3], curve: 'smooth' },
          fill: {
            opacity: [1, 0.8],
          },
        };
      }
      return {
        ...state,
        chart: {
          ...state.chart,
          type: 'bar',
        },
        series: value ? value : [],
        fill: {
          opacity: 1,
        },
      };
    },
  );

  readonly setHorizontal = this.updater(
    (
      state,
      value: { isHorizontal: boolean; colorDistributed: boolean },
    ): ChartOptions => {
      return {
        ...state,
        plotOptions: {
          ...state.plotOptions,
          bar: {
            ...state.plotOptions?.bar,
            distributed: value?.colorDistributed,
            horizontal: value?.isHorizontal,
          },
        },
      };
    },
  );

  readonly setXAxis = this.updater(
    (state, value: string[]): ChartOptions =>
      mergeDeepRight(state, {
        xaxis: {
          type: 'category',
          categories: value,
        },
      }),
  );

  readonly setYAxis = this.updater(
    (state, value: string): ChartOptions =>
      mergeDeepRight(state, {
        yaxis: {
          title: {
            text: value,
          },
        },
      }),
  );

  readonly setAnnotations = this.updater(
    (state, values: { x: Date; text: string }[]): ChartOptions => ({
      ...state,
      annotations: {
        points: values.map(({ x, text }) => ({
          x: x.getTime(),
          y: 15,
          marker: {
            size: 8,
          },
          label: {
            borderColor: '#FF4560',
            text,
          },
        })),
      },
    }),
  );

  readonly showPercent = this.updater(
    (
      state,
      value: {
        isPercent: boolean;
        showTitleTooltip: boolean;
        showMarker: boolean;
        shared: boolean;
      },
    ): ChartOptions => {
      if (value?.isPercent) {
        let titleTooltip = (seriesName: string) => {
          return seriesName;
        };

        if (!value?.showTitleTooltip) {
          titleTooltip = () => {
            return '';
          };
        }

        return {
          ...state,
          yaxis: {
            ...state.yaxis,
            min: 0,
            max: 1,
            tickAmount: 0,
            title: {
              ...state?.yaxis?.title,
              offsetX: 0,
            },
          },
          xaxis: {
            ...state.xaxis,
            tickAmount: 5,

            labels: {
              ...state.xaxis?.labels,
              formatter: (val: string) => {
                return formatPercent(+val, this.i18n.service.currentLang);
              },
            },
          },
          tooltip: {
            ...state.tooltip,
            shared: value?.shared,
            marker: {
              show: value?.showMarker,
            },
            x: {
              show: true,
            },
            y: {
              formatter: (value) => {
                if (value === null || value === undefined) {
                  return '-';
                }
                return `${formatPercent(
                  value,
                  this.i18n.service.currentLang,
                )} ${this.i18n.service.translate(
                  'success rate',
                  this.i18n.service.currentLang,
                )}`;
              },
              title: {
                formatter: titleTooltip,
              },
            },
          },
        };
      }
      return state;
    },
  );

  readonly setLocale = this.updater(
    (state, value: string): ChartOptions => ({
      ...state,
      chart: {
        ...state.chart,
        defaultLocale: value === EN_CA ? 'en' : 'fr',
      } as ApexChart,
    }),
  );

  readonly vm$ = this.select(this.state$, (state) => state);

  readonly hasData$ = this.select(
    this.vm$,
    (state) =>
      sum(
        (
          state?.series
            ?.flat()
            .filter(
              (series) =>
                typeof series === 'object' &&
                'data' in series &&
                series.data.length,
            ) as { data: number[] }[] | { data: { y: number }[] }[]
        ).flatMap((series) => {
          if (typeof series.data[0] === 'number') {
            return series.data as number[];
          }

          return (series.data as { y: number }[]).map((data) => data.y);
        }),
      ) > 0,
  );
}
