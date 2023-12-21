import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'upd-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
})
export class CheckboxComponent {
  @Input() showSelectAll = false;
  @Input() items: any[] = [];
  @Input() selectAllText = '';
  @Input() id?: string;

  private _selectedItems: string[] = [];
  @Input() set selectedItems(value: string[]) {
    this._selectedItems = value;
    this.updateSelectionState();
  }
  get selectedItems(): string[] {
    return this._selectedItems;
  }

  @Output() selectedItemsChange = new EventEmitter<string[]>();

  allSelected = false;
  isIndeterminate = false;

  toggleSelectAll() {
    if (this.isIndeterminate || !this.allSelected) {
      this.selectAll();
    } else {
      this.deselectAll();
    }
    this.isIndeterminate = false;
    this.selectedItemsChange.emit(this.selectedItems);
  }

  selectAll() {
    this.selectedItems = this.items.map((item) => item.id);
    this.allSelected = true;
  }

  deselectAll() {
    this.selectedItems = [];
    this.allSelected = false;
  }

  updateIndividualSelection() {
    this.updateSelectionState();
    this.selectedItemsChange.emit(this.selectedItems);
  }

  updateSelectionState() {
    const totalItems = this.items.length;
    const selectedCount = this.selectedItems.length;

    if (selectedCount === 0) {
      this.allSelected = false;
      this.isIndeterminate = false;
    } else if (selectedCount === totalItems) {
      this.allSelected = true;
      this.isIndeterminate = false;
    } else {
      this.allSelected = false;
      this.isIndeterminate = true;
    }
  }
}
