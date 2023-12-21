import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as PagesHomeActions from './pages-home.actions';
import * as PagesHomeSelectors from './pages-home.selectors';
import { map } from 'rxjs';

@Injectable()
export class PagesHomeFacade {
  private readonly store = inject(Store);

  loading$ = this.store.select(PagesHomeSelectors.selectPagesHomeLoading);
  loaded$ = this.store.select(PagesHomeSelectors.selectPagesHomeLoaded);
  pagesHomeData$ = this.store.select(PagesHomeSelectors.selectPagesHomeData);
  pagesHomeTableData$ = this.pagesHomeData$.pipe(
    map((pagesHomeData) => [...(pagesHomeData?.dateRangeData || [])]),
  );
  projects$ = this.pagesHomeData$.pipe(
    map((pagesHomeData) => pagesHomeData?.projectList || [])
  );
  tasks$ = this.pagesHomeData$.pipe(
    map((pagesHomeData) => pagesHomeData?.taskList || [])
  );
  error$ = this.store.select(PagesHomeSelectors.selectPagesHomeError);

  fetchData() {
    this.store.dispatch(PagesHomeActions.loadPagesHomeInit());
  }
}
