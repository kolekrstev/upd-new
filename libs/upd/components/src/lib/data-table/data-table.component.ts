import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  EventEmitter,
  Output,
} from '@angular/core';
import { Table } from 'primeng/table';
import { equals } from 'rambdax';
import type { ColumnConfig } from '../data-table-styles/types';
import { SelectedNode } from '../filter-table/filter-table.component';

@Component({
  selector: 'upd-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css'],
})
export class DataTableComponent<T> implements OnInit, OnChanges {
  @ViewChild('dt') table!: Table;
  @Input() data: T[] | null = [];
  @Input() displayRows = 10;
  @Input() sort = true;
  @Input() pagination = true;
  @Input() filter = true;
  @Input() filterTree = false;
  @Input() cols: ColumnConfig[] = [];
  @Input() searchFields: string[] = [];
  @Input() captionTitle = '';
  @Input() loading = false;
  @Input() sortField = '';
  @Input() sortOrder: 'asc' | 'desc' = 'asc';
  @Input() kpi = false;
  @Input() exports = true;
  @Input() checkboxes = false;
  @Input() id?: string;
  @Input() placeholderText = 'dt_search_keyword';
  @Input() selectedNodes: SelectedNode[] = [];
  @Input() node: SelectedNode | null = null;
  exportCols: ColumnConfig[] = [];
  @Output() pageSelectionChanged = new EventEmitter<any[]>();

  ngOnInit() {
    this.exportCols = this.cols.filter((col) => !col.hideTable);
  }

  ngOnChanges(changes: SimpleChanges) {
    const colChanges = changes['cols'];

    if (!colChanges?.previousValue || colChanges.previousValue.length === 0) {
      return;
    }

    const prevHeaders = colChanges.previousValue.map(
      (col: ColumnConfig) => col.header,
    );
    const currentHeaders = colChanges.currentValue.map(
      (col: ColumnConfig) => col.header,
    );

    if (!equals(prevHeaders, currentHeaders)) {
      this.table?._filter();
      this.table?.clearState();
    }
  }

  get defaultSearchFields() {
    return this.cols.map((obj) => obj.field);
  }

  selectedPages: any[] = [];

  onSelectionChange(value = []) {
    this.selectedPages = value;
    this.pageSelectionChanged.emit(value);
  }

  clearSelections() {
    this.selectedPages = [];
    this.pageSelectionChanged.emit(this.selectedPages);
  }

  getEventValue(event: Event): string {
    return (event.target as HTMLInputElement).value.replace(
      /^.+?(?=www\.)/i,
      '',
    );
  }

  updateSelectedNodes(nodes: SelectedNode[]) {
    this.selectedNodes = nodes;
  }

  removeNode(node: SelectedNode) {
    this.node = node;
  }
}
