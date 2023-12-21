import { inject, Injectable } from '@angular/core';
import { createEffect, Actions, ofType, concatLatestFrom } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, mergeMap, map, of } from 'rxjs';
import { selectDatePeriod, selectDateRanges } from '@dua-upd/upd/state';
import { ApiService } from '@dua-upd/upd/services';
import * as TasksHomeActions from './tasks-home.actions';

@Injectable()
export class TasksHomeEffects {
  private readonly actions$ = inject(Actions);
  private store = inject(Store);
  private api = inject(ApiService);

  init$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(TasksHomeActions.loadTasksHomeInit),
      concatLatestFrom(() => this.store.select(selectDateRanges)),
      mergeMap(([, { dateRange, comparisonDateRange }]) =>
        this.api.getTasksHomeData({ dateRange, comparisonDateRange }).pipe(
          map((data) => TasksHomeActions.loadTasksHomeSuccess({ data })),
          catchError(() => EMPTY),
        ),
      ),
    );
  });

  dateChange$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(selectDatePeriod),
      mergeMap(() => of(TasksHomeActions.loadTasksHomeInit())),
    );
  });
}
